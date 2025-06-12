import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { type IssueCounts } from '../services/dataService';

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
    <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-3">
      <div className="flex items-center gap-4">
        
        {/* Current Time */}
        <span className="text-sm font-mono text-gray-700 min-w-[40px]">
          {formatTime(currentTime)}
        </span>

        {/* Skip Back Button */}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={skipBackward}
          disabled={!isAudioReady}
          className="h-8 w-8 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          title="Skip back 10 seconds"
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        {/* Play/Pause Button */}
        <Button 
          onClick={handlePlayPause}
          size="icon"
          disabled={!isAudioReady}
          className="h-10 w-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full disabled:opacity-50 disabled:bg-gray-400"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </Button>

        {/* Skip Forward Button */}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={skipForward}
          disabled={!isAudioReady}
          className="h-8 w-8 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          title="Skip forward 10 seconds"
        >
          <SkipForward className="h-4 w-4" />
        </Button>

        {/* Progress Bar */}
        <div className="flex-1 mx-4">
          <div 
            className={`h-2 bg-gray-200 rounded-full relative group ${isAudioReady ? 'cursor-pointer' : 'cursor-not-allowed'}`}
            onClick={handleSeek}
          >
            <div 
              className="h-2 bg-blue-600 rounded-full relative transition-all duration-150"
              style={{ width: `${progressPercentage}%` }}
            >
              {isAudioReady && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          </div>
        </div>

        {/* Duration */}
        <span className="text-sm font-mono text-gray-700 min-w-[40px]">
          {formatTime(duration)}
        </span>

        {/* Audio Status Indicator */}
        {!isAudioReady && (
          <span className="text-xs text-gray-500 italic">
            Loading audio...
          </span>
        )}

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 ml-6">
          {availableErrorTypes.map((errorType) => {
            const getButtonConfig = (type: string) => {
              const isActive = safeActiveFilters.includes(type);
              switch (type) {
                case 'filler':
                  return {
                    label: 'Filler words',
                    color: isActive ? 'bg-yellow-500 text-white' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
                    count: issueCounts.filler
                  };
                case 'repetition':
                  return {
                    label: 'Repetition',
                    color: isActive ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200',
                    count: issueCounts.repetition
                  };
                case 'utterance-error':
                  return {
                    label: 'Mispronunciation',
                    color: isActive ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-700 hover:bg-purple-200',
                    count: issueCounts['utterance-error']
                  };
                case 'mispronunciation':
                  return {
                    label: 'Mispronunciation',
                    color: isActive ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-700 hover:bg-purple-200',
                    count: issueCounts.mispronunciation
                  };
                case 'morpheme-omission':
                  return {
                    label: 'Morphemes',
                    color: isActive ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200',
                    count: issueCounts['morpheme-omission']
                  };
                case 'revision':
                  return {
                    label: 'Revisions',
                    color: isActive ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
                    count: issueCounts.revision
                  };
                default:
                  return {
                    label: type.charAt(0).toUpperCase() + type.slice(1),
                    color: isActive ? 'bg-gray-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                    count: 0
                  };
              }
            };

            const config = getButtonConfig(errorType);

            return (
              <Button 
                key={errorType}
                variant="outline"
                size="sm"
                onClick={() => onToggleFilter(errorType)}
                className={`text-sm px-3 py-1.5 border-0 rounded-full ${config.color} transition-colors`}
                title={`Toggle ${config.label} (${config.count} found)`}
              >
                {config.label}
              </Button>
            );
          })}

          {/* Show All Button */}
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
              className={`text-sm px-3 py-1.5 border-0 rounded-full transition-colors ${
                availableErrorTypes.every(type => safeActiveFilters.includes(type))
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Toggle all error annotations"
            >
              Show All
            </Button>
          )}

          {/* Pauses button (if not in error types but we want to show it) */}
          {/*<Button 
            variant="outline"
            size="sm"
            onClick={() => onToggleFilter('pause')}
            className={`text-sm px-3 py-1.5 border-0 rounded-full transition-colors ${
              safeActiveFilters.includes('pause')
                ? 'bg-blue-500 text-white'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
            title="Toggle pause annotations"
          >
            Pauses
          </Button>*/}
        </div>
      </div>
    </div>
  );
};

export default AudioControls;