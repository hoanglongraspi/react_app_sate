import React, { useRef, useState } from 'react';
import { Upload, FileAudio, X, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { AudioCacheStatus } from './AudioCacheStatus';

interface LeftSidebarProps {
  visible: boolean;
  onToggle: () => void;
  onRecord: () => void;
  onImport: () => void;
  onFileUpload?: (file: File) => void;
  isProcessing?: boolean;
  processingProgress?: number;
  onLogout?: () => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ 
  visible, 
  onToggle, 
  onRecord, 
  onImport,
  onFileUpload,
  isProcessing = false,
  processingProgress = 0,
  onLogout
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('audio/')) {
      setSelectedFile(file);
      if (onFileUpload) {
        onFileUpload(file);
      }
    } else {
      alert('Please select a valid audio file (MP3, WAV, M4A, etc.)');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`w-80 bg-gray-50 border-r border-gray-200 flex flex-col transition-transform duration-300 ${
      visible ? 'translate-x-0' : '-translate-x-full'
    }`}>
      {/* SATE Logo/Title */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">SATE</h1>
            <p className="text-sm text-gray-600 mt-1">Speech Analysis Tool</p>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
              title="Logout"
            >
              Logout
            </button>
          )}
        </div>
      </div>
      
      {/* File Upload Area */}
      <div className="p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Upload Audio File</h3>
        
        {/* Drag and Drop Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
            dragActive
              ? 'border-blue-400 bg-blue-50'
              : selectedFile
              ? 'border-green-400 bg-green-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isProcessing}
          />
          
          <div className="text-center">
            {selectedFile ? (
              <div className="space-y-2">
                <FileAudio className="w-8 h-8 text-green-600 mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-600">{formatFileSize(selectedFile.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearSelectedFile();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                  disabled={isProcessing}
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">
                    Drop your audio file here
                  </p>
                  <p className="text-xs text-gray-600">
                    or click to browse
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  Supports MP3, WAV, M4A, and other audio formats
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Processing Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm text-gray-700">Processing audio...</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600 text-center">
              {processingProgress}% complete
            </p>
          </div>
        )}

        {/* Upload Button */}
        {selectedFile && !isProcessing && (
          <Button
            onClick={() => selectedFile && onFileUpload && onFileUpload(selectedFile)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isProcessing}
          >
            Analyze Audio
          </Button>
        )}

        {/* Sample Data Button */}
        <div className="pt-4 border-t border-gray-200">
          <Button
            onClick={onImport}
            variant="outline"
            className="w-full border-gray-300 text-gray-700 hover:bg-gray-100"
            disabled={isProcessing}
          >
            Use Sample Data
          </Button>
        </div>
      </div>
      
      {/* Audio Cache Status */}
      <div className="p-6 border-t border-gray-200">
        <AudioCacheStatus />
      </div>
      
      {/* Instructions */}
      <div className="p-6 mt-auto border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-800 mb-2">How it works</h4>
        <ol className="text-xs text-gray-600 space-y-1">
          <li>1. Upload an audio file</li>
          <li>2. Wait for AI analysis</li>
          <li>3. Review speech patterns</li>
          <li>4. Export results</li>
        </ol>
      </div>
    </div>
  );
};

export default LeftSidebar; 