import { useState, useRef, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import './App.css';

// Import data service
import { loadAndAnalyzeLocalJSON, processAudioFile, getErrorAnnotations, saveRecording, loadRecording, updateRecording, calculateSpeechAnalysis, type Segment, type IssueCounts, type SpeechAnalysis } from './services/dataService';
import { audioStorageService } from './services/audioStorageService';

// Import all components
import LeftSidebar from './components/LeftSidebar';
import MainContent from './components/MainContent';
import RightSidebar from './components/RightSidebar';
import LoginPage from './components/LoginPage';
import ImportPopup from './components/ImportPopup';
import { Button } from './components/ui/button';
import { Play, Pause, Trash2, RotateCcw, Zap } from 'lucide-react';

// Main application component with all the existing logic
function MainApp() {
  // Auth context
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Data state
  const [transcriptData, setTranscriptData] = useState<Segment[]>([]);
  const [issueCounts, setIssueCounts] = useState<IssueCounts>({
    pause: 0,
    filler: 0,
    repetition: 0,
    mispronunciation: 0,
    morpheme: 0,
    'morpheme-omission': 0,
    revision: 0,
    'utterance-error': 0
  });
  const [speechAnalysis, setSpeechAnalysis] = useState<SpeechAnalysis | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Audio state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  // UI state
  const [leftSidebarVisible, setLeftSidebarVisible] = useState(true);
  const [rightSidebarVisible, setRightSidebarVisible] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [microphonePermission, setMicrophonePermission] = useState<'granted' | 'denied' | 'prompt' | null>(null);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [showRecordingPreview, setShowRecordingPreview] = useState(false);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [recordingFileName, setRecordingFileName] = useState('');
  const [currentRecordingName, setCurrentRecordingName] = useState('');
  const [currentRecordingDate, setCurrentRecordingDate] = useState('');
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Import popup state
  const [showImportPopup, setShowImportPopup] = useState(false);
  
  // Filter state
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [categoryExpanded, setCategoryExpanded] = useState<{[key: string]: boolean}>({});
  const [availableErrorTypes, setAvailableErrorTypes] = useState<string[]>([]);

  // Speaker selection state
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | undefined>(undefined);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  // Toast notification state
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ show: false, message: '', type: 'success' });

  // Audio conversion function
  const convertToWav = async (audioBlob: Blob): Promise<Blob> => {
    return new Promise((resolve) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const fileReader = new FileReader();
      
      fileReader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // Convert to WAV
          const wavBuffer = audioBufferToWav(audioBuffer);
          const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
          
          resolve(wavBlob);
        } catch (error) {
          console.error('Audio conversion error:', error);
          // Fallback to original blob
          resolve(audioBlob);
        }
      };
      
      fileReader.onerror = () => {
        console.error('FileReader error');
        // Fallback to original blob
        resolve(audioBlob);
      };
      
      fileReader.readAsArrayBuffer(audioBlob);
    });
  };

  // Convert AudioBuffer to WAV format
  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 2;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const bufferSize = 44 + dataSize;
    
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Convert audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return arrayBuffer;
  };

  // Handle file upload and API processing
  const handleFileUpload = async (file: File) => {
    let cachedUrl: string | null = null;
    
    try {
      setIsProcessing(true);
      setIsDataLoading(true);
      setDataError(null);
      setProcessingProgress(0);
      setShowImportPopup(false); // Close the popup when processing starts

      // Cache audio file and get URL for playback first
      console.log('Caching audio file...');
      cachedUrl = await audioStorageService.cacheAudioFile(file);
      console.log('Audio cached, URL:', cachedUrl);
      setAudioUrl(cachedUrl);

      // Small delay to ensure audio element has time to load
      await new Promise(resolve => setTimeout(resolve, 100));

      // Process audio file with API
      console.log('Starting API processing...');
      const { data: processedData, errorCounts } = await processAudioFile(
        file,
        'cuda',
        0.25,
        (progress) => setProcessingProgress(progress)
      );

      console.log('API processing complete, setting data...');
      setTranscriptData(processedData.segments);
      setIssueCounts(errorCounts);
      
      // Calculate speech analysis
      const analysis = calculateSpeechAnalysis(processedData);
      setSpeechAnalysis(analysis);
      
      // Set the current recording name
      setCurrentRecordingName(file.name);
      setCurrentRecordingDate(new Date().toISOString());
      setCurrentRecordingId(null); // New upload, no recording ID yet

      // Get available error types for filtering
      const errorTypes = getErrorAnnotations(processedData.segments);
      setAvailableErrorTypes(errorTypes);

      // Set initial filters to show all detected error types
      setActiveFilters(errorTypes);

      // Reset playback position but keep audio loaded
      setCurrentTime(0);
      setIsPlaying(false);
      
      // Save to Supabase (storage + DB)
      if (user) {
        const result = await saveRecording(file, processedData, errorCounts, user.id);
        if (!result.success) {
          console.error('Failed to save recording:', result.error);
          setDataError(`Failed to save recording: ${result.error}`);
        } else {
          console.log('Recording saved successfully with ID:', result.recordingId);
          setCurrentRecordingId(result.recordingId || null);
        }
      }
      
      console.log('File upload processing complete');

    } catch (error) {
      console.error('Failed to process audio file:', error);
      let errorMessage = error instanceof Error ? error.message : 'Failed to process audio file';
      
      // Add helpful context for common errors
      if (errorMessage.includes('out of memory') || errorMessage.includes('CUDA failed')) {
        errorMessage = 'Server GPU is out of memory. Processing may take longer using CPU. Please try again.';
      }
      
      setDataError(errorMessage);
      
      // Clean up audio URL on error - only if it's a blob URL from our caching
      if (cachedUrl && cachedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(cachedUrl);
        setAudioUrl(null);
      }
    } finally {
      setIsProcessing(false);
      setIsDataLoading(false);
      setProcessingProgress(0);
    }
  };

  // Load sample data
  const loadSampleData = async () => {
    try {
      setIsDataLoading(true);
      setDataError(null);
      setShowImportPopup(false); // Close the popup when loading sample data
      
      // Load local JSON file and analyze for errors
      const { data, errorCounts } = await loadAndAnalyzeLocalJSON();
      setTranscriptData(data.segments);
      setIssueCounts(errorCounts);
      
      // Calculate speech analysis
      const analysis = calculateSpeechAnalysis(data);
      setSpeechAnalysis(analysis);
      
      // Set the current recording name for sample data
      setCurrentRecordingName('Sample Audio (673_clip.wav)');
      setCurrentRecordingDate(new Date().toISOString());
      setCurrentRecordingId(null); // Sample data, no recording ID
      
      // Get available error types for filtering
      const errorTypes = getErrorAnnotations(data.segments);
      setAvailableErrorTypes(errorTypes);
      
      // Set initial filters to only show errors
      setActiveFilters(errorTypes);

      // Cache sample audio from URL
      const cachedUrl = await audioStorageService.cacheAudioFromUrl('/sound/673_clip.wav');
      setAudioUrl(cachedUrl);
      
      // Reset playback position but keep audio loaded
      setCurrentTime(0);
      setIsPlaying(false);
      // Don't reset audioLoaded - let the audio element handle this
      
    } catch (error) {
      console.error('Failed to load sample data:', error);
      setDataError(error instanceof Error ? error.message : 'Failed to load sample data');
    } finally {
      setIsDataLoading(false);
    }
  };

  // Audio effects
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        setAudioLoaded(true);
      }
    };
    
    const handlePlay = () => {
      setIsPlaying(true);
    };
    
    const handlePause = () => {
      setIsPlaying(false);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleLoadedMetadata = () => {
      updateDuration();
    };

    const handleLoadedData = () => {
      updateDuration();
    };

    const handleCanPlay = () => {
      updateDuration();
    };

    const handleError = (event: Event) => {
      console.error('Audio error:', event);
      const audio = event.target as HTMLAudioElement;
      if (audio.error) {
        console.error('Audio error details:', {
          code: audio.error.code,
          message: audio.error.message,
          src: audio.src
        });
      }
    };

    const handleLoadStart = () => {
      console.log('Audio load started:', audio.src);
    };

    // Add event listeners
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);

    // Set up audio source if available
    if (audioUrl && audio.src !== audioUrl) {
      audio.src = audioUrl;
      audio.preload = 'metadata';
      audio.load();
    }

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
    };
  }, [audioUrl]);

  // Update audio source when audioUrl changes
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && audioUrl) {
      audio.src = audioUrl;
      audio.preload = 'metadata';
      audio.load();
    }
  }, [audioUrl]);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, message: '', type: 'success' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // Audio controls
  const togglePlayPause = async () => {
    const audio = audioRef.current;
    console.log('togglePlayPause called:', { 
      audioElement: !!audio, 
      audioLoaded, 
      audioSrc: audio?.src,
      audioUrl,
      duration,
      currentTime: audio?.currentTime 
    });
    
    if (!audio) {
      console.warn('No audio element found');
      return;
    }
    
    if (!audioLoaded) {
      console.warn('Audio not loaded yet');
      return;
    }
    
    try {
      if (isPlaying) {
        audio.pause();
      } else {
        console.log('Attempting to play audio...');
        try {
          await audio.play();
          console.log('Audio play successful');
        } catch (playError: any) {
          if (playError.name === 'NotAllowedError') {
            console.warn('Audio play blocked by browser - user interaction required');
          } else {
            console.error('Audio play failed:', playError);
          }
          throw playError;
        }
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  const seekTo = (time: number) => {
    const audio = audioRef.current;
    if (!audio || !audioLoaded) return;
    
    const clampedTime = Math.max(0, Math.min(time, duration));
    audio.currentTime = clampedTime;
    setCurrentTime(clampedTime);
  };

  const seekToTimestamp = (timestamp: string) => {
    // Handle direct timestamp values (e.g., "3.565")
    const time = parseFloat(timestamp);
    if (!isNaN(time)) {
      seekTo(time);
    } else {
      // Fallback for other formats like "start:end"
      const [start] = timestamp.split(':').map(Number);
      if (!isNaN(start)) {
        seekTo(start);
      }
    }
  };

  // Recording controls
  const startRecording = async () => {
    try {
      setShowRecordingModal(true);
      setMicrophonePermission('prompt');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });

      setMicrophonePermission('granted');

      // Create MediaRecorder
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/wav') ? 'audio/wav' : 
                  MediaRecorder.isTypeSupported('audio/webm;codecs=pcm') ? 'audio/webm;codecs=pcm' :
                  'audio/webm'
      });

      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        
        // Create audio file from recorded chunks
        const originalBlob = new Blob(chunks, { 
          type: recorder.mimeType || 'audio/webm' 
        });
        
        console.log('Original recording completed, size:', originalBlob.size, 'type:', originalBlob.type);
        
        let finalBlob = originalBlob;
        let audioUrl: string;
        
        try {
          // Try to convert to WAV for better compatibility
          console.log('Converting to WAV format...');
          const wavBlob = await convertToWav(originalBlob);
          console.log('WAV conversion completed, size:', wavBlob.size);
          finalBlob = wavBlob;
          audioUrl = URL.createObjectURL(wavBlob);
        } catch (conversionError) {
          console.warn('WAV conversion failed, using original format:', conversionError);
          // Fallback to original format
          finalBlob = originalBlob;
          audioUrl = URL.createObjectURL(originalBlob);
        }
        
        // Set recording data for preview
        setRecordingBlob(finalBlob);
        setRecordingUrl(audioUrl);
        setShowRecordingPreview(true);
        
        // Generate default filename with appropriate extension
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const extension = finalBlob.type.includes('wav') ? 'wav' : 
                         finalBlob.type.includes('mp4') ? 'mp4' : 'webm';
        setRecordingFileName(`recording-${timestamp}.${extension}`);
        
        // Create audio element for preview
        const audio = new Audio(audioUrl);
        
        const handleLoadedMetadata = () => {
          console.log('Audio metadata loaded, duration:', audio.duration);
          if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
            setPreviewDuration(audio.duration);
          } else {
            setPreviewDuration(0);
          }
        };
        
        const handleTimeUpdate = () => {
          setPreviewCurrentTime(audio.currentTime);
        };
        
        const handleEnded = () => {
          setIsPreviewPlaying(false);
          setPreviewCurrentTime(0);
        };
        
        const handleError = (e: Event) => {
          console.error('Audio loading error:', e);
          setPreviewDuration(0);
        };
        
        const handleCanPlay = () => {
          console.log('Audio can play, duration:', audio.duration);
          if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
            setPreviewDuration(audio.duration);
          }
        };
        
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);
        audio.addEventListener('canplay', handleCanPlay);
        
        // Force load metadata
        audio.load();
        
        setPreviewAudio(audio);
      };

      // Start recording
      recorder.start(1000); // Collect data every second
      setMediaRecorder(recorder);
      
      // Wait for recording to actually start before setting state and timer
      recorder.onstart = () => {
        console.log('Recording started, initializing timer...');
        setIsRecording(true);
        setRecordingTime(0);
        
        // Start recording timer
        recordingTimerRef.current = setInterval(() => {
          setRecordingTime(prev => {
            const newTime = prev + 1;
            console.log('Recording time:', newTime);
            return newTime;
          });
        }, 1000);
      };

    } catch (error) {
      console.error('Failed to start recording:', error);
      setMicrophonePermission('denied');
      
      // Show error message based on error type
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          alert('Microphone access denied. Please allow microphone access and try again.');
        } else if (error.name === 'NotFoundError') {
          alert('No microphone found. Please connect a microphone and try again.');
        } else {
          alert(`Failed to access microphone: ${error.message}`);
        }
      } else {
        alert('Failed to access microphone. Please ensure you have granted microphone permissions.');
      }
      
      // Close modal on error
      setShowRecordingModal(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    
    setIsRecording(false);
    setShowRecordingModal(false);
    setRecordingTime(0);
    setMediaRecorder(null);
    setMicrophonePermission(null);
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      // Stop recording without processing
      mediaRecorder.stream?.getTracks().forEach(track => track.stop());
    }
    
    setIsRecording(false);
    setShowRecordingModal(false);
    setRecordingTime(0);
    setMediaRecorder(null);
    setMicrophonePermission(null);
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  // Preview control functions
  const togglePreviewPlayback = () => {
    if (!previewAudio) return;
    
    if (isPreviewPlaying) {
      previewAudio.pause();
      setIsPreviewPlaying(false);
    } else {
      previewAudio.play();
      setIsPreviewPlaying(true);
    }
  };

  const seekPreview = (time: number) => {
    if (!previewAudio) return;
    previewAudio.currentTime = time;
    setPreviewCurrentTime(time);
  };

  const handleProcessRecording = async () => {
    if (!recordingBlob || !recordingFileName || !user) return;
    
    try {
      setIsProcessing(true);
      setProcessingProgress(0);
      
      // Ensure filename has proper extension
      let finalFileName = recordingFileName;
      const extension = recordingBlob.type.includes('wav') ? '.wav' : 
                       recordingBlob.type.includes('mp4') ? '.mp4' : '.webm';
      
      if (!finalFileName.endsWith(extension)) {
        finalFileName += extension;
      }
      
      // Create File object from blob with proper filename
      const audioFile = new File([recordingBlob], finalFileName, {
        type: recordingBlob.type,
        lastModified: Date.now()
      });
      
      console.log('Processing recorded audio file:', {
        name: audioFile.name,
        size: audioFile.size,
        type: audioFile.type
      });
      
      // Process the audio file
      const result = await processAudioFile(
        audioFile,
        'cuda',
        0.25,
        setProcessingProgress
      );
      
      console.log('API processing complete, setting data...');
      setTranscriptData(result.data.segments);
      setIssueCounts(result.errorCounts);

      // Set the current recording name
      setCurrentRecordingName(finalFileName);
      setCurrentRecordingDate(new Date().toISOString());
      setCurrentRecordingId(null); // Will be set after saving

      // Get available error types for filtering
      const errorTypes = getErrorAnnotations(result.data.segments);
      setAvailableErrorTypes(errorTypes);

      // Set initial filters to show all detected error types
      setActiveFilters(errorTypes);

      // Reset playback position but keep audio loaded
      setCurrentTime(0);
      setIsPlaying(false);
      
      // Cache the recorded audio for playback
      const cachedUrl = URL.createObjectURL(recordingBlob);
      setAudioUrl(cachedUrl);
      
      // Save to Supabase (storage + DB)
      const saveResult = await saveRecording(audioFile, result.data, result.errorCounts, user.id);
      if (!saveResult.success) {
        console.error('Failed to save recording:', saveResult.error);
        setDataError(`Failed to save recording: ${saveResult.error}`);
      } else {
        console.log('Recording saved successfully with ID:', saveResult.recordingId);
        setCurrentRecordingId(saveResult.recordingId || null);
      }
      
      // Clean up and close modals
      cleanupPreview();
      setShowRecordingPreview(false);
      setIsProcessing(false);
      setProcessingProgress(0);
      
    } catch (error) {
      console.error('Failed to process recording:', error);
      let errorMessage = error instanceof Error ? error.message : 'Failed to process recording';
      
      // Add helpful context for common errors
      if (errorMessage.includes('out of memory') || errorMessage.includes('CUDA failed')) {
        errorMessage = 'Server GPU is out of memory. Processing may take longer using CPU. Please try again.';
      }
      
      setDataError(errorMessage);
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  const discardRecording = () => {
    setShowRecordingPreview(false);
    cleanupPreview();
  };

  const cleanupPreview = () => {
    // Cleanup preview audio
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.removeEventListener('loadedmetadata', () => {});
      previewAudio.removeEventListener('timeupdate', () => {});
      previewAudio.removeEventListener('ended', () => {});
      previewAudio.removeEventListener('error', () => {});
      previewAudio.removeEventListener('canplay', () => {});
      setPreviewAudio(null);
    }
    
    // Cleanup URLs and state
    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl);
      setRecordingUrl(null);
    }
    
    setRecordingBlob(null);
    setIsPreviewPlaying(false);
    setPreviewCurrentTime(0);
    setPreviewDuration(0);
    setRecordingFileName('');
  };

  const toggleFilter = (filter: string) => {
    setActiveFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const toggleCategory = (category: string) => {
    setCategoryExpanded(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const applyPreset = (preset: string) => {
    switch (preset) {
      case 'errors':
        // Apply all available error types found in the JSON
        setActiveFilters([...availableErrorTypes]);
        break;
      case 'speech':
        // Apply only speech-related errors that are available
        setActiveFilters(availableErrorTypes.filter(type => 
          ['filler', 'repetition', 'mispronunciation'].includes(type)
        ));
        break;
      case 'language':
        // Apply only language-related errors that are available
        setActiveFilters(availableErrorTypes.filter(type => 
          ['morpheme-omission', 'revision', 'utterance-error'].includes(type)
        ));
        break;
      case 'clean':
        setActiveFilters([]);
        break;
    }
  };

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stream?.getTracks().forEach(track => track.stop());
      }
      // Cleanup preview resources
      cleanupPreview();
    };
  }, [mediaRecorder]);

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Auto-cleanup expired cache items on app load
  useEffect(() => {
    // Clean up expired items when app loads
    audioStorageService.clearExpiredItems();
  }, []);

  // Auto-show right sidebar when data is loaded and calculate speech analysis
  useEffect(() => {
    if (transcriptData.length > 0) {
      setRightSidebarVisible(true);
      // Calculate speech analysis
      const analysis = calculateSpeechAnalysis({ segments: transcriptData });
      setSpeechAnalysis(analysis);
    } else {
      setSpeechAnalysis(null);
    }
  }, [transcriptData.length]);

  // Handle logout via Supabase
  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // Show loading state
  if (isDataLoading && !isProcessing) {
    return (
      <div className="min-h-screen bg-neutral-lightest flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">Loading SATE Demo...</div>
          <div className="text-sm text-neutral-darker">Processing transcript data...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (dataError && !transcriptData.length) {
    return (
      <div className="min-h-screen bg-neutral-lightest flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-lg font-medium mb-2 text-red-600">Error Loading Data</div>
          <div className="text-sm text-neutral-darker mb-4">{dataError}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Handle recording name changes
  const handleRecordingNameChange = (newName: string) => {
    setCurrentRecordingName(newName);
    // TODO: Save to database if it's a saved recording
  };

  // Handle transcript changes
  const handleTranscriptChange = (updatedSegments: Segment[]) => {
    console.log('handleTranscriptChange called with:', updatedSegments.length, 'segments');
    console.log('First segment speaker:', updatedSegments[0]?.speaker);
    setTranscriptData(updatedSegments);
    
    // Recalculate speech analysis in real-time
    const newAnalysis = calculateSpeechAnalysis({ segments: updatedSegments });
    setSpeechAnalysis(newAnalysis);
    
    // Recalculate issue counts
    const newIssueCounts = {
      pause: 0,
      filler: 0,
      repetition: 0,
      mispronunciation: 0,
      morpheme: 0,
      'morpheme-omission': 0,
      revision: 0,
      'utterance-error': 0
    };
    
    updatedSegments.forEach(segment => {
      // Count filler words
      if (segment.fillerwords) {
        newIssueCounts.filler += segment.fillerwords.length;
      }
      // Count repetitions
      if (segment.repetitions) {
        newIssueCounts.repetition += segment.repetitions.length;
      }
      // Count pauses
      if (segment.pauses) {
        newIssueCounts.pause += segment.pauses.length;
      }
      // Count utterance errors
      if (segment['utterance-error']) {
        newIssueCounts['utterance-error'] += segment['utterance-error'].length;
      }
      // Count mispronunciations
      if (segment.mispronunciation) {
        newIssueCounts.mispronunciation += segment.mispronunciation.length;
      }
      // Count morpheme omissions
      if (segment.morpheme_omissions) {
        newIssueCounts['morpheme-omission'] += segment.morpheme_omissions.length;
      }
      // Count morphemes (inflectional morphemes)
      if (segment.morphemes) {
        const visibleMorphemes = segment.morphemes.filter((morpheme: any) => 
          morpheme.morpheme_form && morpheme.morpheme_form !== '<IRR>'
        );
        newIssueCounts.morpheme += visibleMorphemes.length;
      }
      // Count revisions
      if (segment.revision) {
        newIssueCounts.revision += segment.revision.length;
      }
    });
    
    setIssueCounts(newIssueCounts);
    
    // Update available error types
    const errorTypes = getErrorAnnotations(updatedSegments);
    setAvailableErrorTypes(errorTypes);
    
    setIsEditMode(true);
    console.log('Real-time analysis updated:', { 
      segments: updatedSegments.length, 
      analysis: newAnalysis,
      issueCounts: newIssueCounts 
    });
  };

  // Save transcript changes
  const saveTranscriptChanges = async () => {
    if (!user) {
      setToast({
        show: true,
        message: 'You must be logged in to save changes',
        type: 'error'
      });
      return;
    }

    if (!currentRecordingId) {
      // For sample data or unsaved files, we need to create a new recording
      // This would require the original audio file, which we don't have for sample data
      setToast({
        show: true,
        message: 'Cannot save changes to sample data or unsaved files. Please upload and process an audio file first.',
        type: 'error'
      });
      return;
    }

    try {
      console.log('Saving transcript changes...', { 
        recordingId: currentRecordingId, 
        segments: transcriptData.length,
        firstSegmentSpeaker: transcriptData[0]?.speaker 
      });
      
      const result = await updateRecording(
        currentRecordingId,
        { segments: transcriptData },
        user.id
      );

      if (result.success) {
        setIsEditMode(false);
        setToast({
          show: true,
          message: 'Transcript changes saved successfully!',
          type: 'success'
        });
        console.log('Transcript changes saved successfully');
      } else {
        throw new Error(result.error || 'Failed to save changes');
      }
    } catch (error) {
      console.error('Failed to save transcript changes:', error);
      setToast({
        show: true,
        message: error instanceof Error ? error.message : 'Failed to save changes',
        type: 'error'
      });
    }
  };

  // Cancel edit mode
  const cancelEditMode = () => {
    setIsEditMode(false);
    // TODO: Revert changes if needed
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Audio element */}
      <audio 
        ref={audioRef} 
        preload="metadata"
      />
      
      <div className="flex h-screen overflow-hidden">
        {/* Left Sidebar */}
        {leftSidebarVisible && (
          <LeftSidebar 
            visible={leftSidebarVisible}
            onToggle={() => setLeftSidebarVisible(!leftSidebarVisible)}
            onRecord={startRecording}
            onImport={() => setShowImportPopup(true)}
            onUseSampleData={loadSampleData}
            isProcessing={isProcessing}
            processingProgress={processingProgress}
            onLogout={handleLogout}
            onSelectRecording={async (url: string, recordingId: string) => {
              try {
                setIsDataLoading(true);
                setDataError(null);
                
                // Clean up previous audio URL
                if (audioUrl && audioUrl.startsWith('blob:')) {
                  URL.revokeObjectURL(audioUrl);
                }
                
                // Load complete recording data
                const recordingData = await loadRecording(recordingId);
                if (recordingData) {
                  // Set transcript data
                  setTranscriptData(recordingData.transcript.segments);
                  setIssueCounts(recordingData.errorCounts);
                  
                  // Calculate speech analysis (or use saved analysis if available)
                  const analysis = recordingData.analysis || calculateSpeechAnalysis(recordingData.transcript);
                  setSpeechAnalysis(analysis);
                  
                  // Set the current recording name and ID
                  setCurrentRecordingName(recordingData.fileName);
                  setCurrentRecordingDate(recordingData.createdAt);
                  setCurrentRecordingId(recordingId);
                  
                  // Get available error types for filtering
                  const errorTypes = getErrorAnnotations(recordingData.transcript.segments);
                  setAvailableErrorTypes(errorTypes);
                  setActiveFilters(errorTypes);
                  
                  // Set audio URL
                  setAudioUrl(url);
                  setCurrentTime(0);
                  setIsPlaying(false);
                  
                  console.log('Loaded recording:', recordingData.fileName);
                } else {
                  setDataError('Failed to load recording data');
                }
              } catch (error) {
                console.error('Error loading recording:', error);
                setDataError('Failed to load recording');
              } finally {
                setIsDataLoading(false);
              }
            }}
          />
        )}
        
        {/* Main Content */}
        <MainContent 
          currentTime={currentTime}
          onSeek={seekToTimestamp}
          activeFilters={activeFilters}
          isPlaying={isPlaying}
          onTogglePlayPause={togglePlayPause}
          onSeekTo={seekTo}
          duration={duration}
          onNextWord={() => {}}
          onPrevWord={() => {}}
          onToggleFilter={toggleFilter}
          onToggleCategory={toggleCategory}
          categoryExpanded={categoryExpanded}
          onApplyPreset={applyPreset}
          transcriptData={transcriptData}
          issueCounts={issueCounts}
          audioRef={audioRef}
          onTimeUpdate={setCurrentTime}
          availableErrorTypes={availableErrorTypes}
          showControls={transcriptData.length > 0}
          recordingName={currentRecordingName}
          onRecordingNameChange={handleRecordingNameChange}
          createdDate={currentRecordingDate}
          isEditable={isEditMode}
          onTranscriptChange={handleTranscriptChange}
          onSaveChanges={saveTranscriptChanges}
          onCancelEdit={cancelEditMode}
        />
        
        {/* Right Sidebar */}
        {rightSidebarVisible && transcriptData.length > 0 && (
          <RightSidebar 
            visible={rightSidebarVisible}
            onToggle={() => setRightSidebarVisible(!rightSidebarVisible)}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            issueCounts={issueCounts}
            duration={duration}
            transcriptData={transcriptData}
            activeFilters={activeFilters}
            speechAnalysis={speechAnalysis || undefined}
            selectedSpeaker={selectedSpeaker}
            onSpeakerChange={setSelectedSpeaker}
          />
        )}

        {/* Recording Modal */}
        {showRecordingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              {microphonePermission === 'prompt' ? (
                <>
                  <h2 className="text-xl font-semibold mb-4">Requesting Microphone Access</h2>
                  <div className="text-center">
                    <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <div className="w-8 h-8 bg-white rounded-full"></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">Please allow microphone access to start recording</p>
                  </div>
                  <div className="flex gap-2 mt-6">
                    <Button
                      onClick={cancelRecording}
                      variant="outline"
                      className="w-full"
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : microphonePermission === 'granted' && isRecording ? (
                <>
                  <h2 className="text-xl font-semibold mb-4">Recording Audio</h2>
                  <div className="text-center">
                    <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <div className="w-8 h-8 bg-white rounded-full"></div>
                    </div>
                    <p className="text-lg font-mono">
                      {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">Recording in progress...</p>
                    <p className="text-xs text-gray-500 mt-1">Click "Stop Recording" when finished</p>
                  </div>
                  <div className="flex gap-2 mt-6">
                    <Button
                      onClick={stopRecording}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Stop Recording
                    </Button>
                    <Button
                      onClick={cancelRecording}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold mb-4">Recording Error</h2>
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <div className="w-8 h-8 bg-white rounded-full"></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">Unable to access microphone</p>
                  </div>
                  <div className="flex gap-2 mt-6">
                    <Button
                      onClick={cancelRecording}
                      variant="outline"
                      className="w-full"
                    >
                      Close
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Recording Preview Modal */}
        {showRecordingPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-semibold mb-4">Preview Recording</h2>
              
              <div className="space-y-4">
                {/* File Name Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recording Name
                  </label>
                  <input
                    type="text"
                    value={recordingFileName}
                    onChange={(e) => setRecordingFileName(e.target.value)}
                    placeholder="Enter recording name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    File will be saved as: {recordingFileName.trim() || 'recording'}.wav
                  </p>
                </div>

                {/* Audio Waveform Placeholder */}
                <div className="bg-gray-100 rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <div className="w-6 h-6 bg-white rounded-full"></div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Duration: {previewDuration > 0 && isFinite(previewDuration) 
                      ? `${Math.floor(previewDuration / 60)}:${Math.floor(previewDuration % 60).toString().padStart(2, '0')}`
                      : 'Loading...'
                    }
                  </p>
                </div>

                {/* Playback Controls */}
                <div className="space-y-3">
                  {/* Progress Bar */}
                  <div className="relative">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-100"
                        style={{ width: `${previewDuration > 0 && isFinite(previewDuration) ? (previewCurrentTime / previewDuration) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={previewDuration && isFinite(previewDuration) ? previewDuration : 0}
                      value={previewCurrentTime}
                      onChange={(e) => seekPreview(parseFloat(e.target.value))}
                      className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                      disabled={!previewDuration || !isFinite(previewDuration)}
                    />
                  </div>

                  {/* Time Display */}
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>
                      {Math.floor(previewCurrentTime / 60)}:{Math.floor(previewCurrentTime % 60).toString().padStart(2, '0')}
                    </span>
                    <span>
                      {previewDuration > 0 && isFinite(previewDuration)
                        ? `${Math.floor(previewDuration / 60)}:${Math.floor(previewDuration % 60).toString().padStart(2, '0')}`
                        : '--:--'
                      }
                    </span>
                  </div>

                  {/* Play/Pause Button */}
                  <div className="flex justify-center">
                    <Button
                      onClick={togglePreviewPlayback}
                      disabled={!previewDuration || !isFinite(previewDuration)}
                      className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center disabled:bg-gray-400"
                    >
                      {isPreviewPlaying ? (
                        <Pause className="w-6 h-6" />
                      ) : (
                        <Play className="w-6 h-6 ml-1" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-6">
                  <Button
                    onClick={handleProcessRecording}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Process with AI
                  </Button>
                  <Button
                    onClick={discardRecording}
                    variant="outline"
                    className="flex-1"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Discard
                  </Button>
                </div>

                {/* Re-record Option */}
                <Button
                  onClick={() => {
                    discardRecording();
                    startRecording();
                  }}
                  variant="ghost"
                  className="w-full text-sm text-gray-600"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Record Again
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Import Popup */}
        <ImportPopup
          isOpen={showImportPopup}
          onClose={() => setShowImportPopup(false)}
          onFileUpload={handleFileUpload}
          isProcessing={isProcessing}
          processingProgress={processingProgress}
          onUseSampleData={loadSampleData}
        />

        {/* Toast Notification */}
        {toast.show && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-3 ${
            toast.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${
              toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {toast.type === 'success' ? '✓' : '✕'}
            </div>
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-lightest">
        <p className="text-sm text-neutral-darker">Checking authentication…</p>
      </div>
    );
  }

  if (!user) {
    // Redirect to login page but save the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// Main App component with routing
function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<LoginPage />} />
      
      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainApp />
          </ProtectedRoute>
        }
      />
      
      {/* Redirect any unknown routes to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
