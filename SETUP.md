# Love Stream Cam - Setup Guide

This project consists of a React frontend and Go backend for screen recording with video streaming capabilities.

## Prerequisites

- **Node.js** (v18 or higher)
- **Go** (v1.19 or higher)
- **FFmpeg** (for screen recording)

### Installing FFmpeg

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html

## Quick Start

1. **Clone and setup the project:**
   ```bash
   git clone <your-repo-url>
   cd love-stream-cam
   ```

2. **Start the development environment:**
   ```bash
   ./start-dev.sh
   ```

   This will:
   - Start the Go backend on port 8080
   - Start the React frontend on port 3000
   - Install dependencies automatically

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080
   - Health Check: http://localhost:8080/health

## Manual Setup (Alternative)

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install Go dependencies:
   ```bash
   go mod tidy
   ```

3. Start the backend:
   ```bash
   go run .
   ```

### Frontend Setup

1. Install Node.js dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

## How to Use

1. **Start Screen Sharing:**
   - Click "Start Screen Sharing" on the homepage
   - Grant screen sharing permissions when prompted

2. **Start Recording:**
   - Click the record button to start recording
   - The backend will create a recording session and start capturing

3. **Stop Recording:**
   - Click the stop button to end recording
   - A video player will appear with your recorded video

4. **Download Recording:**
   - Click "Download Recording" to save the video file

## API Endpoints

- `POST /start-recording` - Create and start a recording session
- `POST /stop-recording` - Stop a recording session
- `GET /download/:session_key` - Download/stream recorded video
- `GET /session/:session_key/status` - Get session status
- `GET /health` - Health check

## Configuration

The backend configuration is in `backend/config.yaml`:

```yaml
server:
  port: ":8080"
  host: "localhost"

recording:
  upload_folder: "./recordings"
  max_sessions: 10
  session_timeout_minutes: 30
  video_codec: "libx264"
  audio_codec: "aac"
  output_format: "mp4"
```

## Troubleshooting

### Screen Recording Issues

1. **Permission Denied:**
   - Ensure your browser has screen sharing permissions
   - On Linux, make sure you have X11 access

2. **FFmpeg Not Found:**
   - Install FFmpeg using your system's package manager
   - Ensure FFmpeg is in your system PATH

3. **No Audio in Recording:**
   - Check your system audio settings
   - Ensure PulseAudio is running (Linux)

### Network Issues

1. **CORS Errors:**
   - The backend includes CORS headers for localhost
   - If deploying, update CORS settings in `main.go`

2. **Port Conflicts:**
   - Backend runs on port 8080
   - Frontend runs on port 3000
   - Change ports in `vite.config.ts` and `config.yaml` if needed

## Development

### Project Structure

```
love-stream-cam/
├── backend/                 # Go backend
│   ├── main.go             # Server entry point
│   ├── handlers.go         # HTTP handlers
│   ├── session.go          # Recording session management
│   ├── webrtc_handler.go   # WebRTC handling
│   └── config.yaml         # Backend configuration
├── src/                    # React frontend
│   ├── components/         # React components
│   ├── hooks/             # Custom hooks
│   └── lib/               # Utilities and API service
├── vite.config.ts         # Frontend configuration
└── start-dev.sh           # Development startup script
```

### Adding Features

1. **Frontend:** Add new components in `src/components/`
2. **Backend:** Add new endpoints in `handlers.go`
3. **API:** Update `src/lib/api.ts` for new backend endpoints

## Production Deployment

1. **Build the frontend:**
   ```bash
   npm run build
   ```

2. **Build the backend:**
   ```bash
   cd backend
   go build -o screenrecorder
   ```

3. **Deploy both applications** to your server with proper reverse proxy configuration.

## License

[Your License Here]
