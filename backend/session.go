package main

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/pion/webrtc/v3"
)

type RecordingSession struct {
	ID            string
	PeerConnection *webrtc.PeerConnection
	OutputPath    string
	Mutex         sync.RWMutex
	IsRecording   bool
	StartTime     time.Time

	chunkChan   chan []byte
	writerDone  chan struct{}
	file        *os.File
	buffered    *bufio.Writer
}

type SessionManager struct {
	sessions map[string]*RecordingSession
	mutex    sync.RWMutex
	config   *Config
}

func NewSessionManager(config *Config) *SessionManager {
	return &SessionManager{
		sessions: make(map[string]*RecordingSession),
		config:   config,
	}
}

func (sm *SessionManager) CreateSession() (string, error) {
	sm.mutex.Lock()
	defer sm.mutex.Unlock()

	if len(sm.sessions) >= sm.config.Recording.MaxSessions {
		return "", fmt.Errorf("maximum number of sessions reached")
	}

	sessionID := uuid.New().String()
	outputPath := filepath.Join(sm.config.Recording.UploadFolder, fmt.Sprintf("recording_%s.webm", sessionID))

	if err := os.MkdirAll(filepath.Dir(outputPath), 0755); err != nil {
		return "", fmt.Errorf("failed to create output directory: %v", err)
	}

	session := &RecordingSession{
		ID:          sessionID,
		OutputPath:  outputPath,
		StartTime:   time.Now(),
		IsRecording: false,
	}

	sm.sessions[sessionID] = session
	go sm.handleSessionTimeout(sessionID)
	return sessionID, nil
}

func (sm *SessionManager) GetSession(sessionID string) (*RecordingSession, bool) {
	sm.mutex.RLock()
	defer sm.mutex.RUnlock()
	session, exists := sm.sessions[sessionID]
	return session, exists
}

func (sm *SessionManager) SetPeerConnection(sessionID string, pc *webrtc.PeerConnection) error {
	sm.mutex.Lock()
	defer sm.mutex.Unlock()

	session, exists := sm.sessions[sessionID]
	if !exists {
		return fmt.Errorf("session not found")
	}

	session.Mutex.Lock()
	session.PeerConnection = pc
	session.Mutex.Unlock()

	return nil
}

func (sm *SessionManager) StartRecording(sessionID string) error {
	sm.mutex.RLock()
	session, exists := sm.sessions[sessionID]
	sm.mutex.RUnlock()
	if !exists {
		return fmt.Errorf("session not found")
	}

	session.Mutex.Lock()
	defer session.Mutex.Unlock()
	if session.IsRecording {
		return fmt.Errorf("recording already in progress")
	}

	f, err := os.Create(session.OutputPath)
	if err != nil {
		return fmt.Errorf("failed to create output: %v")
	}
	bw := bufio.NewWriterSize(f, 1*1024*1024)

	session.file = f
	session.buffered = bw
	session.chunkChan = make(chan []byte, 256)
	session.writerDone = make(chan struct{})

	go func() {
		for chunk := range session.chunkChan {
			_, _ = session.buffered.Write(chunk)
		}
		_ = session.buffered.Flush()
		_ = session.file.Sync()
		_ = session.file.Close()
		close(session.writerDone)
	}()

	session.IsRecording = true
	return nil
}

func (sm *SessionManager) AppendChunk(sessionID string, source string, data []byte) error {
	sm.mutex.RLock()
	session, exists := sm.sessions[sessionID]
	sm.mutex.RUnlock()
	if !exists {
		return fmt.Errorf("session not found")
	}

	session.Mutex.RLock()
	isRecording := session.IsRecording
	ch := session.chunkChan
	session.Mutex.RUnlock()

	if !isRecording {
		return fmt.Errorf("session not recording")
	}

	if source != "screen" {
		return nil
	}

	buf := make([]byte, len(data))
	copy(buf, data)

	select {
	case ch <- buf:
	default:
		// drop gracefully if producer is faster; avoids blocking network handlers
	}
	return nil
}

func (sm *SessionManager) StopRecording(sessionID string) error {
	sm.mutex.RLock()
	session, exists := sm.sessions[sessionID]
	sm.mutex.RUnlock()
	if !exists {
		return fmt.Errorf("session not found")
	}

	session.Mutex.Lock()
	if session.IsRecording {
		close(session.chunkChan)
		session.IsRecording = false
	}
	writerDone := session.writerDone
	session.Mutex.Unlock()

	if writerDone != nil {
		<-writerDone
	}
	return nil
}

func (sm *SessionManager) DeleteSession(sessionID string) error {
	sm.mutex.Lock()
	defer sm.mutex.Unlock()

	session, exists := sm.sessions[sessionID]
	if !exists {
		return fmt.Errorf("session not found")
	}

	if session.IsRecording && session.chunkChan != nil {
		close(session.chunkChan)
		if session.writerDone != nil {
			<-session.writerDone
		}
	}

	if session.PeerConnection != nil {
		session.PeerConnection.Close()
	}

	delete(sm.sessions, sessionID)
	return nil
}

func (sm *SessionManager) GetRecordingPath(sessionID string) (string, error) {
	sm.mutex.RLock()
	defer sm.mutex.RUnlock()

	session, exists := sm.sessions[sessionID]
	if !exists {
		return "", fmt.Errorf("session not found")
	}

	return session.OutputPath, nil
}

func (sm *SessionManager) handleSessionTimeout(sessionID string) {
	time.Sleep(sm.config.Recording.SessionTimeout)

	sm.mutex.Lock()
	_, exists := sm.sessions[sessionID]
	sm.mutex.Unlock()

	if exists {
		sm.DeleteSession(sessionID)
	}
}
