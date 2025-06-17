// Define the main data structure types
export interface Word {
  word: string;
  start: number;
  end: number;
}

export interface FillerWord {
  content: string;
  duration: number;
  start: number;
  end: number;
}

export interface Repetition {
  content: string;
  words: number[];
  mark_location?: number;
}

export interface Segment {
  text: string;
  start: number;
  end: number;
  speaker: string;
  words: Word[];
  fillerwords?: FillerWord[];
  repetitions?: Repetition[];
  pauses?: any[];
  'utterance-error'?: any[];
  mispronunciation?: any[];
  morpheme_omissions?: any[];
  revision?: any[];
  morphemes?: any[];
}

export interface TranscriptData {
  segments: Segment[];
}

export interface IssueCounts {
  pause: number;
  filler: number;
  repetition: number;
  mispronunciation: number;
  morpheme: number;
  'morpheme-omission': number;
  revision: number;
  'utterance-error': number;
}

// Helper function to count errors in segments
const countErrors = (segments: Segment[]): IssueCounts => {
  const counts: IssueCounts = {
    pause: 0,
    filler: 0,
    repetition: 0,
    mispronunciation: 0,
    morpheme: 0,
    'morpheme-omission': 0,
    revision: 0,
    'utterance-error': 0
  };

  segments.forEach(segment => {
    // Count filler words
    if (segment.fillerwords) {
    counts.filler += segment.fillerwords.length;
    }

    // Count repetitions
    if (segment.repetitions) {
    counts.repetition += segment.repetitions.length;
    }

    // Count pauses
    if (segment.pauses) {
      counts.pause += segment.pauses.length;
    }

    // Count utterance errors
    if (segment['utterance-error']) {
      counts['utterance-error'] += segment['utterance-error'].length;
    }

    // Count mispronunciations
    if (segment.mispronunciation) {
    counts.mispronunciation += segment.mispronunciation.length;
    }

    // Count morpheme omissions
    if (segment.morpheme_omissions) {
      counts['morpheme-omission'] += segment.morpheme_omissions.length;
    }

    // Count morphemes (inflectional morphemes)
    if (segment.morphemes) {
      // Only count morphemes that have visible morpheme forms (not irregular)
      const visibleMorphemes = segment.morphemes.filter((morpheme: any) => 
        morpheme.morpheme_form && morpheme.morpheme_form !== '<IRR>'
      );
      counts.morpheme += visibleMorphemes.length;
    }

    // Count revisions
    if (segment.revision) {
      counts.revision += segment.revision.length;
    }
  });

  return counts;
};

// API processing function
export const processAudioFile = async (
  audioFile: File,
  device: string = 'cuda',
  pauseThreshold: number = 0.25,
  onProgress?: (progress: number) => void
): Promise<{ data: TranscriptData; errorCounts: IssueCounts }> => {
  try {
    console.log('Processing audio file:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type,
      lastModified: audioFile.lastModified
    });

    // Validate file before sending
    if (audioFile.size === 0) {
      throw new Error('Audio file is empty');
    }

    if (audioFile.size > 50 * 1024 * 1024) { // 50MB limit
      throw new Error('Audio file is too large (max 50MB)');
    }

    // Validate file type
    const validTypes = [
      'audio/wav', 'audio/wave', 'audio/x-wav',
      'audio/mpeg', 'audio/mp3',
      'audio/mp4', 'audio/m4a',
      'audio/ogg', 'audio/webm',
      'audio/flac', 'audio/aac'
    ];
    
    if (!validTypes.includes(audioFile.type) && !audioFile.name.match(/\.(wav|mp3|m4a|ogg|webm|flac|aac)$/i)) {
      throw new Error(`Unsupported audio format: ${audioFile.type || 'unknown'}. Please use WAV, MP3, M4A, OGG, WebM, FLAC, or AAC files.`);
    }

    // Try with the specified device first
    let result;
    try {
      result = await makeAPIRequest(audioFile, device, pauseThreshold, onProgress);
    } catch (error) {
      // If CUDA fails with out of memory, try CPU as fallback
      if (device === 'cuda' && error instanceof Error && 
          (error.message.includes('out of memory') || error.message.includes('CUDA failed'))) {
        console.warn('CUDA out of memory, falling back to CPU processing...');
        if (onProgress) onProgress(10); // Reset progress for retry
        result = await makeAPIRequest(audioFile, 'cpu', pauseThreshold, onProgress);
      } else {
        throw error;
      }
    }

    return result;

  } catch (error) {
    console.error('API processing failed:', error);
    throw new Error(
      error instanceof Error 
        ? `Failed to process audio: ${error.message}`
        : 'Failed to process audio file'
    );
  }
};

