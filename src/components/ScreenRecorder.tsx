import React, { useEffect, useRef, useState } from 'react';
import { useMediaStream } from '@/hooks/useMediaStream';
import { WebcamBubble } from './WebcamBubble';
import { RecordingControls } from './RecordingControls';
import { RecordingStatus } from './RecordingStatus';
import { Button } from '@/components/ui/button';
import { Monitor, Play } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const ScreenRecorder: React.FC = () => {
  const {
    state,
    screenStream,
    webcamStream,
    startScreenShare,
    startWebcam,
    startAudio,
    startRecording,
    stopRecording,
    toggleMic,
    toggleCamera,
    endSession,
  } = useMediaStream();

  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  // Setup screen video element
  useEffect(() => {
    if (screenStream && screenVideoRef.current) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  const handleStartSession = async () => {
    try {
      await startScreenShare();
      await startAudio();
      setIsSetupComplete(true);
      toast({
        title: "Screen sharing started",
        description: "Ready to record! Click the camera button to add webcam overlay.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start screen sharing. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStartRecording = async () => {
    try {
      await startRecording();
      toast({
        title: "Recording started",
        description: "Your screen is now being recorded.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start recording. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStopRecording = async () => {
    try {
      await stopRecording();
      toast({
        title: "Recording stopped",
        description: "Your recording has been saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to stop recording.",
        variant: "destructive",
      });
    }
  };

  const handleEndSession = () => {
    endSession();
    setIsSetupComplete(false);
    toast({
      title: "Session ended",
      description: "Screen sharing session has been terminated.",
    });
  };

  if (!isSetupComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-primary-glow/20" />
        
        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/10 rounded-full blur-xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-primary-glow/10 rounded-full blur-xl animate-float" style={{ animationDelay: '1s' }} />
        
        <div className="glass-panel rounded-3xl p-12 max-w-md text-center animate-fade-in relative z-10">
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-glow rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse-glow">
              <Monitor className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-3">
              Screen Recorder
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              Record your screen with webcam overlay and high-quality audio
            </p>
          </div>
          
          <Button 
            onClick={handleStartSession}
            className="btn-gradient-primary w-full text-lg h-12 hover-glow"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Screen Sharing
          </Button>
          
          <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-muted-foreground">
            <div className="status-dot" />
            <span>Ready to record</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Screen sharing display */}
      {state.isScreenSharing && (
        <div className="absolute inset-0 z-0">
          <video
            ref={screenVideoRef}
            autoPlay
            muted
            className="w-full h-full object-contain bg-black"
          />
        </div>
      )}

      {/* Webcam bubble overlay */}
      {state.isCameraOn && webcamStream && (
        <WebcamBubble 
          stream={webcamStream} 
          isRecording={state.isRecording}
        />
      )}

      {/* Recording status */}
      <RecordingStatus 
        isRecording={state.isRecording}
        isScreenSharing={state.isScreenSharing}
        sessionKey={state.sessionKey}
      />

      {/* Recording controls */}
      <RecordingControls
        isRecording={state.isRecording}
        isCameraOn={state.isCameraOn}
        isMicMuted={state.isMicMuted}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onToggleCamera={toggleCamera}
        onToggleMic={toggleMic}
        onEndSession={handleEndSession}
      />
    </div>
  );
};