import React, { useState, useRef } from 'react';
import { LeftSidebar } from './LeftSidebar';
import { MainContent } from './MainContent';
import { RightSidebar } from './RightSidebar';
import { AudioControls } from './AudioControls';

export function Layout() {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleSeekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-lightest">
      {/* Audio element */}
      <audio
        ref={audioRef}
        src="/sound/673_clip.wav"
        preload="metadata"
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebar 
          isOpen={leftSidebarOpen} 
          onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)} 
        />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <MainContent 
            audioRef={audioRef}
            currentTime={currentTime}
            onSeekTo={handleSeekTo}
          />
          
          {/* Audio Controls */}
          <AudioControls 
            audioRef={audioRef}
            onTimeUpdate={handleTimeUpdate}
          />
        </div>
        
        {/* Right Sidebar */}
        <RightSidebar 
          isOpen={rightSidebarOpen} 
          onToggle={() => setRightSidebarOpen(!rightSidebarOpen)} 
        />
      </div>
    </div>
  );
} 