// Helper function to make the actual API request
const makeAPIRequest = async (
  audioFile: File,
  device: string,
  pauseThreshold: number,
  onProgress?: (progress: number) => void
): Promise<{ data: TranscriptData; errorCounts: IssueCounts }> => {
    // Create FormData for the API request
    const formData = new FormData();
    formData.append('audio_file', audioFile);
    formData.append('device', device);
    formData.append('pause_threshold', pauseThreshold.toString());

  console.log('Sending request to API with FormData:', {
    audioFileName: audioFile.name,
    audioFileSize: audioFile.size,
    audioFileType: audioFile.type,
    device,
    pauseThreshold
  });

    // Start progress tracking
    if (onProgress) {
      onProgress(10); // Initial progress
    }

    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

    let response: Response;
    try {
      response = await fetch('https://Sven33-SATE.hf.space/process', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        // Don't set Content-Type header - let browser set it automatically for FormData
        // This ensures proper boundary is set for multipart/form-data
        headers: {
          // Add any additional headers that might be required by the API
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - file upload took too long');
      }
      throw error;
    }

  console.log('API Response:', {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries())
  });

    if (onProgress) {
      onProgress(80); // Most of the work is done
    }
    
    if (!response.ok) {
    // Try to get error details from response
    let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
    try {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      if (errorText) {
        errorMessage += ` - ${errorText}`;
      }
    } catch (e) {
      console.error('Could not read error response:', e);
    }
    throw new Error(errorMessage);
    }
    
    const result = await response.json();
  
  console.log('API Response Data:', result);
    
    if (onProgress) {
      onProgress(90); // Parsing done
    }

    // Validate the response structure
    if (!result || !result.segments) {
      throw new Error('Invalid response format from API');
    }

    // Count errors/issues in the data
    const errorCounts = countErrors(result.segments);

    if (onProgress) {
      onProgress(100); // Complete
    }

    return {
      data: result as TranscriptData,
      errorCounts
    };
};

// Function to get available error types from processed data
export const getErrorAnnotations = (segments: Segment[]): string[] => {
  const errorTypes = new Set<string>();

  segments.forEach(segment => {
    if (segment.fillerwords && segment.fillerwords.length > 0) {
      errorTypes.add('filler');
    }
    if (segment.repetitions && segment.repetitions.length > 0) {
      errorTypes.add('repetition');
    }
    if (segment.pauses && segment.pauses.length > 0) {
      errorTypes.add('pause');
    }
    if (segment['utterance-error'] && segment['utterance-error'].length > 0) {
      errorTypes.add('utterance-error');
    }
    if (segment.mispronunciation && segment.mispronunciation.length > 0) {
      errorTypes.add('mispronunciation');
    }
    if (segment.morpheme_omissions && segment.morpheme_omissions.length > 0) {
      errorTypes.add('morpheme-omission');
    }
    // Add morpheme detection - check for inflectional morphemes
    if (segment.morphemes && segment.morphemes.length > 0) {
      // Only add if there are morphemes that aren't irregular (have actual morpheme forms)
      const hasVisibleMorphemes = segment.morphemes.some((morpheme: any) => 
        morpheme.morpheme_form && morpheme.morpheme_form !== '<IRR>'
      );
      if (hasVisibleMorphemes) {
        errorTypes.add('morpheme');
      }
    }
    if (segment.revision && segment.revision.length > 0) {
      errorTypes.add('revision');
    }
  });

  return Array.from(errorTypes);
};

