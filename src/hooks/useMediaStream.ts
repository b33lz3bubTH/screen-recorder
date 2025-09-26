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

  // Compositor refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const compositedStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const screenVideoElRef = useRef<HTMLVideoElement | null>(null);
  const webcamVideoElRef = useRef<HTMLVideoElement | null>(null);

  const stopCompositor = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (compositedStreamRef.current) {
      compositedStreamRef.current.getTracks().forEach(t => t.stop());
      compositedStreamRef.current = null;
    }
    canvasRef.current = null;
    canvasCtxRef.current = null;
    screenVideoElRef.current = null;
    webcamVideoElRef.current = null;
    setScreenPreview(null);
  }, []);

  const startCompositor = useCallback(() => {
    const screenTrack = screenStreamRef.current?.getVideoTracks()[0];
    if (!screenTrack) return;
    const settings = screenTrack.getSettings();
    const width = (settings.width as number) || 1280;
    const height = (settings.height as number) || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const screenVideo = document.createElement('video');
    screenVideo.muted = true;
    screenVideo.playsInline = true;
    screenVideo.autoplay = true;
    screenVideo.srcObject = screenStreamRef.current as MediaStream;
    screenVideo.play().catch(() => undefined);

    const webcamVideo = document.createElement('video');
    webcamVideo.muted = true;
    webcamVideo.playsInline = true;
    webcamVideo.autoplay = true;
    if (webcamStreamRef.current) {
      webcamVideo.srcObject = webcamStreamRef.current;
      webcamVideo.play().catch(() => undefined);
    }

    canvasRef.current = canvas;
    canvasCtxRef.current = ctx;
    screenVideoElRef.current = screenVideo;
    webcamVideoElRef.current = webcamVideo;

    const fps = 30;
    const draw = () => {
      const ctx2 = canvasCtxRef.current;
      const cvs = canvasRef.current;
      if (!ctx2 || !cvs) return;

      ctx2.clearRect(0, 0, cvs.width, cvs.height);
      if (screenVideoElRef.current && screenVideoElRef.current.readyState >= 2) {
        ctx2.drawImage(screenVideoElRef.current, 0, 0, cvs.width, cvs.height);
      }

      if (webcamVideoElRef.current && webcamVideoElRef.current.srcObject && webcamVideoElRef.current.readyState >= 2) {
        const bubbleSize = Math.round(Math.min(cvs.width, cvs.height) * 0.22);
        const margin = Math.round(bubbleSize * 0.15);
        const x = margin + bubbleSize / 2;
        const y = margin + bubbleSize / 2;

        ctx2.save();
        ctx2.beginPath();
        ctx2.arc(x, y, bubbleSize / 2, 0, Math.PI * 2);
        ctx2.closePath();
        ctx2.clip();

        const vw = webcamVideoElRef.current.videoWidth || bubbleSize;
        const vh = webcamVideoElRef.current.videoHeight || bubbleSize;
        const scale = Math.max(bubbleSize / vw, bubbleSize / vh);
        const dw = vw * scale;
        const dh = vh * scale;
        const dx = x - dw / 2;
        const dy = y - dh / 2;
        ctx2.drawImage(webcamVideoElRef.current, dx, dy, dw, dh);
        ctx2.restore();

        ctx2.beginPath();
        ctx2.arc(x, y, bubbleSize / 2, 0, Math.PI * 2);
        ctx2.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx2.lineWidth = Math.max(2, Math.round(bubbleSize * 0.03));
        ctx2.stroke();
      }

      rafRef.current = setTimeout(() => requestAnimationFrame(draw), 1000 / fps) as unknown as number;
    };
    requestAnimationFrame(draw);

    const out = canvas.captureStream(fps);
    compositedStreamRef.current = out;
    setScreenPreview(out);
  }, []);

  const ensureCompositedStream = useCallback(async (): Promise<MediaStream> => {
    if (!compositedStreamRef.current) {
      startCompositor();
    }
    for (let i = 0; i < 20; i++) {
      const vt = compositedStreamRef.current?.getVideoTracks()[0];
      if (vt) return compositedStreamRef.current as MediaStream;
      await new Promise(r => setTimeout(r, 50));
    }
    return (compositedStreamRef.current || screenStreamRef.current) as MediaStream;
  }, [startCompositor]);

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

  const startScreenShare = useCallback(() => startCompositor(), [startCompositor]);

  const _startScreenShare = useCallback(async () => {
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
      setState((prev) => ({ ...prev, isScreenSharing: true }));

      startCompositor();

      stream.getVideoTracks()[0].addEventListener('ended', () => {
        setState((prev) => ({ ...prev, isScreenSharing: false }));
        screenStreamRef.current = null;
        stopCompositor();
      });

      return stream;
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  }, [startCompositor, stopCompositor]);

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

      if (webcamVideoElRef.current) {
        webcamVideoElRef.current.srcObject = stream;
        webcamVideoElRef.current.play().catch(() => undefined);
      }

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

  const combineTracks = useCallback((videoSource: MediaStream) => {
    const combinedStream = new MediaStream();

    const compTrack = videoSource.getVideoTracks()[0];
    if (compTrack) combinedStream.addTrack(compTrack);

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

      if (!webcamStreamRef.current) {
        try { await startWebcam(); } catch {}
      }

      const compStream = await ensureCompositedStream();
      const combinedStream = combineTracks(compStream);

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
          .then(() => ApiService.uploadChunk(key as string, 'screen', evt.data))
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
  }, [combineTracks, ensureCompositedStream, startWebcam]);

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
      if (webcamVideoElRef.current) webcamVideoElRef.current.srcObject = null;
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
    stopCompositor();

    setState({
      isRecording: false,
      isScreenSharing: false,
      isCameraOn: false,
      isMicMuted: false,
      sessionKey: null,
      recordingUrl: null,
    });
  }, [stopCompositor]);

  const clearRecording = useCallback(() => {
    setState((prev) => ({ ...prev, recordingUrl: null }));
  }, []);

  return {
    state,
    screenStream: screenPreview,
    webcamStream: webcamStreamRef.current,
    audioStream: audioStreamRef.current,
    startScreenShare: _startScreenShare,
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
