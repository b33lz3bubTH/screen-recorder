package main

import (
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
	// Force .webm for chunk uploads regardless of configured output format
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

	// Session timeout goroutine
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

	// Truncate/create the output file at start
	f, err := os.Create(session.OutputPath)
	if err != nil {
		return fmt.Errorf("failed to create output: %v")
	}
	if err := f.Close(); err != nil {
		return fmt.Errorf("failed to close output: %v")
	}

	session.IsRecording = true
	return nil
}

func (sm *SessionManager) AppendChunk(sessionID string, data []byte) error {
	sm.mutex.RLock()
	session, exists := sm.sessions[sessionID]
	sm.mutex.RUnlock()
	if !exists {
		return fmt.Errorf("session not found")
	}

	session.Mutex.RLock()
	isRecording := session.IsRecording
	output := session.OutputPath
	session.Mutex.RUnlock()

	if !isRecording {
		return fmt.Errorf("session not recording")
	}

	f, err := os.OpenFile(output, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return fmt.Errorf("failed to open output: %v")
	}
	defer f.Close()

	if _, err := f.Write(data); err != nil {
		return fmt.Errorf("failed to write chunk: %v")
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
	session.IsRecording = false
	session.Mutex.Unlock()
	return nil
}

func (sm *SessionManager) DeleteSession(sessionID string) error {
	sm.mutex.Lock()
	defer sm.mutex.Unlock()

	session, exists := sm.sessions[sessionID]
	if !exists {
		return fmt.Errorf("session not found")
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