import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/react-query';

// Enhanced analysis interface for comprehensive speech analysis
export interface SpeechAnalysis {
  errorCounts: IssueCounts;
  totalWords: number;
  totalDuration: number;
  speakingRate: number; // words per minute
  errorRate: number; // errors per 100 words
  availableErrorTypes: string[];
  segmentCount: number;
  speakerCount: number;
  // Language analysis metrics
  ntw: number; // Number of Total Words
  ndw: number; // Number of Different Words
  mluw: number; // Mean Length of Utterance in Words
  mlum: number; // Mean Length of Utterance in Morphemes
  numberOfPauses: number; // Total number of pauses
}

// Function to split a segment into utterances based on sentence boundaries
const splitSegmentIntoUtterances = (segment: Segment): Array<{words: Word[], morphemes?: any[]}> => {
  const utterances: Array<{words: Word[], morphemes?: any[]}> = [];
  let currentUtterance: Word[] = [];
  
  console.log(`\n--- Splitting segment: "${segment.text}" ---`);
  console.log(`Total words in segment: ${segment.words.length}`);
  
  segment.words.forEach((word, index) => {
    currentUtterance.push(word);
    console.log(`  Word ${index}: "${word.word}" - Current utterance length: ${currentUtterance.length}`);
    
    // Check if this word ends a sentence (contains period, question mark, or exclamation)
    if (word.word.includes('.') || word.word.includes('?') || word.word.includes('!')) {
      console.log(`    -> Sentence ending detected: "${word.word}"`);
      
      // Only create utterance if it has meaningful words (not just punctuation/fillers)
      const meaningfulWords = currentUtterance.filter(w => {
        const cleanWord = w.word.toLowerCase().replace(/[.,!?;:]/g, '');
        return cleanWord && 
               cleanWord !== 'um' && 
               cleanWord !== 'uh' && 
               !w.word.includes('[') && 
               !w.word.includes(']');
      });
      
      console.log(`    -> Meaningful words in utterance: ${meaningfulWords.length}`);
      console.log(`    -> Utterance text: "${currentUtterance.map(w => w.word).join(' ')}"`);
      
      if (meaningfulWords.length > 0) {
        // Find morphemes that belong to this utterance
        // Match morphemes by word content instead of index (due to index misalignment in JSON)
        const utteranceMorphemes = segment.morphemes?.filter((morpheme: any) => {
          return currentUtterance.some(utteranceWord => {
            const cleanUtteranceWord = utteranceWord.word.replace(/[.,!?;:]$/, '');
            const cleanMorphemeWord = morpheme.word.replace(/[.,!?;:]$/, '');
            return cleanUtteranceWord === cleanMorphemeWord;
          });
        }) || [];
        
        utterances.push({
          words: [...currentUtterance],
          morphemes: utteranceMorphemes
        });
        
        console.log(`    -> Created utterance #${utterances.length}: "${currentUtterance.map(w => w.word).join(' ')}"`);
      }
      
      currentUtterance = [];
    }
  });
  
  // Add remaining words as final utterance if any
  if (currentUtterance.length > 0) {
    console.log(`  -> Processing remaining words: "${currentUtterance.map(w => w.word).join(' ')}"`);
    
    const meaningfulWords = currentUtterance.filter(w => {
      const cleanWord = w.word.toLowerCase().replace(/[.,!?;:]/g, '');
      return cleanWord && 
             cleanWord !== 'um' && 
             cleanWord !== 'uh' && 
             !w.word.includes('[') && 
             !w.word.includes(']');
    });
    
    if (meaningfulWords.length > 0) {
      // Find morphemes for remaining words
      // Match morphemes by word content instead of index (due to index misalignment in JSON)
      const utteranceMorphemes = segment.morphemes?.filter((morpheme: any) => {
        return currentUtterance.some(utteranceWord => {
          const cleanUtteranceWord = utteranceWord.word.replace(/[.,!?;:]$/, '');
          const cleanMorphemeWord = morpheme.word.replace(/[.,!?;:]$/, '');
          return cleanUtteranceWord === cleanMorphemeWord;
        });
      }) || [];
      
      utterances.push({
        words: [...currentUtterance],
        morphemes: utteranceMorphemes
      });
      
      console.log(`  -> Created final utterance #${utterances.length}: "${currentUtterance.map(w => w.word).join(' ')}"`);
    }
  }
  
  console.log(`--- Final result: ${utterances.length} utterances created ---\n`);
  
  return utterances;
};

