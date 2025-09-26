# Screen Recorder Backend

A Golang backend service for handling WebRTC-based screen recording sessions using pion/webrtc.

## Features

- WebRTC peer connection handling
- Multiple concurrent recording sessions
- FFmpeg integration for video/audio muxing
- RESTful API for session management
- Configurable settings via environment variables
- Session timeout handling
- File download endpoints

## API Endpoints

### Recording Management
- `POST /start-recording` - Start a new recording session
- `POST /stop-recording` - Stop an active recording session
- `GET /download/:session_key` - Download the recorded file
- `GET /session/:session_key/status` - Get session status
- `GET /sessions` - List all active sessions

### WebRTC
- `POST /webrtc/:session_id/offer` - Handle WebRTC offer and return answer

### Health
- `GET /health` - Health check endpoint

## Configuration

The application can be configured using environment variables or a `.env` file:

```bash
# Server Configuration
SERVER_PORT=8080
SERVER_HOST=localhost

# Recording Configuration
UPLOAD_FOLDER=./recordings
MAX_SESSIONS=10
SESSION_TIMEOUT_MINUTES=30
VIDEO_CODEC=libx264
AUDIO_CODEC=aac
OUTPUT_FORMAT=mp4

# WebRTC Configuration
STUN_SERVER_1=stun:stun.l.google.com:19302
STUN_SERVER_2=stun:stun1.l.google.com:19302

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

## Prerequisites

- Go 1.21 or later
- FFmpeg installed and available in PATH
- Git

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd screenrecorder
```

2. Install dependencies:
```bash
go mod tidy
```

3. Create necessary directories:
```bash
mkdir -p recordings logs
```

4. Configure environment variables (optional):
```bash
cp .env.example .env
# Edit .env file with your settings
```

## Running the Application

1. Start the server:
```bash
go run .
```

2. The server will start on `localhost:8080` by default.

## Usage Example

### 1. Start a Recording Session
```bash
curl -X POST http://localhost:8080/start-recording
```

Response:
```json
{
  "session_key": "123e4567-e89b-12d3-a456-426614174000",
  "message": "Recording session created successfully"
}
```

### 2. Handle WebRTC Offer
```bash
curl -X POST http://localhost:8080/webrtc/123e4567-e89b-12d3-a456-426614174000/offer \
  -H "Content-Type: application/json" \
  -d '{
    "sdp": "v=0\r\no=- 1234567890 1234567890 IN IP4 127.0.0.1\r\n...",
    "type": "offer"
  }'
```

### 3. Stop Recording
```bash
curl -X POST http://localhost:8080/stop-recording \
  -H "Content-Type: application/json" \
  -d '{
    "session_key": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

### 4. Download Recording
```bash
curl -O http://localhost:8080/download/123e4567-e89b-12d3-a456-426614174000
```

## Architecture

The application consists of several key components:

- **SessionManager**: Manages recording sessions and their lifecycle
- **WebRTCHandler**: Handles WebRTC peer connections and track processing
- **Handlers**: HTTP request handlers for the REST API
- **Config**: Configuration management

## Session Management

Each recording session is identified by a unique session key (UUID). Sessions are automatically cleaned up after the configured timeout period.

## WebRTC Integration

The application uses pion/webrtc to handle peer connections. It supports:
- Screen sharing
- Microphone audio
- Desktop audio
- Webcam video

## FFmpeg Integration

FFmpeg is used to mux the incoming tracks into a single MP4 file. The application supports configurable codecs and output formats.

## Error Handling

The application includes comprehensive error handling for:
- Invalid session keys
- Missing files
- WebRTC connection failures
- FFmpeg processing errors

## Logging

Logs are written to both console and file (configurable). Log levels can be set via environment variables.

## Security Considerations

- Sessions are isolated and cannot access each other's data
- File downloads are restricted to the configured upload folder
- Session timeouts prevent resource leaks
- CORS is enabled for cross-origin requests

## Development

To run in development mode:

```bash
# Enable debug logging
export LOG_LEVEL=debug

# Run with hot reload (requires air or similar tool)
air
```

## Testing

```bash
# Run tests
go test ./...

# Run with coverage
go test -cover ./...
```

## Deployment

For production deployment:

1. Set appropriate environment variables
2. Use a reverse proxy (nginx, Apache)
3. Configure SSL/TLS
4. Set up monitoring and logging
5. Use a process manager (systemd, supervisor)

## License

MIT License
