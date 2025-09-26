#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Love Stream Cam Development Environment${NC}"

# Function to cleanup processes on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    jobs -p | xargs -r kill
    exit
}

# Set up cleanup trap
trap cleanup SIGINT SIGTERM

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo -e "${RED}❌ Go is not installed. Please install Go to run the backend.${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js to run the frontend.${NC}"
    exit 1
fi

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${YELLOW}⚠️  FFmpeg is not installed. Screen recording may not work properly.${NC}"
    echo -e "${YELLOW}   Please install FFmpeg for full functionality.${NC}"
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Start backend
echo -e "\n${BLUE}🔧 Starting Backend (Go) on port 8080...${NC}"
cd backend
go mod tidy
go run . &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo -e "\n${BLUE}🎨 Starting Frontend (React) on port 3000...${NC}"
cd ..
npm install
npm run dev &
FRONTEND_PID=$!

echo -e "\n${GREEN}🎉 Development environment started!${NC}"
echo -e "${GREEN}📱 Frontend: http://localhost:3000${NC}"
echo -e "${GREEN}🔧 Backend: http://localhost:8080${NC}"
echo -e "${GREEN}❤️  Backend Health: http://localhost:8080/health${NC}"
echo -e "\n${YELLOW}Press Ctrl+C to stop all services${NC}"

# Wait for all background processes
wait
