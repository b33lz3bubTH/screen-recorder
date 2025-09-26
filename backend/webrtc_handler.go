package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/pion/webrtc/v3"
)

type WebRTCOffer struct {
	SDP  string `json:"sdp"`
	Type string `json:"type"`
}

type WebRTCAnswer struct {
	SDP  string `json:"sdp"`
	Type string `json:"type"`
}

type WebRTCHandler struct {
	sessionManager *SessionManager
	config         *Config
}

func NewWebRTCHandler(sessionManager *SessionManager, config *Config) *WebRTCHandler {
	return &WebRTCHandler{
		sessionManager: sessionManager,
		config:         config,
	}
}

func (h *WebRTCHandler) HandleOffer(c *gin.Context) {
	sessionID := c.Param("session_id")
	
	var offer WebRTCOffer
	if err := c.ShouldBindJSON(&offer); err != nil {
		c.JSON(400, gin.H{"error": "Invalid offer format"})
		return
	}

	_, exists := h.sessionManager.GetSession(sessionID)
	if !exists {
		c.JSON(404, gin.H{"error": "Session not found"})
		return
	}

	config := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{URLs: h.config.WebRTC.ICEServers},
		},
	}

	peerConnection, err := webrtc.NewPeerConnection(config)
	if err != nil {
		log.Printf("Failed to create peer connection: %v", err)
		c.JSON(500, gin.H{"error": "Failed to create peer connection"})
		return
	}

	h.setupTrackHandlers(peerConnection, sessionID)

	offerSDP := webrtc.SessionDescription{
		Type: webrtc.SDPTypeOffer,
		SDP:  offer.SDP,
	}

	if err := peerConnection.SetRemoteDescription(offerSDP); err != nil {
		log.Printf("Failed to set remote description: %v", err)
		peerConnection.Close()
		c.JSON(500, gin.H{"error": "Failed to set remote description"})
		return
	}

	answer, err := peerConnection.CreateAnswer(nil)
	if err != nil {
		log.Printf("Failed to create answer: %v", err)
		peerConnection.Close()
		c.JSON(500, gin.H{"error": "Failed to create answer"})
		return
	}

	if err := peerConnection.SetLocalDescription(answer); err != nil {
		log.Printf("Failed to set local description: %v", err)
		peerConnection.Close()
		c.JSON(500, gin.H{"error": "Failed to set local description"})
		return
	}

	if err := h.sessionManager.SetPeerConnection(sessionID, peerConnection); err != nil {
		log.Printf("Failed to store peer connection: %v", err)
		peerConnection.Close()
		c.JSON(500, gin.H{"error": "Failed to store peer connection"})
		return
	}

	response := WebRTCAnswer{
		SDP:  answer.SDP,
		Type: answer.Type.String(),
	}

	c.JSON(200, response)
}

func (h *WebRTCHandler) setupTrackHandlers(pc *webrtc.PeerConnection, sessionID string) {
	pc.OnTrack(func(track *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
		log.Printf("Received track: %s, kind: %s", track.ID(), track.Kind().String())
		
		if err := h.sessionManager.StartRecording(sessionID); err != nil {
			log.Printf("Failed to start recording for session %s: %v", sessionID, err)
		} else {
			log.Printf("Recording started for session %s", sessionID)
		}
		
		go h.processTrack(track, sessionID)
	})

	pc.OnConnectionStateChange(func(state webrtc.PeerConnectionState) {
		log.Printf("Peer connection state changed: %s", state.String())
		
		if state == webrtc.PeerConnectionStateClosed || state == webrtc.PeerConnectionStateFailed {
			log.Printf("Peer connection closed for session: %s", sessionID)
		}
	})

	pc.OnICEConnectionStateChange(func(state webrtc.ICEConnectionState) {
		log.Printf("ICE connection state changed: %s", state.String())
	})
}

func (h *WebRTCHandler) processTrack(track *webrtc.TrackRemote, sessionID string) {
	for {
		_, _, err := track.ReadRTP()
		if err != nil {
			log.Printf("Error reading RTP packet: %v", err)
			return
		}
		
		session, exists := h.sessionManager.GetSession(sessionID)
		if !exists {
			return
		}
		
		session.Mutex.RLock()
		isRecording := session.IsRecording
		session.Mutex.RUnlock()
		
		if !isRecording {
			return
		}
		
		log.Printf("Processing %s packet for session %s", track.Kind().String(), sessionID)
	}
}
