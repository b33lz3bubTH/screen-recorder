#!/bin/bash

# Test script for screenrecorder API
BASE_URL="http://localhost:8080"

echo "=== Screen Recorder API Test ==="
echo

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s "$BASE_URL/health" | jq .
echo

# Start a recording session
echo "2. Starting recording session..."
SESSION_RESPONSE=$(curl -s -X POST "$BASE_URL/start-recording")
echo "$SESSION_RESPONSE" | jq .

# Extract session key
SESSION_KEY=$(echo "$SESSION_RESPONSE" | jq -r '.session_key')
echo "Session Key: $SESSION_KEY"
echo

# Check session status
echo "3. Checking session status..."
curl -s "$BASE_URL/session/$SESSION_KEY/status" | jq .
echo

# Test WebRTC offer endpoint (with dummy data)
echo "4. Testing WebRTC offer endpoint..."
curl -s -X POST "$BASE_URL/webrtc/$SESSION_KEY/offer" \
  -H "Content-Type: application/json" \
  -d '{
    "sdp": "v=0\r\no=- 1234567890 1234567890 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\na=msid-semantic: WMS\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\nc=IN IP4 0.0.0.0\r\na=ice-ufrag:test\r\na=ice-pwd:test\r\na=ice-options:trickle\r\na=fingerprint:sha-256 00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00\r\na=setup:actpass\r\na=mid:0\r\na=sctp-port:5000\r\na=max-message-size:262144\r\n",
    "type": "offer"
  }' | jq .
echo

# Stop recording
echo "5. Stopping recording..."
curl -s -X POST "$BASE_URL/stop-recording" \
  -H "Content-Type: application/json" \
  -d "{\"session_key\": \"$SESSION_KEY\"}" | jq .
echo

# Check if recording file exists
echo "6. Checking if recording file exists..."
if [ -f "recordings/recording_$SESSION_KEY.mp4" ]; then
    echo "Recording file created: recordings/recording_$SESSION_KEY.mp4"
    ls -la "recordings/recording_$SESSION_KEY.mp4"
else
    echo "Recording file not found"
fi
echo

# Test download endpoint
echo "7. Testing download endpoint..."
curl -s -I "$BASE_URL/download/$SESSION_KEY"
echo

echo "=== Test Complete ==="
