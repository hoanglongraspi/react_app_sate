import React, { useRef } from 'react';

interface ModalsProps {
  showRecordingModal: boolean;
  showUploadModal: boolean;
  isRecording: boolean;
  recordingTime: number;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onCloseUpload: () => void;
  onFileUpload: (file: File) => void;
}

const Modals: React.FC<ModalsProps> = ({
  showRecordingModal,
  showUploadModal,
  isRecording,
  recordingTime,
  onStopRecording,
  onPauseRecording,
  onCloseUpload,
  onFileUpload
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <>
      {/* Recording Modal */}
      {showRecordingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="modal-content">
            <h3 className="text-lg font-semibold mb-5">Recording</h3>
            <div className="h-24 bg-neutral-lighter rounded-lg mb-4 flex items-center justify-center">
              <div 
                id="waveform" 
                className="w-4/5 h-14" 
                style={{
                  backgroundImage: 'linear-gradient(90deg, #5d6cfa 1px, transparent 1px), linear-gradient(90deg, rgba(93, 108, 250, 0.5) 1px, transparent 1px)',
                  backgroundSize: '10px 100%, 5px 100%'
                }}
              />
            </div>
            <div className="text-center text-3xl font-bold mb-4 recording-time">
              {formatTime(recordingTime)}
            </div>
            <div className="flex justify-center">
              <button 
                onClick={onStopRecording}
                className="btn btn-danger mx-2 py-2 px-5 rounded-full"
              >
                Stop
              </button>
              <button 
                onClick={onPauseRecording}
                className="btn btn-secondary mx-2 py-2 px-5 rounded-full"
              >
                Pause
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="modal-content">
            <h3 className="text-lg font-semibold mb-5">Import Audio</h3>
            <form className="mt-4" onSubmit={(e) => e.preventDefault()}>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="audio/*" 
                onChange={handleFileChange}
                className="w-full mb-5"
              />
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={onCloseUpload}
                  className="btn btn-secondary flex-1 py-2.5"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-primary flex-1 py-2.5"
                >
                  Select File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Morpheme Annotation Detail Popup */}
      <div 
        id="morphemeDetailPopup" 
        className="fixed hidden p-4 bg-white rounded-lg shadow-lg z-50" 
        style={{ minWidth: '320px' }}
      >
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-medium text-green-800">Inflectional morpheme</h4>
          <button className="text-neutral-dark hover:text-black text-xs">
            <i className="material-icons" style={{ fontSize: '16px' }}>close</i>
          </button>
        </div>
        <div className="flex flex-col space-y-3">
          <div className="flex gap-4 justify-center mb-1">
            <div className="py-2 px-6 bg-green-100 rounded text-center text-green-800 border border-green-200">
              <span className="font-medium">want</span>
            </div>
            <div className="py-2 px-6 bg-red-100 rounded text-center text-red-800 border border-red-200">
              <span className="font-medium">-s</span>
            </div>
          </div>
          <div className="text-sm text-center font-medium py-1 mb-2 text-green-800">
            3rd person singular
          </div>
          <div className="flex justify-between text-xs text-green-700">
            <span>Start:</span>
            <span className="font-medium">16.715</span>
          </div>
          <div className="flex justify-between text-xs text-green-700">
            <span>End:</span>
            <span className="font-medium">17.035</span>
          </div>
        </div>
      </div>

      {/* Annotation Detail Popup */}
      <div 
        id="annotationDetailPopup" 
        className="fixed hidden p-3 bg-white rounded-lg shadow-lg z-50" 
        style={{ minWidth: '200px' }}
      >
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-medium">Pause</h4>
          <button className="text-neutral-dark hover:text-black text-xs">
            <i className="material-icons" style={{ fontSize: '16px' }}>close</i>
          </button>
        </div>
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-neutral-darker">Start:</span>
            <span className="font-medium">00:05.2</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-darker">End:</span>
            <span className="font-medium">00:07.2</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-darker">Duration:</span>
            <span className="font-medium">2.0s</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Modals; 