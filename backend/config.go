package main

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Server   ServerConfig
	Recording RecordingConfig
	WebRTC   WebRTCConfig
	Logging  LoggingConfig
}

type ServerConfig struct {
	Port string
	Host string
}

type RecordingConfig struct {
	UploadFolder         string
	MaxSessions         int
	SessionTimeout      time.Duration
	VideoCodec          string
	AudioCodec          string
	OutputFormat        string
}

type WebRTCConfig struct {
	ICEServers []string
}

type LoggingConfig struct {
	Level string
	File  string
}

func LoadConfig() (*Config, error) {
	// Load .env file if it exists
	_ = godotenv.Load()

	config := &Config{
		Server: ServerConfig{
			Port: getEnv("SERVER_PORT", "8080"),
			Host: getEnv("SERVER_HOST", "localhost"),
		},
		Recording: RecordingConfig{
			UploadFolder:    getEnv("UPLOAD_FOLDER", "./recordings"),
			MaxSessions:     getEnvAsInt("MAX_SESSIONS", 10),
			SessionTimeout:  time.Duration(getEnvAsInt("SESSION_TIMEOUT_MINUTES", 30)) * time.Minute,
			VideoCodec:      getEnv("VIDEO_CODEC", "libx264"),
			AudioCodec:      getEnv("AUDIO_CODEC", "aac"),
			OutputFormat:    getEnv("OUTPUT_FORMAT", "mp4"),
		},
		WebRTC: WebRTCConfig{
			ICEServers: []string{
				getEnv("STUN_SERVER_1", "stun:stun.l.google.com:19302"),
				getEnv("STUN_SERVER_2", "stun:stun1.l.google.com:19302"),
			},
		},
		Logging: LoggingConfig{
			Level: getEnv("LOG_LEVEL", "info"),
			File:  getEnv("LOG_FILE", "./logs/app.log"),
		},
	}

	return config, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
