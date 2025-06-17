import React, { useState } from 'react';
import { Edit2, Plus, Trash2, Scissors } from 'lucide-react';
import { type Segment } from '../services/dataService';
import AnnotationPopup from './AnnotationPopup';
import EditTranscriptPopup from './EditTranscriptPopup';
import type { AnnotationDetails } from './AnnotationPopup';
import { annotationColors } from '../lib/annotationColors';

interface ConversationViewProps {
  currentTime: number;
  onSeek: (timestamp: string) => void;
  activeFilters: string[];
  transcriptData: Segment[];
  onTranscriptChange?: (updatedSegments: Segment[]) => void;
  isEditable?: boolean;
  onSeekTo?: (time: number) => void;
  isPlaying?: boolean;
  onTogglePlayPause?: () => void;
  duration?: number;
}

const ConversationView: React.FC<ConversationViewProps> = ({
  currentTime,
  onSeek,
  activeFilters,
  transcriptData,
  onTranscriptChange,
  isEditable,
  onSeekTo,
  isPlaying = false,
  onTogglePlayPause,
  duration = 0
}) => {
  const [selectedAnnotation, setSelectedAnnotation] = useState<AnnotationDetails | null>(null);
  const [editingSegment, setEditingSegment] = useState<{segment: Segment, index: number} | null>(null);
  const [splittingSegment, setSplittingSegment] = useState<number | null>(null);

  // Start editing a segment in popup
  const startEditingSegment = (segmentIndex: number) => {
    const segment = transcriptData[segmentIndex];
    setEditingSegment({ segment, index: segmentIndex });
  };

  // Toggle split mode for a segment
  const toggleSplitMode = (segmentIndex: number) => {
    setSplittingSegment(splittingSegment === segmentIndex ? null : segmentIndex);
  };

  // Split segment at a specific word index
  const splitSegmentAt = (segmentIndex: number, splitAfterWordIndex: number) => {
    if (!onTranscriptChange) return;
    
    const segment = transcriptData[segmentIndex];
    const splitPoint = splitAfterWordIndex + 1; // Split after this word
    
    if (splitPoint <= 0 || splitPoint >= segment.words.length) {
      // Can't split at the beginning or end
      return;
    }
    
    // Calculate timing for the split
    const splitTime = segment.words[splitPoint].start || segment.start;
    
    console.log(`\n=== SPLIT SEGMENT DEBUG ===`);
    console.log(`Original segment: "${segment.text}"`);
    console.log(`Split after word index: ${splitAfterWordIndex} ("${segment.words[splitAfterWordIndex].word}")`);
    console.log(`Split time: ${splitTime}`);
    console.log(`Original pauses:`, segment.pauses);
    
    // Helper function to determine which segment a pause belongs to
    const assignPauseToSegment = (pause: any, firstSegmentWords: any[], secondSegmentWords: any[]) => {
      // Check if pause occurs between words in the first segment
      for (let i = 0; i < firstSegmentWords.length - 1; i++) {
        const currentWord = firstSegmentWords[i];
        const nextWord = firstSegmentWords[i + 1];
        if (currentWord.end && nextWord.start && 
            pause.start >= currentWord.end && pause.end <= nextWord.start) {
          return 'first';
        }
      }
      
      // Check if pause occurs between words in the second segment
      for (let i = 0; i < secondSegmentWords.length - 1; i++) {
        const currentWord = secondSegmentWords[i];
        const nextWord = secondSegmentWords[i + 1];
        if (currentWord.end && nextWord.start && 
            pause.start >= currentWord.end && pause.end <= nextWord.start) {
          return 'second';
        }
      }
      
      // Check if pause occurs between the last word of first segment and first word of second segment
      const lastWordOfFirst = firstSegmentWords[firstSegmentWords.length - 1];
      const firstWordOfSecond = secondSegmentWords[0];
      if (lastWordOfFirst.end && firstWordOfSecond.start &&
          pause.start >= lastWordOfFirst.end && pause.end <= firstWordOfSecond.start) {
        return 'second'; // Assign to second segment as it appears at the beginning
      }
      
      // Fallback: assign based on timing
      if (pause.start < splitTime) {
        return 'first';
      } else {
        return 'second';
      }
    };
    
    // Create first segment (words 0 to splitAfterWordIndex)
    const firstSegment: Segment = {
      ...segment,
      text: segment.words.slice(0, splitPoint).map(w => w.word).join(' '),
      end: splitTime,
      words: segment.words.slice(0, splitPoint),
      // Distribute annotations to first segment based on word indices
      fillerwords: segment.fillerwords?.filter(f => {
        const wordInFirstSegment = segment.words.slice(0, splitPoint).some(w => 
          w.start === f.start && w.end === f.end
        );
        return wordInFirstSegment;
      }),
      repetitions: segment.repetitions?.filter(rep => 
        rep.words.some(wordIdx => wordIdx < splitPoint)
      ).map(rep => ({
        ...rep,
        words: rep.words.filter(wordIdx => wordIdx < splitPoint)
      })),
      morphemes: segment.morphemes?.filter((m: any) => (m.index || m.word_index || 0) < splitPoint),
      morpheme_omissions: segment.morpheme_omissions?.filter((mo: any) => (mo.word_index || 0) < splitPoint),
      mispronunciation: segment.mispronunciation?.filter((mp: any) => {
        const wordInFirstSegment = segment.words.slice(0, splitPoint).some(w => 
          w.start === mp.start && w.end === mp.end
        );
        return wordInFirstSegment;
      }),
      pauses: segment.pauses?.filter((p: any) => {
        const firstSegmentWords = segment.words.slice(0, splitPoint);
        const secondSegmentWords = segment.words.slice(splitPoint);
        const assignment = assignPauseToSegment(p, firstSegmentWords, secondSegmentWords);
        console.log(`  Pause ${p.start}-${p.end} assigned to: ${assignment}`);
        return assignment === 'first';
      }),
      revision: segment.revision?.filter((rev: any) => 
        rev.location && rev.location.some((wordIdx: number) => wordIdx < splitPoint)
      ).map((rev: any) => ({
        ...rev,
        location: rev.location.filter((wordIdx: number) => wordIdx < splitPoint)
      }))
    };
    
    // Create second segment (words splitPoint to end)
    const secondSegment: Segment = {
      ...segment,
      text: segment.words.slice(splitPoint).map(w => w.word).join(' '),
      start: splitTime,
      words: segment.words.slice(splitPoint),
      // Distribute annotations to second segment and adjust indices
      fillerwords: segment.fillerwords?.filter(f => {
        const wordInSecondSegment = segment.words.slice(splitPoint).some(w => 
          w.start === f.start && w.end === f.end
        );
        return wordInSecondSegment;
      }),
      repetitions: segment.repetitions?.filter(rep => 
        rep.words.some(wordIdx => wordIdx >= splitPoint)
      ).map(rep => ({
        ...rep,
        words: rep.words.filter(wordIdx => wordIdx >= splitPoint).map(wordIdx => wordIdx - splitPoint)
      })),
      morphemes: segment.morphemes?.filter((m: any) => (m.index || m.word_index || 0) >= splitPoint)
        .map((m: any) => ({
          ...m,
          index: m.index !== undefined ? m.index - splitPoint : m.index,
          word_index: m.word_index !== undefined ? m.word_index - splitPoint : m.word_index
        })),
      morpheme_omissions: segment.morpheme_omissions?.filter((mo: any) => (mo.word_index || 0) >= splitPoint)
        .map((mo: any) => ({
          ...mo,
          word_index: mo.word_index - splitPoint
        })),
      mispronunciation: segment.mispronunciation?.filter((mp: any) => {
        const wordInSecondSegment = segment.words.slice(splitPoint).some(w => 
          w.start === mp.start && w.end === mp.end
        );
        return wordInSecondSegment;
      }),
      pauses: segment.pauses?.filter((p: any) => {
        const firstSegmentWords = segment.words.slice(0, splitPoint);
        const secondSegmentWords = segment.words.slice(splitPoint);
        const assignment = assignPauseToSegment(p, firstSegmentWords, secondSegmentWords);
        console.log(`  Pause ${p.start}-${p.end} assigned to: ${assignment}`);
        return assignment === 'second';
      }),
      revision: segment.revision?.filter((rev: any) => 
        rev.location && rev.location.some((wordIdx: number) => wordIdx >= splitPoint)
      ).map((rev: any) => ({
        ...rev,
        location: rev.location.filter((wordIdx: number) => wordIdx >= splitPoint)
          .map((wordIdx: number) => wordIdx - splitPoint)
      }))
    };
    
    console.log(`\n=== SPLIT RESULTS ===`);
    console.log(`First segment pauses:`, firstSegment.pauses);
    console.log(`Second segment pauses:`, secondSegment.pauses);
    console.log(`Second segment text: "${secondSegment.text}"`);
    console.log(`Second segment first word: "${secondSegment.words[0]?.word}" starts at ${secondSegment.words[0]?.start}`);
    
    // Update the transcript with the split segments
    const updatedSegments = [...transcriptData];
    updatedSegments.splice(segmentIndex, 1, firstSegment, secondSegment);
    onTranscriptChange(updatedSegments);
    
    // Exit split mode
    setSplittingSegment(null);
  };

  // Save segment changes from popup
  const saveSegmentChanges = (updatedSegment: Segment) => {
    if (!editingSegment || !onTranscriptChange) return;
    
    const updatedSegments = [...transcriptData];
    updatedSegments[editingSegment.index] = updatedSegment;
    
    onTranscriptChange(updatedSegments);
    setEditingSegment(null);
  };

  // Close edit popup
  const closeEditPopup = () => {
    setEditingSegment(null);
  };

  // Add new segment
  const addNewSegment = (afterIndex: number) => {
    if (!onTranscriptChange) return;
    
    const newSegment: Segment = {
      text: 'New segment text',
      start: transcriptData[afterIndex]?.end || 0,
      end: (transcriptData[afterIndex]?.end || 0) + 5,
      speaker: transcriptData[afterIndex]?.speaker || 'Speaker 1',
      words: [{
        word: 'New',
        start: transcriptData[afterIndex]?.end || 0,
        end: (transcriptData[afterIndex]?.end || 0) + 1
      }, {
        word: 'segment',
        start: (transcriptData[afterIndex]?.end || 0) + 1,
        end: (transcriptData[afterIndex]?.end || 0) + 2
      }, {
        word: 'text',
        start: (transcriptData[afterIndex]?.end || 0) + 2,
        end: (transcriptData[afterIndex]?.end || 0) + 3
      }]
    };
    
    const updatedSegments = [...transcriptData];
    updatedSegments.splice(afterIndex + 1, 0, newSegment);
    onTranscriptChange(updatedSegments);
  };

  // Delete segment
  const deleteSegment = (segmentIndex: number) => {
    if (!onTranscriptChange) return;
    
    const updatedSegments = transcriptData.filter((_, index) => index !== segmentIndex);
    onTranscriptChange(updatedSegments);
  };

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
        // Match morphemes by word content instead of index (due to index misalignment in JSON)
        const morpheme = segment.morphemes?.find(m => {
          const cleanWord = word.word.replace(/[.,!?;:]$/, '');
          const cleanMorphemeWord = m.word.replace(/[.,!?;:]$/, '');
          return cleanWord === cleanMorphemeWord;
        });
        if (morpheme && morpheme.morpheme_form !== '<IRR>') {
          annotationDetails = {
            type: 'morpheme',
            content: `${morpheme.lemma} + ${morpheme.morpheme_form}`,
            start: word.start || 0,
            end: word.end || 0,
            duration: (word.end || 0) - (word.start || 0),
            position,
            additionalInfo: { 
              wordIndex,
              lemma: morpheme.lemma,
              morphemeForm: morpheme.morpheme_form,
              inflectionalMorpheme: morpheme.inflectional_morpheme,
              word: morpheme.word
            }
          };
        }
        break;

      case 'morpheme-omission':
        const morphemeOmission = segment.morpheme_omissions?.find((omission: any) => 
          omission.word_index === wordIndex
        );
        if (morphemeOmission) {
          annotationDetails = {
            type: 'morpheme-omission',
            content: `${morphemeOmission.original} → ${morphemeOmission.corrected}`,
            start: word.start || 0,
            end: word.end || 0,
            duration: (word.end || 0) - (word.start || 0),
            position,
            additionalInfo: { 
              wordIndex,
              original: morphemeOmission.original,
              corrected: morphemeOmission.corrected,
              morphemeCategory: morphemeOmission.morpheme_category
            }
          };
        }
        break;

      case 'revision':
        const revision = segment.revision?.find((rev: any) => 
          rev.location && rev.location.includes(wordIndex)
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
    pause: { duration: number; start?: number; end?: number; color: string },
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
      start: pause.start || 0,
      end: pause.end || 0,
      duration: pause.duration,
      position
    };

    setSelectedAnnotation(annotationDetails);
    // Automatically jump to the pause timestamp
    if (pause.start) {
      onSeek(pause.start.toString());
    }
  };

  // Check if a word should be highlighted based on active filters and annotations
  const getWordAnnotations = (segment: Segment, wordIndex: number) => {
    const annotations: Array<{type: string, color: string}> = [];

    // Check filler words
    if (activeFilters.includes('filler') && segment.fillerwords) {
      const word = segment.words[wordIndex];
      const isFillerWord = segment.fillerwords.some(filler => 
        filler.start === word.start && filler.end === word.end
      );
      if (isFillerWord) {
        annotations.push({ type: 'filler', color: annotationColors.filler });
      }
    }

    // Check repetitions
    if (activeFilters.includes('repetition') && segment.repetitions) {
      const isInRepetition = segment.repetitions.some(rep => 
        rep.words.includes(wordIndex)
      );
      if (isInRepetition) {
        annotations.push({ type: 'repetition', color: annotationColors.repetition });
      }
    }

    // Check mispronunciations
    if (activeFilters.includes('mispronunciation') && segment.mispronunciation) {
      const word = segment.words[wordIndex];
      const isMispronunciation = segment.mispronunciation.some((mp: any) => 
        mp.start === word.start && mp.end === word.end
      );
      if (isMispronunciation) {
        annotations.push({ type: 'mispronunciation', color: annotationColors.mispronunciation });
      }
    }

    // Check morphemes (only show if not irregular)
    if (activeFilters.includes('morpheme') && segment.morphemes) {
      const word = segment.words[wordIndex];
      // Match morphemes by word content instead of index (due to index misalignment in JSON)
      const hasMorpheme = segment.morphemes.some(m => {
        // Clean the word for comparison (remove punctuation)
        const cleanWord = word.word.replace(/[.,!?;:]$/, '');
        const cleanMorphemeWord = m.word.replace(/[.,!?;:]$/, '');
        return cleanWord === cleanMorphemeWord && m.morpheme_form !== '<IRR>';
      });
      if (hasMorpheme) {
        annotations.push({ type: 'morpheme', color: annotationColors.morpheme });
      }
    }

    // Check morpheme omissions
    if (activeFilters.includes('morpheme-omission') && segment.morpheme_omissions) {
      const hasMorphemeOmission = segment.morpheme_omissions.some((omission: any) => 
        omission.word_index === wordIndex
      );
      if (hasMorphemeOmission) {
        annotations.push({ type: 'morpheme-omission', color: annotationColors['morpheme-omission'] });
      }
    }

    // Check revisions
    if (activeFilters.includes('revision') && segment.revision) {
      const isInRevision = segment.revision.some((rev: any) => 
        rev.location && rev.location.includes(wordIndex)
      );
      if (isInRevision) {
        annotations.push({ type: 'revision', color: annotationColors.revision });
      }
    }

    return annotations;
  };

  // Check if there should be a pause annotation after a word
  const getPauseAfterWord = (segment: Segment, wordIndex: number) => {
    if (!activeFilters.includes('pause') || !segment.pauses || wordIndex >= segment.words.length - 1) return null;
    
    const currentWord = segment.words[wordIndex];
    const nextWord = segment.words[wordIndex + 1];
    
    if (!currentWord.end || !nextWord.start) return null;
    
    // Look for a pause that occurs between the current word and next word
    // Allow for small timing variations (within 0.1 seconds)
    const pause = segment.pauses.find((p: any) => {
      const pauseStartsAfterCurrentWord = p.start >= currentWord.end - 0.1;
      const pauseEndsBeforeNextWord = p.end <= nextWord.start + 0.1;
      const pauseIsInBetween = pauseStartsAfterCurrentWord && pauseEndsBeforeNextWord;
      
      return pauseIsInBetween;
    });
    
    return pause ? { duration: pause.duration, color: annotationColors.pause, start: pause.start, end: pause.end } : null;
  };

  // Check if there should be a pause annotation before the first word of a segment
  const getPauseBeforeSegment = (segment: Segment) => {
    if (!activeFilters.includes('pause') || !segment.pauses || segment.words.length === 0) return null;
    
    const firstWord = segment.words[0];
    if (!firstWord.start) return null;
    
    console.log(`\n=== CHECKING PAUSE BEFORE SEGMENT ===`);
    console.log(`Segment: "${segment.text}"`);
    console.log(`First word: "${firstWord.word}" starts at ${firstWord.start}`);
    console.log(`Segment start: ${segment.start}`);
    console.log(`All segment pauses:`, segment.pauses);
    
    // Look for pauses that end exactly when the first word starts (or very close)
    // This is the most common case for pauses at the beginning of segments after splits
    const pauseBeforeFirstWord = segment.pauses.find((p: any) => {
      const pauseEndsAtFirstWord = Math.abs(p.end - firstWord.start) < 0.1;
      console.log(`  Pause ${p.start}-${p.end} (${p.duration}s): ends at first word (${firstWord.start})? ${pauseEndsAtFirstWord} (diff: ${Math.abs(p.end - firstWord.start)})`);
      return pauseEndsAtFirstWord;
    });
    
    // If no pause ends exactly at the first word, look for any pause that starts at or after segment start and ends before first word
    if (!pauseBeforeFirstWord) {
      console.log(`No pause ending at first word, looking for pauses between segment start and first word...`);
      const pausesInRange = segment.pauses.filter((p: any) => {
        const startsAfterSegmentStart = p.start >= segment.start;
        const endsBeforeFirstWord = p.end <= firstWord.start;
        const inRange = startsAfterSegmentStart && endsBeforeFirstWord;
        console.log(`  Pause ${p.start}-${p.end}: starts after segment (${segment.start})? ${startsAfterSegmentStart}, ends before first word (${firstWord.start})? ${endsBeforeFirstWord}, in range? ${inRange}`);
        return inRange;
      });
      
      if (pausesInRange.length > 0) {
        // Get the latest pause (closest to first word)
        const latestPause = pausesInRange.reduce((latest: any, current: any) => 
          current.end > latest.end ? current : latest
        );
        console.log(`Selected latest pause in range:`, latestPause);
        return {
          duration: latestPause.duration,
          color: annotationColors.pause,
          start: latestPause.start,
          end: latestPause.end
        };
      }
      
      console.log(`No suitable pause found before first word`);
      return null;
    }
    
    console.log(`Selected pause ending at first word:`, pauseBeforeFirstWord);
    
    return pauseBeforeFirstWord ? { 
      duration: pauseBeforeFirstWord.duration, 
      color: annotationColors.pause,
      start: pauseBeforeFirstWord.start,
      end: pauseBeforeFirstWord.end
    } : null;
  };

  // Check if a word is currently being played
  const isWordActive = (word: { start?: number; end?: number }) => {
    if (!word.start || !word.end) return false;
    return currentTime >= word.start && currentTime <= word.end;
  };

  // Check if any word in a segment is currently active
  const isSegmentActive = (segment: Segment) => {
    return segment.words.some(word => isWordActive(word));
  };

  return (
    <div className="conversation-view">
      {transcriptData.length === 0 ? (
        // Welcome message when no data is loaded
        <div className="welcome-container">
          <div className="welcome-content">
            <div className="welcome-icon">
              <svg className="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="welcome-title">Welcome to SATE</h3>
            <p className="welcome-subtitle">Speech Annotation and Transcription Enhancer</p>
            <div className="welcome-description">
              <p>Get started by recording your speech or importing an audio file to analyze:</p>
              <ul className="welcome-features">
                <li>• Real-time speech pattern analysis</li>
                <li>• Identify Speech Errors and Language Errors</li>
                <li>• Track speech rate and fluency metrics</li>
                <li>• Export detailed analysis reports</li>
              </ul>
            </div>
            <div className="welcome-actions">
              <div className="action-hint">
                <span className="action-icon">🎤</span>
                <span>Click <strong>Record</strong> to start a new recording</span>
              </div>
              <div className="action-hint">
                <span className="action-icon">📁</span>
                <span>Click <strong>Import</strong> to upload an audio file</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Existing transcript display
        transcriptData.map((segment, segmentIndex) => {
          const hasUtteranceError = activeFilters.includes('utterance-error') && 
            segment['utterance-error'] && segment['utterance-error'].length > 0;
          
          // Check if this segment is being edited
          const isEditing = false; // Popup editing, no inline editing
          
          // Check if this segment is currently active (contains the playing word)
          const isActive = isSegmentActive(segment);
          
          return (
            <div key={segmentIndex}>
              <div 
                className={`conversation-segment ${hasUtteranceError ? 'utterance-error' : ''} ${isEditing ? 'editing' : ''} ${isActive ? 'active' : ''}`}
                onClick={hasUtteranceError && !isEditing ? (e) => {
                  const rect = (e.target as HTMLElement).getBoundingClientRect();
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
                {/* View Mode */}
                <div className="group">
                    <div className="segment-info">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="speaker">{segment.speaker}:</span>
                          <span className="time">[{segment.start.toFixed(1)}s - {segment.end.toFixed(1)}s]</span>
                        </div>
                        {isEditable && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEditingSegment(segmentIndex)}
                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit segment"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => toggleSplitMode(segmentIndex)}
                              className={`p-1 rounded transition-colors ${
                                splittingSegment === segmentIndex 
                                  ? 'text-orange-600 bg-orange-50' 
                                  : 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                              }`}
                              title={splittingSegment === segmentIndex ? "Exit split mode" : "Split segment"}
                            >
                              <Scissors className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => addNewSegment(segmentIndex)}
                              className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                              title="Add segment after"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteSegment(segmentIndex)}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Delete segment"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="segment-text">
                      {splittingSegment === segmentIndex && (
                        <div className="mb-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                          💡 Click between any two words to split the segment at that point
                        </div>
                      )}
                      
                      {/* Pause at the beginning of segment */}
                      {(() => {
                        const pauseBefore = getPauseBeforeSegment(segment);
                        if (pauseBefore) {
                          return (
                            <span 
                              className="pause-annotation"
                              style={{
                                color: pauseBefore.color,
                                fontWeight: 'bold',
                                margin: '0 4px 0 0',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                padding: '2px 4px',
                                backgroundColor: `${pauseBefore.color}20`
                              }}
                              title={`Click to view pause details: ${pauseBefore.duration}s`}
                              onClick={(e) => {
                                // Use the same pause that was found by getPauseBeforeSegment
                                if (pauseBefore.start && pauseBefore.end) {
                                  handlePauseClick({
                                    duration: pauseBefore.duration,
                                    start: pauseBefore.start,
                                    end: pauseBefore.end,
                                    color: annotationColors.pause
                                  }, e);
                                }
                              }}
                            >
                              [{pauseBefore.duration.toFixed(2)}s]
                            </span>
                          );
                        }
                        return null;
                      })()}
                      
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
                            
                            {/* Split indicator when in split mode (except after last word) */}
                            {splittingSegment === segmentIndex && wordIndex < segment.words.length - 1 && (
                              <span
                                className="split-indicator"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  splitSegmentAt(segmentIndex, wordIndex);
                                }}
                                style={{
                                  cursor: 'pointer',
                                  color: '#f97316',
                                  fontWeight: 'bold',
                                  margin: '0 2px',
                                  padding: '2px 4px',
                                  borderRadius: '4px',
                                  backgroundColor: 'rgba(249, 115, 22, 0.1)',
                                  border: '1px dashed #f97316',
                                  fontSize: '10px',
                                  verticalAlign: 'middle'
                                }}
                                title={`Split segment after "${word.word}"`}
                              >
                                ✂️
                              </span>
                            )}
                            
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
                                      end: pause.end,
                                      color: annotationColors.pause
                                    }, e);
                                  }
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
              </div>
            </div>
          );
        })
      )}
      
      {/* Annotation Popup */}
      <AnnotationPopup
        annotation={selectedAnnotation}
        onClose={() => setSelectedAnnotation(null)}
        onSeek={(timestamp) => {
          onSeek(timestamp);
          setSelectedAnnotation(null);
        }}
      />

      <EditTranscriptPopup
        isOpen={editingSegment !== null}
        onClose={closeEditPopup}
        segment={editingSegment?.segment || null}
        segmentIndex={editingSegment?.index || 0}
        onSave={saveSegmentChanges}
        currentTime={currentTime}
        onSeekTo={onSeekTo || (() => {})}
        isPlaying={isPlaying}
        onTogglePlayPause={onTogglePlayPause || (() => {})}
        duration={duration}
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
          margin-bottom: 24px;
          padding: 20px;
          background: #fafafa;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          transition: all 0.15s ease;
        }
        
        .conversation-segment:hover {
          background: #f5f5f5;
          border-color: #d1d5db;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }
        
        .conversation-segment.active {
          background: #eff6ff;
          border-color: #3b82f6;
          border-width: 2px;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
          transform: translateY(-1px);
        }
        
        .conversation-segment.active:hover {
          background: #dbeafe;
          border-color: #2563eb;
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
        
        /* Editing styles */
        .conversation-segment.editing {
          background: #f8fafc;
          border: 2px solid #3b82f6;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        }
        
        .edit-segment-form {
          background: white;
          border-radius: 6px;
          padding: 16px;
        }
        
        .edit-header {
          display: flex;
          justify-content: between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        /* Welcome message styles */
        .welcome-container {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          min-height: 400px;
          padding: 48px;
        }
        
        .welcome-content {
          text-align: center;
          max-width: 600px;
          margin: 0 auto;
        }
        
        .welcome-icon {
          margin-bottom: 24px;
          display: flex;
          justify-content: center;
        }
        
        .welcome-title {
          font-size: 32px;
          font-weight: 700;
          color: #1F2937;
          margin-bottom: 8px;
        }
        
        .welcome-subtitle {
          font-size: 18px;
          color: #6B7280;
          margin-bottom: 32px;
          font-weight: 500;
        }
        
        .welcome-description {
          margin-bottom: 40px;
        }
        
        .welcome-description p {
          font-size: 16px;
          color: #374151;
          margin-bottom: 20px;
          line-height: 1.6;
        }
        
        .welcome-features {
          list-style: none;
          padding: 0;
          margin: 0;
          text-align: left;
          display: inline-block;
        }
        
        .welcome-features li {
          font-size: 15px;
          color: #4B5563;
          margin-bottom: 8px;
          line-height: 1.5;
        }
        
        .welcome-actions {
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: center;
        }
        
        .action-hint {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 24px;
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          font-size: 15px;
          color: #374151;
          min-width: 300px;
          justify-content: flex-start;
        }
        
        .action-icon {
          font-size: 20px;
          width: 24px;
          text-align: center;
        }
        
        .action-hint strong {
          color: #1F2937;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}

export default ConversationView;