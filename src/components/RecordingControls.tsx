import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Square, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff 
} from 'lucide-react';

interface RecordingControlsProps {
  isRecording: boolean;
  isCameraOn: boolean;
  isMicMuted: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onEndSession: () => void;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  isRecording,
  isCameraOn,
  isMicMuted,
  onStartRecording,
  onStopRecording,
  onToggleCamera,
  onToggleMic,
  onEndSession,
}) => {
  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-slide-in">
      <div className="glass-panel rounded-2xl p-4 flex items-center space-x-3">
        {/* Recording toggle */}
        <div className="flex items-center space-x-2">
          {!isRecording ? (
            <Button
              onClick={onStartRecording}
              className="btn-gradient-primary h-12 px-6 hover-glow"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Recording
            </Button>
          ) : (
            <Button
              onClick={onStopRecording}
              className="btn-gradient-danger h-12 px-6 hover-glow"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop Recording
            </Button>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-white/20" />

        {/* Control buttons */}
        <div className="flex items-center space-x-2">
          {/* Microphone toggle */}
          <Button
            onClick={onToggleMic}
            variant="ghost"
            size="icon"
            className={`
              glass-button h-12 w-12 rounded-full hover-glow
              ${isMicMuted ? 'bg-red-500/20 text-red-400' : 'text-white'}
            `}
          >
            {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          {/* Camera toggle */}
          <Button
            onClick={onToggleCamera}
            variant="ghost"
            size="icon"
            className={`
              glass-button h-12 w-12 rounded-full hover-glow
              ${isCameraOn ? 'bg-primary/20 text-primary' : 'text-white'}
            `}
          >
            {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>

          {/* End session */}
          <Button
            onClick={onEndSession}
            variant="ghost"
            size="icon"
            className="glass-button h-12 w-12 rounded-full hover-glow text-red-400 hover:bg-red-500/20"
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Recording timer */}
      {isRecording && (
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
          <div className="glass-panel rounded-full px-4 py-2 flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-white">
              REC <RecordingTimer />
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const RecordingTimer: React.FC = () => {
  const [time, setTime] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return <span>{formatTime(time)}</span>;
};