// Calculate comprehensive speech analysis
export const calculateSpeechAnalysis = (transcriptData: TranscriptData): SpeechAnalysis => {
  const errorCounts = countErrors(transcriptData.segments);
  const totalWords = transcriptData.segments.reduce((total, segment) => total + segment.words.length, 0);
  const totalDuration = transcriptData.segments.length > 0 
    ? Math.max(...transcriptData.segments.map(s => s.end)) 
    : 0;
  const speakingRate = totalDuration > 0 ? (totalWords / totalDuration) * 60 : 0;
  const totalErrors = Object.values(errorCounts).reduce((sum, count) => sum + count, 0);
  const errorRate = totalWords > 0 ? (totalErrors / totalWords) * 100 : 0;
  const availableErrorTypes = getErrorAnnotations(transcriptData.segments);
  const speakers = new Set(transcriptData.segments.map(s => s.speaker));

  // Filter out filler words and punctuation from word counting
  const isFillerOrPunctuation = (word: string): boolean => {
    const cleanWord = word.toLowerCase().replace(/[.,!?;:]/g, '');
    return !cleanWord || 
           cleanWord === 'um' || 
           cleanWord === 'uh' || 
           word.includes('[') || 
           word.includes(']') ||
           /^[.,!?;:]+$/.test(word);
  };

  // Calculate Number of Total Words (NTW) and Number of Different Words (NDW)
  let ntw = 0;
  const allWords = new Set<string>();
  
  transcriptData.segments.forEach(segment => {
    segment.words.forEach((word) => {
      if (!isFillerOrPunctuation(word.word)) {
        ntw++;
        
        // For NDW: Use lemma if morpheme exists and morpheme_form is not <IRR>, otherwise use word
        let wordForNDW = word.word.toLowerCase().replace(/[.,!?;:]/g, '');
        
        // Check if this word has a morpheme annotation
        // Match morphemes by word content instead of index (due to index misalignment in JSON)
        const morpheme = segment.morphemes?.find((m: any) => {
          const cleanWord = word.word.replace(/[.,!?;:]$/, '');
          const cleanMorphemeWord = m.word.replace(/[.,!?;:]$/, '');
          return cleanWord === cleanMorphemeWord;
        });
        if (morpheme && morpheme.lemma && morpheme.morpheme_form && morpheme.morpheme_form !== '<IRR>') {
          wordForNDW = morpheme.lemma.toLowerCase();
        }
        
        allWords.add(wordForNDW);
      }
    });
  });

  // Calculate Number of Different Words (NDW)
  const ndw = allWords.size;

  // Calculate Mean Length of Utterance in Words (MLUw) using sentence-based utterances
  // Filter to child segments and split into utterances
  const childSegments = transcriptData.segments.filter(segment => 
    segment.speaker !== 'Examiner' && 
    segment.speaker !== 'EXAMINER' && 
    segment.words.some(word => !isFillerOrPunctuation(word.word))
  );
  
  // Split segments into utterances and collect all utterances
  const allUtterances: Array<{words: Word[], morphemes?: any[]}> = [];
  childSegments.forEach(segment => {
    const utterances = splitSegmentIntoUtterances(segment);
    allUtterances.push(...utterances);
  });
  
  // Debug logging to verify sentence splitting
  console.log(`Language Analysis Debug:
    - Child segments: ${childSegments.length}
    - Total utterances after splitting: ${allUtterances.length}
    - Utterances per segment: ${allUtterances.length / Math.max(childSegments.length, 1)}`);
  
  // Log first few utterances for verification
  allUtterances.slice(0, 5).forEach((utterance, i) => {
    const utteranceText = utterance.words.map(w => w.word).join(' ');
    const validWordCount = utterance.words.filter(word => !isFillerOrPunctuation(word.word)).length;
    console.log(`  Utterance ${i + 1}: "${utteranceText}" (${validWordCount} valid words)`);
  });
  
  // Calculate MLUw from utterances
  let totalUtteranceWords = 0;
  allUtterances.forEach(utterance => {
    const validWords = utterance.words.filter(word => !isFillerOrPunctuation(word.word));
    totalUtteranceWords += validWords.length;
  });
  
  const mluw = allUtterances.length > 0 ? totalUtteranceWords / allUtterances.length : 0;

  // Calculate Mean Length of Utterance in Morphemes (MLUm) using utterances
  let totalMorphemes = 0;
  
  allUtterances.forEach(utterance => {
    let utteranceMorphemes = 0;
    
    // Count morphemes for each valid word in the utterance
    const validWords = utterance.words.filter(word => !isFillerOrPunctuation(word.word));
    
    validWords.forEach((validWord, _) => {
      // Check if this word has a morpheme annotation with non-IRR morpheme_form
      // Match morphemes by word content instead of index (due to index misalignment in JSON)
      const morpheme = utterance.morphemes?.find((m: any) => {
        const cleanWord = validWord.word.replace(/[.,!?;:]$/, '');
        const cleanMorphemeWord = m.word.replace(/[.,!?;:]$/, '');
        return cleanWord === cleanMorphemeWord;
      });
      
      if (morpheme && morpheme.morpheme_form && morpheme.morpheme_form !== '<IRR>') {
        // Word with morpheme annotation (non-IRR) = 2 morphemes (lemma + morpheme_form)
        utteranceMorphemes += 2;
      } else {
        // Regular word or IRR morpheme = 1 morpheme
        utteranceMorphemes += 1;
      }
    });
    
    totalMorphemes += utteranceMorphemes;
  });
  
  // MLUm is total morphemes divided by number of utterances
  const mlum = allUtterances.length > 0 ? totalMorphemes / allUtterances.length : 0;

  // Calculate total number of pauses
  const numberOfPauses = transcriptData.segments.reduce((total, segment) => {
    return total + (segment.pauses?.length || 0);
  }, 0);

  // Debug logging for comprehensive feature verification
  console.log(`
=== LANGUAGE ANALYSIS TEST RESULTS ===
1. NTW (Number of Total Words): ${ntw}
   - Excludes: fillers (um, uh, [UM], [UH]), punctuation (., ,), empty words
   
2. NDW (Number of Different Words): ${ndw}
   - Uses lemma when morpheme_form exists and ≠ <IRR>
   - Uses word otherwise
   
3. MLUw (Mean Length of Utterance in Words): ${mluw.toFixed(2)}
   - Total utterances: ${allUtterances.length}
   - Total utterance words: ${totalUtteranceWords}
   - Calculation: ${totalUtteranceWords} ÷ ${allUtterances.length} = ${mluw.toFixed(2)}
   
4. MLUm (Mean Length of Utterance in Morphemes): ${mlum.toFixed(2)}
   - Total morphemes: ${totalMorphemes}
   - Words with morpheme_form ≠ <IRR> = 2 morphemes
   - Other words = 1 morpheme
   - Calculation: ${totalMorphemes} ÷ ${allUtterances.length} = ${mlum.toFixed(2)}
   
5. Number of Pauses: ${numberOfPauses}
   - Total pause annotations across all segments

=== MORPHEME ANALYSIS DETAILS ===`);

  // Log morpheme details for verification
  let morphemeWordCount = 0;
  let regularWordCount = 0;
  transcriptData.segments.forEach((segment, _) => {
    if (segment.morphemes && segment.morphemes.length > 0) {
      segment.morphemes.forEach((morpheme: any) => {
        if (morpheme.morpheme_form && morpheme.morpheme_form !== '<IRR>') {
          morphemeWordCount++;
          console.log(`   Morpheme word: "${morpheme.word}" = ${morpheme.lemma} + ${morpheme.morpheme_form} (2 morphemes)`);
        }
      });
    }
  });
  
  regularWordCount = ntw - morphemeWordCount;
  console.log(`   Regular words: ${regularWordCount} (1 morpheme each)`);
  console.log(`   Total morphemes: ${morphemeWordCount * 2 + regularWordCount} = ${totalMorphemes}`);
  console.log(`=====================================`);

  return {
    errorCounts,
    totalWords,
    totalDuration,
    speakingRate,
    errorRate,
    availableErrorTypes,
    segmentCount: transcriptData.segments.length,
    speakerCount: speakers.size,
    ntw,
    ndw,
    mluw,
    mlum,
    numberOfPauses,
  };
};

