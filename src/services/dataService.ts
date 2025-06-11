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
  'morpheme-omission'?: any[];
  revision?: any[];
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
    if (segment['morpheme-omission']) {
      counts['morpheme-omission'] += segment['morpheme-omission'].length;
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
    // Create FormData for the API request
    const formData = new FormData();
    formData.append('audio_file', audioFile);
    formData.append('device', device);
    formData.append('pause_threshold', pauseThreshold.toString());

    // Start progress tracking
    if (onProgress) {
      onProgress(10); // Initial progress
    }

    const response = await fetch('https://Sven33-SATE.hf.space/process', {
      method: 'POST',
      body: formData,
    });

    if (onProgress) {
      onProgress(80); // Most of the work is done
    }
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
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

  } catch (error) {
    console.error('API processing failed:', error);
    throw new Error(
      error instanceof Error 
        ? `Failed to process audio: ${error.message}`
        : 'Failed to process audio file'
    );
  }
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
    if (segment['morpheme-omission'] && segment['morpheme-omission'].length > 0) {
      errorTypes.add('morpheme-omission');
    }
    if (segment.revision && segment.revision.length > 0) {
      errorTypes.add('revision');
    }
  });

  return Array.from(errorTypes);
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