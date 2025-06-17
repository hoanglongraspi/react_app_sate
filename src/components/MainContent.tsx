import React, { useState } from 'react';
import ConversationView from './ConversationView';
import AudioControls from './AudioControls';
import { Edit2, Check, X, Save } from 'lucide-react';
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
  showControls?: boolean;
  recordingName?: string;
  onRecordingNameChange?: (newName: string) => void;
  createdDate?: string;
  isEditable?: boolean;
  onTranscriptChange?: (updatedSegments: Segment[]) => void;
  onSaveChanges?: () => void;
  onCancelEdit?: () => void;
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
  availableErrorTypes,
  showControls = true,
  recordingName,
  onRecordingNameChange,
  createdDate,
  isEditable,
  onTranscriptChange,
  onSaveChanges,
  onCancelEdit
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');

  const handleEditStart = () => {
    setEditedName(recordingName || 'Untitled Report');
    setIsEditing(true);
  };

  const handleEditSave = () => {
    if (onRecordingNameChange && editedName.trim()) {
      onRecordingNameChange(editedName.trim());
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditedName('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSave();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return new Date().toLocaleDateString();
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Report Header - Only show when there's data */}
      {showControls && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between group">
            <div className="flex-1">
              {/* Report Title */}
              <div className="flex items-center gap-2 mb-2">
                {isEditing ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={handleKeyPress}
                      className="text-xl font-semibold text-gray-800 bg-white border border-gray-300 rounded px-2 py-1 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                      placeholder="Enter report name"
                    />
                    <button
                      onClick={handleEditSave}
                      className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded"
                      title="Save"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleEditCancel}
                      className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1">
                    <h2 className="text-xl font-semibold text-gray-800">
                      {recordingName || "Untitled Report"}
                    </h2>
                    <button
                      onClick={handleEditStart}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Edit report name"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              
              {/* Report Metadata */}
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <span className="font-medium">Created:</span>
                  <span>{formatDate(createdDate)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">Duration:</span>
                  <span>{formatDuration(duration)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">Type:</span>
                  <span>Speech Analysis Report</span>
                </div>
              </div>
            </div>
            
            {/* Edit Mode Toggle */}
            <div className="flex items-center gap-2">
              {isEditable ? (
                <>
                  <button
                    onClick={onSaveChanges}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    title="Save changes"
                  >
                    <Save className="w-4 h-4 inline mr-1" />
                    Save
                  </button>
                  <button
                    onClick={onCancelEdit}
                    className="px-3 py-1 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                    title="Cancel editing"
                  >
                    <X className="w-4 h-4 inline mr-1" />
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onTranscriptChange && onTranscriptChange(transcriptData)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 rounded-md transition-colors"
                  title="Enable edit mode"
                >
                  <Edit2 className="w-4 h-4 inline mr-1" />
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
          <ConversationView
            currentTime={currentTime}
            onSeek={onSeek}
            activeFilters={activeFilters}
            transcriptData={transcriptData}
            isEditable={isEditable}
            onTranscriptChange={onTranscriptChange}
            onSeekTo={onSeekTo}
            isPlaying={isPlaying}
            onTogglePlayPause={onTogglePlayPause}
            duration={duration}
          />
      </div>

      {/* Audio Controls - Only show when showControls is true */}
      {showControls && (
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
      )}
    </div>
  );
};

export default MainContent; 