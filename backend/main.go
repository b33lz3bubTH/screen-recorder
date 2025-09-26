package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	config, err := LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Create upload directory if it doesn't exist
	if err := os.MkdirAll(config.Recording.UploadFolder, 0755); err != nil {
		log.Fatalf("Failed to create upload directory: %v", err)
	}

	// Create logs directory if it doesn't exist
	if err := os.MkdirAll("logs", 0755); err != nil {
		log.Fatalf("Failed to create logs directory: %v", err)
	}

	// Initialize session manager
	sessionManager := NewSessionManager(config)

	// Initialize WebRTC handler
	webrtcHandler := NewWebRTCHandler(sessionManager, config)

	// Initialize HTTP handlers
	handlers := NewHandlers(sessionManager, webrtcHandler)

	// Set up Gin router
	router := gin.Default()

	// Add CORS middleware
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Health check endpoint
	router.GET("/health", handlers.HealthCheck)

	// Recording endpoints
	router.POST("/start-recording", handlers.StartRecording)
	router.POST("/stop-recording", handlers.StopRecording)
	router.POST("/upload-chunk/:session_key/:source", handlers.UploadChunk)
	router.GET("/download/:session_key", handlers.DownloadRecording)
	router.GET("/session/:session_key/status", handlers.GetSessionStatus)
	router.GET("/sessions", handlers.ListSessions)

	// WebRTC endpoints
	router.POST("/webrtc/:session_id/offer", webrtcHandler.HandleOffer)

	// Start server
	serverAddr := fmt.Sprintf("%s:%s", config.Server.Host, config.Server.Port)
	
	log.Printf("Starting screenrecorder server on %s", serverAddr)
	log.Printf("Upload folder: %s", config.Recording.UploadFolder)
	log.Printf("Max sessions: %d", config.Recording.MaxSessions)
	log.Printf("Session timeout: %v", config.Recording.SessionTimeout)

	if err := http.ListenAndServe(serverAddr, router); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