// Save recording with audio file and comprehensive analysis to Supabase
export const saveRecording = async (
  audioFile: File,
  transcriptData: TranscriptData,
  errorCounts: IssueCounts,
  userId: string
): Promise<{ success: boolean; recordingId?: string; error?: string }> => {
  try {
    // 1. Upload audio file to storage
    const path = `${userId}/${Date.now()}_${audioFile.name}`;
    let uploadError = (await supabase.storage
      .from('recordings')
      .upload(path, audioFile, { upsert: true, cacheControl: '3600' })).error;

    // If bucket missing, create it then retry once
    if (uploadError && uploadError.message.includes('Bucket not found')) {
      const { error: bucketErr } = await supabase.storage.createBucket('recordings', { public: false });
      if (bucketErr) {
        console.error('Failed to create recordings bucket', bucketErr);
      } else {
        uploadError = (await supabase.storage
          .from('recordings')
          .upload(path, audioFile, { upsert: true, cacheControl: '3600' })).error;
      }
    }

    if (uploadError) {
      console.error('Supabase storage upload failed', uploadError);
      return { success: false, error: `Storage upload failed: ${uploadError.message}` };
    }

    // Calculate comprehensive analysis
    const analysis = calculateSpeechAnalysis(transcriptData);

    // 2. Save recording metadata and transcript to database
    const { data: recording, error: insertError } = await supabase
      .from('recordings')
      .insert({
        user_id: userId,
        file_path: path,
        transcript: transcriptData,
        error_counts: errorCounts,
        analysis: analysis,
        file_name: audioFile.name,
        file_size: audioFile.size,
        duration: 0, // Will be updated when audio loads
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Supabase DB insert failed', insertError);
      // Clean up uploaded file if DB insert fails
      await supabase.storage.from('recordings').remove([path]);
      return { success: false, error: `Database insert failed: ${insertError.message}` };
    }

    // 3. Refresh recordings list in React Query cache
    queryClient.invalidateQueries({ queryKey: ['recordings', userId] });

    return { success: true, recordingId: recording.id };

  } catch (error) {
    console.error('Failed to save recording:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};

// Get recording URL from storage
export const getRecordingUrl = async (path: string): Promise<string | null> => {
  if (!path) return null;
  const { data, error } = await supabase.storage.from('recordings').createSignedUrl(path, 3600);
  if (error) {
    console.error('Failed to create signed URL', error);
    return null;
  }
  return data?.signedUrl ?? null;
};

// Load recording data from database with full analysis
export const loadRecording = async (recordingId: string): Promise<{ 
  transcript: TranscriptData; 
  errorCounts: IssueCounts;
  analysis: SpeechAnalysis;
  audioUrl: string | null;
  fileName: string;
  createdAt: string;
} | null> => {
  try {
    const { data: recording, error } = await supabase
      .from('recordings')
      .select('transcript, error_counts, analysis, file_path, file_name, created_at')
      .eq('id', recordingId)
      .single();

    if (error || !recording) {
      console.error('Failed to load recording:', error);
      return null;
    }

    const audioUrl = await getRecordingUrl(recording.file_path);

    return {
      transcript: recording.transcript as TranscriptData,
      errorCounts: recording.error_counts as IssueCounts,
      analysis: recording.analysis as SpeechAnalysis,
      audioUrl,
      fileName: recording.file_name,
      createdAt: recording.created_at,
    };
  } catch (error) {
    console.error('Error loading recording:', error);
    return null;
  }
};

// Keep the existing local JSON loading function for demo purposes
export const loadAndAnalyzeLocalJSON = async (): Promise<{ data: TranscriptData; errorCounts: IssueCounts }> => {
  try {
    const response = await fetch('/673_v3.json');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch JSON: ${response.status}`);
    }
    
    const data: TranscriptData = await response.json();
    
    // Validate structure
    if (!data.segments || !Array.isArray(data.segments)) {
      throw new Error('Invalid JSON structure: missing segments array');
    }

    // Count errors in the data
    const errorCounts = countErrors(data.segments);
    
    return { data, errorCounts };
  } catch (error) {
    console.error('Error loading local JSON:', error);
    throw error;
  }
};

// Delete recording from both database and storage
export const deleteRecording = async (
  recordingId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Get recording details first to get file path
    const { data: recording, error: fetchError } = await supabase
      .from('recordings')
      .select('file_path')
      .eq('id', recordingId)
      .eq('user_id', userId) // Ensure user can only delete their own recordings
      .single();

    if (fetchError || !recording) {
      console.error('Failed to fetch recording for deletion:', fetchError);
      return { success: false, error: 'Recording not found or access denied' };
    }

    // 2. Delete from storage first
    const { error: storageError } = await supabase.storage
      .from('recordings')
      .remove([recording.file_path]);

    if (storageError) {
      console.error('Failed to delete from storage:', storageError);
      // Continue with DB deletion even if storage fails
    }

    // 3. Delete from database
    const { error: dbError } = await supabase
      .from('recordings')
      .delete()
      .eq('id', recordingId)
      .eq('user_id', userId); // Double-check user ownership

    if (dbError) {
      console.error('Failed to delete from database:', dbError);
      return { success: false, error: `Database deletion failed: ${dbError.message}` };
    }

    // 4. Refresh recordings list in React Query cache
    queryClient.invalidateQueries({ queryKey: ['recordings', userId] });

    return { success: true };

  } catch (error) {
    console.error('Failed to delete recording:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};

// Update existing recording with modified transcript data
export const updateRecording = async (
  recordingId: string,
  transcriptData: TranscriptData,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('updateRecording called:', {
      recordingId,
      segmentCount: transcriptData.segments.length,
      firstSegmentSpeaker: transcriptData.segments[0]?.speaker,
      userId
    });

    // Recalculate error counts and analysis with updated transcript
    const errorCounts = countErrors(transcriptData.segments);
    const analysis = calculateSpeechAnalysis(transcriptData);

    console.log('Updating database with:', {
      transcript: transcriptData,
      error_counts: errorCounts,
      analysis: analysis
    });

    // Update the recording in the database
    const { error: updateError } = await supabase
      .from('recordings')
      .update({
        transcript: transcriptData,
        error_counts: errorCounts,
        analysis: analysis,
        updated_at: new Date().toISOString()
      })
      .eq('id', recordingId)
      .eq('user_id', userId); // Ensure user can only update their own recordings

    if (updateError) {
      console.error('Failed to update recording:', updateError);
      return { success: false, error: `Database update failed: ${updateError.message}` };
    }

    console.log('Database update successful');

    // Refresh recordings list in React Query cache
    queryClient.invalidateQueries({ queryKey: ['recordings', userId] });

    return { success: true };

  } catch (error) {
    console.error('Failed to update recording:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}; 