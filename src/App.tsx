import { useState, useRef, useEffect } from 'react';
import './App.css';

// Import data service
import { loadAndAnalyzeLocalJSON, processAudioFile, getErrorAnnotations, type Segment, type IssueCounts } from './services/dataService';
import { audioStorageService } from './services/audioStorageService';

// Import all components
import LeftSidebar from './components/LeftSidebar';
import MainContent from './components/MainContent';
import RightSidebar from './components/RightSidebar';
import LoginPage from './components/LoginPage';

function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
  
  // Recording state (currently unused but kept for future functionality)
  // const [isRecording, setIsRecording] = useState(false);
  // const [recordingTime, setRecordingTime] = useState(0);
  // const [showRecordingModal, setShowRecordingModal] = useState(false);
  // const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Filter state
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [categoryExpanded, setCategoryExpanded] = useState<{[key: string]: boolean}>({});
  const [availableErrorTypes, setAvailableErrorTypes] = useState<string[]>([]);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  // Handle file upload and API processing
  const handleFileUpload = async (file: File) => {
    let cachedUrl: string | null = null;
    
    try {
      setIsProcessing(true);
      setIsDataLoading(true);
      setDataError(null);
      setProcessingProgress(0);

      // Cache audio file and get URL for playback first
      console.log('Caching audio file...');
      cachedUrl = await audioStorageService.cacheAudioFile(file);
      console.log('Audio cached, URL:', cachedUrl);
      setAudioUrl(cachedUrl);

      // Small delay to ensure audio element has time to load
      await new Promise(resolve => setTimeout(resolve, 100));

      // Process audio file with API
      console.log('Starting API processing...');
      const { data, errorCounts } = await processAudioFile(
        file,
        'cuda',
        0.25,
        (progress) => setProcessingProgress(progress)
      );

      console.log('API processing complete, setting data...');
      setTranscriptData(data.segments);
      setIssueCounts(errorCounts);

      // Get available error types for filtering
      const errorTypes = getErrorAnnotations(data.segments);
      setAvailableErrorTypes(errorTypes);

      // Set initial filters to show all detected error types
      setActiveFilters(errorTypes);

      // Reset playback position but keep audio loaded
      setCurrentTime(0);
      setIsPlaying(false);
      
      console.log('File upload processing complete');

    } catch (error) {
      console.error('Failed to process audio file:', error);
      setDataError(error instanceof Error ? error.message : 'Failed to process audio file');
      
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
      
      // Load local JSON file and analyze for errors
      const { data, errorCounts } = await loadAndAnalyzeLocalJSON();
      setTranscriptData(data.segments);
      setIssueCounts(errorCounts);
      
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

  // Recording controls (currently disabled - uncomment state variables above to enable)
  // const startRecording = () => {
  //   setIsRecording(true);
  //   setShowRecordingModal(true);
  //   setRecordingTime(0);
  //   
  //   // Start recording timer
  //   const timer = setInterval(() => {
  //     setRecordingTime(prev => prev + 1);
  //   }, 1000);
  //   
  //   // Store timer reference for cleanup
  //   (window as any).recordingTimer = timer;
  // };

  // const stopRecording = () => {
  //   setIsRecording(false);
  //   setShowRecordingModal(false);
  //   setRecordingTime(0);
  //   
  //   if ((window as any).recordingTimer) {
  //     clearInterval((window as any).recordingTimer);
  //   }
  // };

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
    
    // Check for existing authentication (localStorage)
    const savedAuth = localStorage.getItem('sate_authenticated');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Handle login
  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('sate_authenticated', 'true');
  };

  // Handle logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('sate_authenticated');
  };

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

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
            onRecord={() => {}} // Disabled for now
            onImport={loadSampleData}
            onFileUpload={handleFileUpload}
            isProcessing={isProcessing}
            processingProgress={processingProgress}
            onLogout={handleLogout}
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
        />
        
        {/* Right Sidebar */}
        {rightSidebarVisible && (
          <RightSidebar 
            visible={rightSidebarVisible}
            onToggle={() => setRightSidebarVisible(!rightSidebarVisible)}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            issueCounts={issueCounts}
            duration={duration}
            transcriptData={transcriptData}
            activeFilters={activeFilters}
          />
        )}
      </div>
    </div>
  );
}

export default App;
