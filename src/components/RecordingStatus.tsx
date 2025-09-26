import React from 'react';
import { Monitor, Wifi, WifiOff } from 'lucide-react';

interface RecordingStatusProps {
  isRecording: boolean;
  isScreenSharing: boolean;
  sessionKey: string | null;
}

export const RecordingStatus: React.FC<RecordingStatusProps> = ({
  isRecording,
  isScreenSharing,
  sessionKey,
}) => {
  return (
    <div className="fixed top-6 right-6 z-50 animate-fade-in">
      <div className="glass-panel rounded-xl p-4 space-y-3 min-w-[200px]">
        {/* Session status */}
        <div className="flex items-center space-x-3">
          <Monitor className="w-5 h-5 text-primary" />
          <div>
            <div className="text-sm font-medium text-white">Screen Sharing</div>
            <div className={`text-xs ${isScreenSharing ? 'text-green-400' : 'text-red-400'}`}>
              {isScreenSharing ? 'Active' : 'Inactive'}
            </div>
          </div>
          <div className={`w-2 h-2 rounded-full ${isScreenSharing ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>

        {/* Connection status */}
        <div className="flex items-center space-x-3">
          {sessionKey ? (
            <Wifi className="w-5 h-5 text-green-400" />
          ) : (
            <WifiOff className="w-5 h-5 text-muted-foreground" />
          )}
          <div>
            <div className="text-sm font-medium text-white">Connection</div>
            <div className={`text-xs ${sessionKey ? 'text-green-400' : 'text-muted-foreground'}`}>
              {sessionKey ? 'Connected' : 'Disconnected'}
            </div>
          </div>
          <div className={`w-2 h-2 rounded-full ${sessionKey ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
        </div>

        {/* Recording status */}
        {isRecording && (
          <>
            <div className="border-t border-white/10 pt-3">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <div>
                  <div className="text-sm font-medium text-white">Recording</div>
                  <div className="text-xs text-red-400">Live</div>
                </div>
              </div>
            </div>

            {/* Session key display */}
            {sessionKey && (
              <div className="bg-black/20 rounded-lg p-2 border border-white/10">
                <div className="text-xs text-muted-foreground mb-1">Session Key</div>
                <div className="text-xs font-mono text-white truncate">
                  {sessionKey}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};