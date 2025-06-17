import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { type IssueCounts } from '../services/dataService';
import { getButtonColor, getAnnotationLabel } from '../lib/annotationColors';

interface AudioControlsProps {
  onTimeUpdate?: (currentTime: number) => void;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlayPause: () => void;
  onSeekTo: (time: number) => void;
  onNextWord: () => void;
  onPrevWord: () => void;
  activeFilters: string[];
  onToggleFilter: (filter: string) => void;
  onToggleCategory: (category: string) => void;
  categoryExpanded: {[key: string]: boolean};
  onApplyPreset: (preset: string) => void;
  issueCounts: IssueCounts;
  availableErrorTypes?: string[];
}

const AudioControls: React.FC<AudioControlsProps> = ({ 
  // onTimeUpdate, // Currently unused but kept for future functionality
  audioRef: externalAudioRef, 
  isPlaying, 
  currentTime, 
  duration, 
  onTogglePlayPause, 
  onSeekTo, 
  // onNextWord, // Currently unused but kept for future functionality
  // onPrevWord, // Currently unused but kept for future functionality
  activeFilters, 
  onToggleFilter, 
  // onToggleCategory, // Currently unused but kept for future functionality
  // categoryExpanded, // Currently unused but kept for future functionality
  // onApplyPreset, // Currently unused but kept for future functionality
  issueCounts, 
  availableErrorTypes = [] 
}) => {
  const internalAudioRef = useRef<HTMLAudioElement>(null);
  const audioRef = externalAudioRef || internalAudioRef;
  
  // Safety check for activeFilters
  const safeActiveFilters = activeFilters || [];
  
  const [volume] = useState(80);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Set initial volume
    audio.volume = volume / 100;
  }, [audioRef, volume]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === undefined || seconds === null) {
      return "0:00";
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isAudioReady = duration > 0;

  const handlePlayPause = () => {
    if (!isAudioReady) return;
    onTogglePlayPause();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAudioReady) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    
    onSeekTo(newTime);
  };

  const skipBackward = () => {
    if (!isAudioReady) return;
    
    const newTime = Math.max(0, currentTime - 10);
    onSeekTo(newTime);
  };

  const skipForward = () => {
    if (!isAudioReady) return;
    
    const newTime = Math.min(duration, currentTime + 10);
    onSeekTo(newTime);
  };

  return (
    <div className="sticky bottom-0 bg-white border-t border-gray-200">
      {/* Top Row - Time and Progress Bar with full width */}
      <div className="px-6 py-3">
        <div className="flex items-center gap-4 mb-2">
        {/* Current Time */}
          <span className="text-sm font-mono text-gray-700 min-w-[50px]">
          {formatTime(currentTime)}
        </span>

          {/* Progress Bar - Full Width */}
          <div className="flex-1">
            <div 
              className={`h-3 bg-gray-200 rounded-full relative group ${isAudioReady ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              onClick={handleSeek}
            >
              <div 
                className="h-3 bg-blue-600 rounded-full relative transition-all duration-150"
                style={{ width: `${progressPercentage}%` }}
              >
                {isAudioReady && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            </div>
          </div>

          {/* Duration */}
          <span className="text-sm font-mono text-gray-700 min-w-[50px]">
            {formatTime(duration)}
          </span>

          {/* Audio Status Indicator */}
          {!isAudioReady && (
            <span className="text-xs text-gray-500 italic">
              Loading audio...
            </span>
          )}
        </div>
      </div>

      {/* Bottom Row - Controls and Filters */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          {/* Left Side - Playback Controls */}
          <div className="flex items-center gap-4">
        {/* Skip Back Button */}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={skipBackward}
          disabled={!isAudioReady}
              className="h-10 w-10 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          title="Skip back 10 seconds"
        >
              <SkipBack className="h-5 w-5" />
        </Button>

        {/* Play/Pause Button */}
        <Button 
          onClick={handlePlayPause}
          size="icon"
          disabled={!isAudioReady}
              className="h-12 w-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full disabled:opacity-50 disabled:bg-gray-400"
          title={isPlaying ? "Pause" : "Play"}
        >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
        </Button>

        {/* Skip Forward Button */}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={skipForward}
          disabled={!isAudioReady}
              className="h-10 w-10 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          title="Skip forward 10 seconds"
        >
              <SkipForward className="h-5 w-5" />
        </Button>
        </div>

          {/* Right Side - Filter Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
          {availableErrorTypes.map((errorType) => {
              const isActive = safeActiveFilters.includes(errorType);
              const buttonColor = getButtonColor(errorType, isActive);
              const label = getAnnotationLabel(errorType);
              const count = issueCounts[errorType as keyof IssueCounts] || 0;

            return (
              <Button 
                key={errorType}
                variant="outline"
                size="sm"
                onClick={() => onToggleFilter(errorType)}
                  className={`text-sm px-3 py-2 border-0 rounded-full ${buttonColor} transition-colors`}
                  title={`Toggle ${label} (${count} found)`}
              >
                  {label}
              </Button>
            );
          })}

          {/* Show All / Hide All Button */}
          {availableErrorTypes.length > 0 && (
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                const allActive = availableErrorTypes.every(type => safeActiveFilters.includes(type));
                if (allActive) {
                  // Clear all
                  availableErrorTypes.forEach(type => {
                    if (safeActiveFilters.includes(type)) {
                      onToggleFilter(type);
                    }
                  });
                } else {
                  // Select all
                  availableErrorTypes.forEach(type => {
                    if (!safeActiveFilters.includes(type)) {
                      onToggleFilter(type);
                    }
                  });
                }
              }}
                className={`text-sm px-3 py-2 border-0 rounded-full transition-colors ${
                availableErrorTypes.every(type => safeActiveFilters.includes(type))
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={`${availableErrorTypes.every(type => safeActiveFilters.includes(type)) ? 'Hide' : 'Show'} all error annotations`}
            >
              {availableErrorTypes.every(type => safeActiveFilters.includes(type)) ? 'Hide All' : 'Show All'}
            </Button>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioControls;