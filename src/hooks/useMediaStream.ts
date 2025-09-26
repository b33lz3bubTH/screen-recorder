import { useCallback, useRef, useState } from 'react';

interface MediaStreamState {
  isRecording: boolean;
  isScreenSharing: boolean;
  isCameraOn: boolean;
  isMicMuted: boolean;
  sessionKey: string | null;
}

export const useMediaStream = () => {
  const [state, setState] = useState<MediaStreamState>({
    isRecording: false,
    isScreenSharing: false,
    isCameraOn: false,
    isMicMuted: false,
    sessionKey: null,
  });

  const screenStreamRef = useRef<MediaStream | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: { 
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      screenStreamRef.current = stream;
      setState(prev => ({ ...prev, isScreenSharing: true }));
      
      // Handle screen share end
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        setState(prev => ({ ...prev, isScreenSharing: false }));
        screenStreamRef.current = null;
      });

      return stream;
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  }, []);

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false // We'll handle audio separately
      });
      
      webcamStreamRef.current = stream;
      setState(prev => ({ ...prev, isCameraOn: true }));
      return stream;
    } catch (error) {
      console.error('Error starting webcam:', error);
      throw error;
    }
  }, []);

  const startAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      audioStreamRef.current = stream;
      return stream;
    } catch (error) {
      console.error('Error starting audio:', error);
      throw error;
    }
  }, []);

  const combineTracks = useCallback(() => {
    const combinedStream = new MediaStream();
    
    // Add screen video track
    if (screenStreamRef.current) {
      const videoTrack = screenStreamRef.current.getVideoTracks()[0];
      if (videoTrack) combinedStream.addTrack(videoTrack);
    }
    
    // Add audio tracks
    if (audioStreamRef.current) {
      audioStreamRef.current.getAudioTracks().forEach(track => {
        combinedStream.addTrack(track);
      });
    }
    
    // Add screen audio if available
    if (screenStreamRef.current) {
      screenStreamRef.current.getAudioTracks().forEach(track => {
        combinedStream.addTrack(track);
      });
    }

    combinedStreamRef.current = combinedStream;
    return combinedStream;
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Request session key from backend
      const response = await fetch('/api/recording/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const { session_key } = await response.json();
      
      // Setup WebRTC connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      const combinedStream = combineTracks();
      
      // Add tracks to peer connection
      combinedStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, combinedStream);
      });
      
      peerConnectionRef.current = peerConnection;
      
      setState(prev => ({ 
        ...prev, 
        isRecording: true, 
        sessionKey: session_key 
      }));
      
      return session_key;
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }, [combineTracks]);

  const stopRecording = useCallback(async () => {
    try {
      if (state.sessionKey) {
        await fetch('/api/recording/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_key: state.sessionKey })
        });
      }
      
      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      
      setState(prev => ({ 
        ...prev, 
        isRecording: false, 
        sessionKey: null 
      }));
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw error;
    }
  }, [state.sessionKey]);

  const toggleMic = useCallback(() => {
    if (audioStreamRef.current) {
      const audioTracks = audioStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = state.isMicMuted;
      });
      setState(prev => ({ ...prev, isMicMuted: !prev.isMicMuted }));
    }
  }, [state.isMicMuted]);

  const toggleCamera = useCallback(async () => {
    if (state.isCameraOn) {
      // Turn off camera
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(track => track.stop());
        webcamStreamRef.current = null;
      }
      setState(prev => ({ ...prev, isCameraOn: false }));
    } else {
      // Turn on camera
      await startWebcam();
    }
  }, [state.isCameraOn, startWebcam]);

  const endSession = useCallback(() => {
    // Stop all streams
    [screenStreamRef, webcamStreamRef, audioStreamRef, combinedStreamRef].forEach(ref => {
      if (ref.current) {
        ref.current.getTracks().forEach(track => track.stop());
        ref.current = null;
      }
    });
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    setState({
      isRecording: false,
      isScreenSharing: false,
      isCameraOn: false,
      isMicMuted: false,
      sessionKey: null,
    });
  }, []);

  return {
    state,
    screenStream: screenStreamRef.current,
    webcamStream: webcamStreamRef.current,
    audioStream: audioStreamRef.current,
    startScreenShare,
    startWebcam,
    startAudio,
    startRecording,
    stopRecording,
    toggleMic,
    toggleCamera,
    endSession,
  };
};