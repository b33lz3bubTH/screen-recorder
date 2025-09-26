#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing Love Stream Cam Setup${NC}"

# Test 1: Check if all files exist
echo -e "\n${YELLOW}1. Checking file structure...${NC}"

files_to_check=(
  "src/lib/api.ts"
  "src/hooks/useMediaStream.ts"
  "src/components/ScreenRecorder.tsx"
  "src/components/VideoPlayer.tsx"
  "backend/main.go"
  "backend/handlers.go"
  "backend/session.go"
  "backend/webrtc_handler.go"
  "vite.config.ts"
)

all_files_exist=true
for file in "${files_to_check[@]}"; do
  if [ -f "$file" ]; then
    echo -e "  ✅ $file"
  else
    echo -e "  ❌ $file"
    all_files_exist=false
  fi
done

if [ "$all_files_exist" = true ]; then
  echo -e "${GREEN}✅ All required files exist${NC}"
else
  echo -e "${RED}❌ Some files are missing${NC}"
  exit 1
fi

# Test 2: Check if dependencies are installed
echo -e "\n${YELLOW}2. Checking dependencies...${NC}"

if [ -d "node_modules" ]; then
  echo -e "  ✅ Node.js dependencies installed"
else
  echo -e "  ⚠️  Node.js dependencies not installed (run 'npm install')"
fi

if [ -f "backend/go.mod" ]; then
  echo -e "  ✅ Go module exists"
else
  echo -e "  ❌ Go module missing"
fi

# Test 3: Check if ports are available
echo -e "\n${YELLOW}3. Checking port availability...${NC}"

if ! lsof -i:3000 > /dev/null 2>&1; then
  echo -e "  ✅ Port 3000 (frontend) is available"
else
  echo -e "  ⚠️  Port 3000 is in use"
fi

if ! lsof -i:8080 > /dev/null 2>&1; then
  echo -e "  ✅ Port 8080 (backend) is available"
else
  echo -e "  ⚠️  Port 8080 is in use"
fi

# Test 4: Check if FFmpeg is available
echo -e "\n${YELLOW}4. Checking FFmpeg...${NC}"

if command -v ffmpeg &> /dev/null; then
  echo -e "  ✅ FFmpeg is installed"
  ffmpeg -version | head -1
else
  echo -e "  ⚠️  FFmpeg is not installed (screen recording may not work)"
fi

# Test 5: Check if Go is available
echo -e "\n${YELLOW}5. Checking Go...${NC}"

if command -v go &> /dev/null; then
  echo -e "  ✅ Go is installed"
  go version
else
  echo -e "  ❌ Go is not installed"
fi

# Test 6: Check if Node.js is available
echo -e "\n${YELLOW}6. Checking Node.js...${NC}"

if command -v node &> /dev/null; then
  echo -e "  ✅ Node.js is installed"
  node --version
else
  echo -e "  ❌ Node.js is not installed"
fi

echo -e "\n${GREEN}🎉 Setup test completed!${NC}"
echo -e "\n${BLUE}To start the application:${NC}"
echo -e "  ${YELLOW}./start-dev.sh${NC}"
echo -e "\n${BLUE}Or manually:${NC}"
echo -e "  ${YELLOW}# Terminal 1:${NC} cd backend && go run ."
echo -e "  ${YELLOW}# Terminal 2:${NC} npm run dev"
