import React, { useState } from 'react';
import { type Segment } from '../services/dataService';
import AnnotationPopup from './AnnotationPopup';
import type { AnnotationDetails } from './AnnotationPopup';

interface ConversationViewProps {
  currentTime: number;
  onSeek: (timestamp: string) => void;
  activeFilters: string[];
  transcriptData: Segment[];
}

// Annotation colors mapping to match design
const annotationColors = {
  pause: '#3B82F6',      // Blue
  filler: '#FCD34D',     // Yellow (like in screenshot)
  repetition: '#FB7185', // Pink
  mispronunciation: '#F87171', // Red
  morpheme: '#10B981',   // Green
  'morpheme-omission': '#EF4444', // Red
  revision: '#8B5CF6',   // Purple
  'utterance-error': '#DC2626' // Red
};

const ConversationView: React.FC<ConversationViewProps> = ({
  currentTime,
  onSeek,
  activeFilters,
  transcriptData
}) => {
  const [selectedAnnotation, setSelectedAnnotation] = useState<AnnotationDetails | null>(null);

  // Handle annotation click
  const handleAnnotationClick = (
    type: string, 
    segment: Segment, 
    wordIndex: number, 
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    
    const word = segment.words[wordIndex];
    let annotationDetails: AnnotationDetails | null = null;

    // Get the position of the click for popup positioning (below the word)
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.bottom
    };

    // Create annotation details based on type
    switch (type) {
      case 'filler':
        const fillerWord = segment.fillerwords?.find(filler => 
          filler.start === word.start && filler.end === word.end
        );
        if (fillerWord) {
          annotationDetails = {
            type: 'filler',
            content: fillerWord.content,
            start: fillerWord.start,
            end: fillerWord.end,
            duration: fillerWord.duration,
            position,
            additionalInfo: { wordIndex }
          };
        }
        break;

      case 'repetition':
        const repetition = segment.repetitions?.find(rep => 
          rep.words.includes(wordIndex)
        );
        if (repetition) {
          annotationDetails = {
            type: 'repetition',
            content: repetition.content,
            start: word.start || 0,
            end: word.end || 0,
            duration: (word.end || 0) - (word.start || 0),
            position,
            additionalInfo: { 
              words: repetition.words,
              markLocation: repetition.mark_location 
            }
          };
        }
        break;

      case 'mispronunciation':
        const mispronunciation = segment.mispronunciation?.find(mp => 
          mp.start === word.start && mp.end === word.end
        );
        if (mispronunciation) {
          annotationDetails = {
            type: 'mispronunciation',
            content: word.word,
            start: mispronunciation.start,
            end: mispronunciation.end,
            duration: mispronunciation.end - mispronunciation.start,
            position,
            additionalInfo: { wordIndex }
          };
        }
        break;

      case 'morpheme':
        const morpheme = segment.morphemes?.find(morph => 
          morph.word_index === wordIndex
        );
        if (morpheme) {
          annotationDetails = {
            type: 'morpheme',
            content: word.word,
            start: word.start || 0,
            end: word.end || 0,
            duration: (word.end || 0) - (word.start || 0),
            position,
            additionalInfo: { wordIndex }
          };
        }
        break;

      case 'morpheme-omission':
        const morphemeOmission = segment.morpheme_omissions?.find(omission => 
          omission.word_index === wordIndex
        );
        if (morphemeOmission) {
          annotationDetails = {
            type: 'morpheme-omission',
            content: word.word,
            start: word.start || 0,
            end: word.end || 0,
            duration: (word.end || 0) - (word.start || 0),
            position,
            additionalInfo: { wordIndex }
          };
        }
        break;

      case 'revision':
        const revision = segment.revisions?.find(rev => 
          rev.location.includes(wordIndex)
        );
        if (revision) {
          annotationDetails = {
            type: 'revision',
            content: revision.content,
            start: word.start || 0,
            end: word.end || 0,
            duration: (word.end || 0) - (word.start || 0),
            position,
            additionalInfo: { 
              words: revision.location,
              wordIndex 
            }
          };
        }
        break;
    }

    if (annotationDetails) {
      setSelectedAnnotation(annotationDetails);
      // Automatically jump to the annotation timestamp
      onSeek(annotationDetails.start.toString());
    }
  };

  // Handle pause annotation click
  const handlePauseClick = (
    pause: { duration: number; start: number; end: number },
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.bottom
    };

    const annotationDetails: AnnotationDetails = {
      type: 'pause',
      start: pause.start,
      end: pause.end,
      duration: pause.duration,
      position
    };

    setSelectedAnnotation(annotationDetails);
    // Automatically jump to the pause timestamp
    onSeek(pause.start.toString());
  };

  // Check if a word should be highlighted based on active filters and annotations
  const getWordAnnotations = (segment: Segment, wordIndex: number) => {
    const annotations: Array<{type: string, color: string}> = [];

    // Check filler words
    if (activeFilters.includes('filler')) {
      const word = segment.words[wordIndex];
      const isFillerWord = segment.fillerwords.some(filler => 
        filler.start === word.start && filler.end === word.end
      );
      if (isFillerWord) {
        annotations.push({ type: 'filler', color: annotationColors.filler });
      }
    }

    // Check repetitions
    if (activeFilters.includes('repetition')) {
      const isInRepetition = segment.repetitions.some(rep => 
        rep.words.includes(wordIndex)
      );
      if (isInRepetition) {
        annotations.push({ type: 'repetition', color: annotationColors.repetition });
      }
    }

    // Check mispronunciations
    if (activeFilters.includes('mispronunciation')) {
      const word = segment.words[wordIndex];
      const isMispronunciation = segment.mispronunciation.some(mp => 
        mp.start === word.start && mp.end === word.end
      );
      if (isMispronunciation) {
        annotations.push({ type: 'mispronunciation', color: annotationColors.mispronunciation });
      }
    }

    // Check morphemes
    if (activeFilters.includes('morpheme')) {
      const hasMorpheme = segment.morphemes.some(morph => 
        morph.word_index === wordIndex
      );
      if (hasMorpheme) {
        annotations.push({ type: 'morpheme', color: annotationColors.morpheme });
      }
    }

    // Check morpheme omissions
    if (activeFilters.includes('morpheme-omission')) {
      const hasMorphemeOmission = segment.morpheme_omissions.some(omission => 
        omission.word_index === wordIndex
      );
      if (hasMorphemeOmission) {
        annotations.push({ type: 'morpheme-omission', color: annotationColors['morpheme-omission'] });
      }
    }

    // Check revisions
    if (activeFilters.includes('revision')) {
      const isInRevision = segment.revisions.some(rev => 
        rev.location.includes(wordIndex)
      );
      if (isInRevision) {
        annotations.push({ type: 'revision', color: annotationColors.revision });
      }
    }

    return annotations;
  };

  // Check if there should be a pause annotation after a word
  const getPauseAfterWord = (segment: Segment, wordIndex: number) => {
    if (!activeFilters.includes('pause') || wordIndex >= segment.words.length - 1) return null;
    
    const currentWord = segment.words[wordIndex];
    const nextWord = segment.words[wordIndex + 1];
    
    if (!currentWord.end || !nextWord.start) return null;
    
    const pause = segment.pauses.find(p => 
      p.start === currentWord.end && p.end === nextWord.start
    );
    
    return pause ? { duration: pause.duration, color: annotationColors.pause } : null;
  };

  // Check if a word is currently being played
  const isWordActive = (word: { start?: number; end?: number }) => {
    if (!word.start || !word.end) return false;
    return currentTime >= word.start && currentTime <= word.end;
  };

  return (
    <div className="conversation-view">
      {transcriptData.map((segment, segmentIndex) => {
        // Check if segment has utterance error
        const hasUtteranceError = activeFilters.includes('utterance-error') && segment.utterance_error;
        
        return (
          <div 
            key={segmentIndex} 
            className={`conversation-segment ${hasUtteranceError ? 'utterance-error' : ''}`}
            style={hasUtteranceError ? { backgroundColor: `${annotationColors['utterance-error']}20` } : {}}
            onClick={hasUtteranceError ? (e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const position = {
                x: rect.left + rect.width / 2,
                y: rect.bottom
              };
              
              setSelectedAnnotation({
                type: 'utterance-error',
                content: segment.text,
                start: segment.start,
                end: segment.end,
                duration: segment.end - segment.start,
                position,
                additionalInfo: { segmentIndex }
              });
              // Automatically jump to the utterance error timestamp
              onSeek(segment.start.toString());
            } : undefined}
          >
            <div className="segment-info">
              <span className="speaker">{segment.speaker}:</span>
              <span className="time">[{segment.start.toFixed(1)}s - {segment.end.toFixed(1)}s]</span>
            </div>
            
            <div className="segment-text">
              {segment.words.map((word, wordIndex) => {
                const annotations = getWordAnnotations(segment, wordIndex);
                const pauseAfter = getPauseAfterWord(segment, wordIndex);
                const isActive = isWordActive(word);
                
                return (
                  <React.Fragment key={wordIndex}>
                    <span
                      className={`word ${annotations.length > 0 ? 'annotated' : ''} ${isActive ? 'active' : ''}`}
                      onClick={(e) => {
                        if (annotations.length > 0) {
                          // If word has annotations, show popup for the first annotation
                          handleAnnotationClick(annotations[0].type, segment, wordIndex, e);
                        } else if (word.start) {
                          // If no annotations, just seek to the word
                          onSeek(word.start.toString());
                        }
                      }}
                      style={{
                        cursor: (annotations.length > 0 || word.start) ? 'pointer' : 'default',
                        backgroundColor: isActive 
                          ? '#3B82F6' 
                          : annotations.length > 0 ? `${annotations[0].color}30` : 'transparent',
                        color: isActive ? 'white' : 'inherit',
                        borderBottom: annotations.length > 0 && !isActive ? `2px solid ${annotations[0].color}` : 'none',
                        padding: '3px 6px',
                        margin: '0 1px',
                        borderRadius: '4px',
                        fontWeight: isActive ? '600' : 'normal'
                      }}
                      title={annotations.length > 0 
                        ? `Click to view ${annotations.map(a => a.type).join(', ')} details`
                        : word.start ? 'Click to play from here' : ''
                      }
                    >
                      {word.word}
                    </span>
                    
                    {pauseAfter && (
                      <span 
                        className="pause-annotation"
                        style={{
                          color: pauseAfter.color,
                          fontWeight: 'bold',
                          margin: '0 4px',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          padding: '2px 4px'
                        }}
                        title={`Click to view pause details: ${pauseAfter.duration}s`}
                        onClick={(e) => {
                          const currentWord = segment.words[wordIndex];
                          const nextWord = segment.words[wordIndex + 1];
                          const pause = segment.pauses?.find(p => 
                            p.start === currentWord.end && p.end === nextWord.start
                          );
                          if (pause) {
                            handlePauseClick({
                              duration: pause.duration,
                              start: pause.start,
                              end: pause.end
                            }, e);
                          }
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.backgroundColor = `${pauseAfter.color}20`;
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.backgroundColor = 'transparent';
                        }}
                      >
                        [{pauseAfter.duration.toFixed(2)}s]
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        );
      })}
      
      {/* Annotation Popup */}
      <AnnotationPopup
        annotation={selectedAnnotation}
        onClose={() => setSelectedAnnotation(null)}
        onSeek={(timestamp) => {
          onSeek(timestamp);
          setSelectedAnnotation(null);
        }}
      />
      
      <style>{`
        .conversation-view {
          padding: 32px 48px;
          flex: 1;
          overflow-y: auto;
          background: white;
          height: 100%;
        }
        
        .conversation-segment {
          margin-bottom: 32px;
        }
        
        .conversation-segment.utterance-error {
          background: rgba(239, 68, 68, 0.05);
          border-left: 4px solid ${annotationColors['utterance-error']};
          padding: 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        
        .conversation-segment.utterance-error:hover {
          background: rgba(239, 68, 68, 0.1);
        }
        
        .segment-info {
          margin-bottom: 16px;
        }
        
        .speaker {
          font-weight: 600;
          color: #374151;
          font-size: 14px;
          display: block;
          margin-bottom: 8px;
        }
        
        .time {
          font-size: 12px;
          color: #6B7280;
        }
        
        .segment-text {
          line-height: 1.8;
          font-size: 16px;
          color: #111827;
        }
        
        .word {
          transition: all 0.15s ease;
          display: inline;
          padding: 2px 0;
        }
        
        .word.annotated {
          padding: 3px 6px;
          border-radius: 4px;
          margin: 0 1px;
        }
        
        .word.active {
          background-color: #3B82F6 !important;
          color: white !important;
          font-weight: 600;
          transform: scale(1.05);
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
          z-index: 10;
          position: relative;
        }
        
        .word:hover:not(.active) {
          background-color: rgba(59, 130, 246, 0.1) !important;
          cursor: pointer;
        }
        

        
        .pause-annotation {
          font-size: 12px;
          font-weight: 500;
          margin: 0 4px;
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}

export default ConversationView;