package main

import (
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

type Handlers struct {
	sessionManager *SessionManager
	webrtcHandler  *WebRTCHandler
}

func NewHandlers(sessionManager *SessionManager, webrtcHandler *WebRTCHandler) *Handlers {
	return &Handlers{
		sessionManager: sessionManager,
		webrtcHandler:  webrtcHandler,
	}
}

func (h *Handlers) StartRecording(c *gin.Context) {
	sessionID, err := h.sessionManager.CreateSession()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create recording session",
			"details": err.Error(),
		})
		return
	}

	if err := h.sessionManager.StartRecording(sessionID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to start recording",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"session_key": sessionID,
		"message": "Recording session created and started successfully",
	})
}

func (h *Handlers) UploadChunk(c *gin.Context) {
	sessionID := c.Param("session_key")
	source := c.Param("source")
	if source != "screen" && source != "webcam" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid source"})
		return
	}
	data, err := io.ReadAll(c.Request.Body)
	if err != nil || len(data) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid chunk"})
		return
	}
	if err := h.sessionManager.AppendChunk(sessionID, source, data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *Handlers) StopRecording(c *gin.Context) {
	var request struct {
		SessionKey string `json:"session_key" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	if err := h.sessionManager.StopRecording(request.SessionKey); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to stop recording",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Recording stopped successfully",
		"session_key": request.SessionKey,
	})
}

func (h *Handlers) DownloadRecording(c *gin.Context) {
	sessionID := c.Param("session_key")

	recordingPath, err := h.sessionManager.GetRecordingPath(sessionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Recording not found",
			"details": err.Error(),
		})
		return
	}

	if _, err := os.Stat(recordingPath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Recording file not found",
		})
		return
	}

	filename := filepath.Base(recordingPath)

	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", "inline; filename="+filename)
	c.Header("Content-Type", "video/webm")
	c.Header("Accept-Ranges", "bytes")

	c.File(recordingPath)
}

func (h *Handlers) GetSessionStatus(c *gin.Context) {
	sessionID := c.Param("session_key")

	session, exists := h.sessionManager.GetSession(sessionID)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Session not found",
		})
		return
	}

	session.Mutex.RLock()
	isRecording := session.IsRecording
	startTime := session.StartTime
	session.Mutex.RUnlock()

	c.JSON(http.StatusOK, gin.H{
		"session_key": sessionID,
		"is_recording": isRecording,
		"start_time": startTime,
		"status": "active",
	})
}

func (h *Handlers) ListSessions(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "Session listing not implemented yet",
		"sessions": []string{},
	})
}

func (h *Handlers) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "healthy",
		"service": "screenrecorder",
	})
}
