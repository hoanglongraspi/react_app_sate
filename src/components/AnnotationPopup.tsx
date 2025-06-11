import React from 'react';
import { X, Clock, Play } from 'lucide-react';

export interface AnnotationDetails {
  type: string;
  content?: string;
  start: number;
  end: number;
  duration: number;
  position?: {
    x: number;
    y: number;
  };
  additionalInfo?: {
    words?: number[];
    wordIndex?: number;
    markLocation?: number;
    [key: string]: any;
  };
}

interface AnnotationPopupProps {
  annotation: AnnotationDetails | null;
  onClose: () => void;
  onSeek: (timestamp: string) => void;
}

const AnnotationPopup: React.FC<AnnotationPopupProps> = ({ 
  annotation, 
  onClose, 
  onSeek 
}) => {
  if (!annotation) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toFixed(2).padStart(5, '0')}`;
  };

  const getAnnotationTitle = (type: string) => {
    const titles: Record<string, string> = {
      'filler': 'Filler Word',
      'repetition': 'Repetition',
      'mispronunciation': 'Mispronunciation',
      'morpheme': 'Morpheme',
      'morpheme-omission': 'Morpheme Omission',
      'revision': 'Revision',
      'utterance-error': 'Utterance Error',
      'pause': 'Pause'
    };
    return titles[type] || type;
  };

  const getAnnotationColor = (type: string) => {
    const colors: Record<string, string> = {
      'pause': '#3B82F6',
      'filler': '#FCD34D',
      'repetition': '#FB7185',
      'mispronunciation': '#F87171',
      'morpheme': '#10B981',
      'morpheme-omission': '#EF4444',
      'revision': '#8B5CF6',
      'utterance-error': '#DC2626'
    };
    return colors[type] || '#6B7280';
  };

  const getAnnotationDescription = (type: string) => {
    const descriptions: Record<string, string> = {
      'filler': 'A filler word or sound that doesn\'t add meaning to the speech',
      'repetition': 'Repeated words or phrases in the speech',
      'mispronunciation': 'A word that was pronounced incorrectly',
      'morpheme': 'A morphological variation or inflection',
      'morpheme-omission': 'Missing morphological ending or component',
      'revision': 'Self-correction or revision in speech',
      'utterance-error': 'An error or interruption in the utterance',
      'pause': 'A pause or silence in the speech'
    };
    return descriptions[type] || 'Speech annotation';
  };

  const handlePlayFromStart = () => {
    onSeek(annotation.start.toString());
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Compact Popup */}
      <div 
        className="fixed z-50 bg-white rounded-md shadow-lg border border-gray-200 p-3 max-w-xs"
        style={{
          left: annotation.position?.x || '50%',
          top: (annotation.position?.y || 0) + 8,
          transform: 'translateX(-50%)'
        }}
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getAnnotationColor(annotation.type) }}
            />
            <h3 className="text-sm font-semibold text-gray-900">
              {getAnnotationTitle(annotation.type)}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Compact Timing Information */}
        <div className="space-y-1 text-xs text-gray-600">
          <div>
            <span className="font-medium">Start:</span> {formatTime(annotation.start)}
          </div>
          <div>
            <span className="font-medium">End:</span> {formatTime(annotation.end)}
          </div>
          <div>
            <span className="font-medium">Duration:</span> {annotation.duration.toFixed(2)}s
          </div>
        </div>

        {/* Content if available */}
        {annotation.content && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-600">
              <span className="font-medium">Content:</span> "{annotation.content}"
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AnnotationPopup; 