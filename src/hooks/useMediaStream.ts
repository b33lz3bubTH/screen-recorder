import { useCallback, useRef, useState } from 'react';
import { ApiService } from '@/lib/api';

interface MediaStreamState {
  isRecording: boolean;
  isScreenSharing: boolean;
  isCameraOn: boolean;
  isMicMuted: boolean;
  sessionKey: string | null;
  recordingUrl: string | null;
}

export const useMediaStream = () => {
  const [state, setState] = useState<MediaStreamState>({
    isRecording: false,
    isScreenSharing: false,
    isCameraOn: false,
    isMicMuted: false,
    sessionKey: null,
    recordingUrl: null,
  });

  const [screenPreview, setScreenPreview] = useState<MediaStream | null>(null);

  const screenStreamRef = useRef<MediaStream | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const lastUploadRef = useRef<Promise<void>>(Promise.resolve());
  const sessionKeyRef = useRef<string | null>(null);

  const prewarmPermissions = useCallback(async () => {
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      mic.getTracks().forEach(t => t.stop());
    } catch {}
    try {
      const cam = await navigator.mediaDevices.getUserMedia({ video: true });
      cam.getTracks().forEach(t => t.stop());
    } catch {}
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      screenStreamRef.current = stream;
      setScreenPreview(stream);
      setState((prev) => ({ ...prev, isScreenSharing: true }));

      stream.getVideoTracks()[0].addEventListener('ended', () => {
        setState((prev) => ({ ...prev, isScreenSharing: false }));
        screenStreamRef.current = null;
        setScreenPreview(null);
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
          facingMode: 'user',
        },
        audio: false,
      });

      webcamStreamRef.current = stream;
      setState((prev) => ({ ...prev, isCameraOn: true }));
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
          autoGainControl: true,
        },
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

    if (screenStreamRef.current) {
      const videoTrack = screenStreamRef.current.getVideoTracks()[0];
      if (videoTrack) combinedStream.addTrack(videoTrack);
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getAudioTracks().forEach((track) => {
        combinedStream.addTrack(track);
      });
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getAudioTracks().forEach((track) => {
        combinedStream.addTrack(track);
      });
    }

    combinedStreamRef.current = combinedStream;
    return combinedStream;
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const { session_key } = await ApiService.startRecording();
      sessionKeyRef.current = session_key;

      const combinedStream = combineTracks();

      const mimeCandidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
      let mimeType = '';
      for (const candidate of mimeCandidates) {
        if (MediaRecorder.isTypeSupported(candidate)) {
          mimeType = candidate;
          break;
        }
      }

      const mediaRecorder = new MediaRecorder(combinedStream, mimeType ? { mimeType } : undefined);

      mediaRecorder.ondataavailable = (evt) => {
        if (!evt.data || evt.data.size === 0 || !sessionKeyRef.current) return;
        const key = sessionKeyRef.current;
        lastUploadRef.current = lastUploadRef.current
          .then(() => ApiService.uploadChunk(key as string, evt.data))
          .catch(() => undefined);
      };

      mediaRecorder.onerror = (e) => {
        console.error('MediaRecorder error', e);
      };

      mediaRecorderRef.current = mediaRecorder;

      setState((prev) => ({
        ...prev,
        isRecording: true,
        sessionKey: session_key,
        recordingUrl: null,
      }));

      mediaRecorder.start(1000);

      return session_key;
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }, [combineTracks]);

  const stopRecording = useCallback(async () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      await lastUploadRef.current;

      if (sessionKeyRef.current) {
        await ApiService.stopRecording(sessionKeyRef.current);
        const downloadUrl = ApiService.getDownloadUrl(sessionKeyRef.current);
        setState((prev) => ({ ...prev, isRecording: false, recordingUrl: downloadUrl }));
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw error;
    }
  }, []);

  const toggleMic = useCallback(() => {
    if (audioStreamRef.current) {
      const audioTracks = audioStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = state.isMicMuted;
      });
      setState((prev) => ({ ...prev, isMicMuted: !prev.isMicMuted }));
    }
  }, [state.isMicMuted]);

  const toggleCamera = useCallback(async () => {
    if (state.isCameraOn) {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((track) => track.stop());
        webcamStreamRef.current = null;
      }
      setState((prev) => ({ ...prev, isCameraOn: false }));
    } else {
      await startWebcam();
    }
  }, [state.isCameraOn, startWebcam]);

  const endSession = useCallback(() => {
    [screenStreamRef, webcamStreamRef, audioStreamRef, combinedStreamRef].forEach((ref) => {
      if (ref.current) {
        ref.current.getTracks().forEach((track) => track.stop());
        ref.current = null;
      }
    });

    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }

    sessionKeyRef.current = null;

    setScreenPreview(null);

    setState({
      isRecording: false,
      isScreenSharing: false,
      isCameraOn: false,
      isMicMuted: false,
      sessionKey: null,
      recordingUrl: null,
    });
  }, []);

  const clearRecording = useCallback(() => {
    setState((prev) => ({ ...prev, recordingUrl: null }));
  }, []);

  return {
    state,
    screenStream: screenPreview,
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
    clearRecording,
    prewarmPermissions,
  };
};
