import React, { useRef, useState } from 'react';
import { Upload, FileAudio, X, Loader2 } from 'lucide-react';
import { Button } from './ui/button';

interface ImportPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onFileUpload?: (file: File) => void;
  isProcessing?: boolean;
  processingProgress?: number;
  onUseSampleData?: () => void;
}

const ImportPopup: React.FC<ImportPopupProps> = ({
  isOpen,
  onClose,
  onFileUpload,
  isProcessing = false,
  processingProgress = 0,
  onUseSampleData
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (file: File) => {
    // Validate file type
    const validTypes = [
      'audio/wav', 'audio/wave', 'audio/x-wav',
      'audio/mpeg', 'audio/mp3',
      'audio/mp4', 'audio/m4a',
      'audio/ogg', 'audio/webm',
      'audio/flac', 'audio/aac'
    ];
    
    const isValidType = validTypes.includes(file.type) || 
                       file.name.match(/\.(wav|mp3|m4a|ogg|webm|flac|aac)$/i);
    
    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    if (!isValidType) {
      alert('Please select a valid audio file (WAV, MP3, M4A, OGG, WebM, FLAC, or AAC)');
      return;
    }
    
    if (file.size > maxSize) {
      alert('File is too large. Please select a file smaller than 50MB.');
      return;
    }
    
    if (file.size === 0) {
      alert('File is empty. Please select a valid audio file.');
      return;
    }
    
    setSelectedFile(file);
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

  const handleProcessFile = () => {
    if (selectedFile && onFileUpload) {
      onFileUpload(selectedFile);
      // Clear the file after processing starts
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUseSampleData = () => {
    if (onUseSampleData) {
      onUseSampleData();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Import Audio File</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isProcessing}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Drag and Drop Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
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
              accept=".wav,.mp3,.m4a,.ogg,.webm,.flac,.aac,audio/wav,audio/mpeg,audio/mp4,audio/ogg,audio/webm,audio/flac,audio/aac"
              onChange={handleFileInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isProcessing}
            />
            
            <div className="text-center">
              {selectedFile ? (
                <div className="space-y-3">
                  <FileAudio className="w-12 h-12 text-green-600 mx-auto" />
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
                <div className="space-y-3">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-base font-medium text-gray-900">
                      Drop your audio file here
                    </p>
                    <p className="text-sm text-gray-600">
                      or click to browse
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    Supports WAV, MP3, M4A, OGG, WebM, FLAC, and AAC (max 50MB)
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

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {/* Process File Button - shown when file is selected */}
            {selectedFile && !isProcessing && (
              <Button
                onClick={handleProcessFile}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                disabled={isProcessing}
              >
                <Upload className="w-4 h-4 mr-2" />
                Process "{selectedFile.name}"
              </Button>
            )}

            {/* Use Sample Data Button */}
            <Button
              onClick={handleUseSampleData}
              variant="outline"
              className="w-full"
              disabled={isProcessing}
            >
              Use Sample Data Instead
            </Button>

            {/* Cancel Button */}
            <Button
              onClick={onClose}
              variant="ghost"
              className="w-full"
              disabled={isProcessing}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportPopup; 