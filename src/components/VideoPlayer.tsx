import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Play, Pause } from 'lucide-react';
import { useState } from 'react';

interface VideoPlayerProps {
  videoUrl: string;
  sessionKey: string;
  onClose: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  videoUrl, 
  sessionKey, 
  onClose 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      
      const handleLoadStart = () => setIsLoading(true);
      const handleCanPlay = () => setIsLoading(false);
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      
      video.addEventListener('loadstart', handleLoadStart);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      
      return () => {
        video.removeEventListener('loadstart', handleLoadStart);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
      };
    }
  }, []);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `recording_${sessionKey}.mp4`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg p-6 max-w-5xl w-full mx-4 max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Recording Complete</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="mb-4 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <div className="text-white">Loading video...</div>
            </div>
          )}
          
          <video 
            ref={videoRef}
            controls 
            className="w-full rounded-lg"
            src={videoUrl}
            preload="metadata"
          >
            Your browser does not support the video tag.
          </video>
        </div>
        
        <div className="flex gap-4 justify-center">
          <Button onClick={togglePlayPause} className="flex items-center gap-2">
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          
          <Button onClick={handleDownload} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download Recording
          </Button>
          
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
        
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Session: {sessionKey}
        </div>
      </div>
    </div>
  );
};
