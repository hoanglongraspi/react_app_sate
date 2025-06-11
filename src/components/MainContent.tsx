import React from 'react';
import ConversationView from './ConversationView';
import AudioControls from './AudioControls';
import { type Segment, type IssueCounts } from '../services/dataService';

interface MainContentProps {
  currentTime: number;
  onSeek: (timestamp: string) => void;
  activeFilters: string[];
  isPlaying: boolean;
  onTogglePlayPause: () => void;
  onSeekTo: (time: number) => void;
  duration: number;
  onNextWord: () => void;
  onPrevWord: () => void;
  onToggleFilter: (filter: string) => void;
  onToggleCategory: (category: string) => void;
  categoryExpanded: {[key: string]: boolean};
  onApplyPreset: (preset: string) => void;
  transcriptData: Segment[];
  issueCounts: IssueCounts;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  onTimeUpdate?: (currentTime: number) => void;
  availableErrorTypes?: string[];
}

const MainContent: React.FC<MainContentProps> = ({
  currentTime,
  onSeek,
  activeFilters,
  isPlaying,
  onTogglePlayPause,
  onSeekTo,
  duration,
  onNextWord,
  onPrevWord,
  onToggleFilter,
  onToggleCategory,
  categoryExpanded,
  onApplyPreset,
  transcriptData,
  issueCounts,
  audioRef,
  onTimeUpdate,
  availableErrorTypes
}) => {
  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Note Title */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">Note 1</h2>
        <p className="text-sm text-gray-600 mt-1">Speech transcript and analysis</p>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
          <ConversationView
            currentTime={currentTime}
            onSeek={onSeek}
            activeFilters={activeFilters}
            transcriptData={transcriptData}
          />
      </div>

      {/* Audio Controls */}
      <div className="border-t border-gray-200">
        <AudioControls
          isPlaying={isPlaying}
          onTogglePlayPause={onTogglePlayPause}
          onSeekTo={onSeekTo}
          onNextWord={onNextWord}
          onPrevWord={onPrevWord}
          currentTime={currentTime}
          duration={duration}
          activeFilters={activeFilters}
          onToggleFilter={onToggleFilter}
          onToggleCategory={onToggleCategory}
          categoryExpanded={categoryExpanded}
          onApplyPreset={onApplyPreset}
          issueCounts={issueCounts}
          audioRef={audioRef}
          onTimeUpdate={onTimeUpdate}
          availableErrorTypes={availableErrorTypes}
        />
      </div>
    </div>
  );
};

export default MainContent; 