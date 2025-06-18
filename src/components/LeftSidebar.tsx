import React, { useState } from 'react';
import { AudioLines, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { useRecordings } from '@/hooks/useRecordings';
import { getRecordingUrl, deleteRecording } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthProvider';

interface LeftSidebarProps {
  visible: boolean;
  onToggle: () => void;
  onRecord: () => void;
  onImport: () => void;
  onUseSampleData?: () => void;
  isProcessing?: boolean;
  processingProgress?: number;
  onLogout?: () => void;
  onSelectRecording?: (audioUrl: string, recordingId: string) => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ 
  visible, 
  // onToggle, // Currently unused but kept for future functionality
  onRecord,
  onImport,
  onUseSampleData,
  isProcessing = false,
  processingProgress = 0,
  onLogout,
  onSelectRecording
}) => {
  // Fetch user recordings
  const { data: recordings, isLoading: recLoading, error: recError } = useRecordings();
  const { user } = useAuth();
  
  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    recordingId: string;
    recordingName: string;
  }>({ show: false, recordingId: '', recordingName: '' });
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ show: false, message: '', type: 'success' });

  // Auto-hide toast after 3 seconds
  React.useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, message: '', type: 'success' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const handleDeleteClick = (recordingId: string, recordingName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the recording selection
    setDeleteConfirm({
      show: true,
      recordingId,
      recordingName
    });
  };

  const handleDeleteConfirm = async () => {
    if (!user || !deleteConfirm.recordingId) return;
    
    setIsDeleting(deleteConfirm.recordingId);
    
    try {
      const result = await deleteRecording(deleteConfirm.recordingId, user.id);
      
      if (result.success) {
        setToast({
          show: true,
          message: `"${deleteConfirm.recordingName}" deleted successfully`,
          type: 'success'
        });
      } else {
        setToast({
          show: true,
          message: result.error || 'Failed to delete recording',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Delete error:', error);
      setToast({
        show: true,
        message: 'An error occurred while deleting the recording',
        type: 'error'
      });
    } finally {
      setIsDeleting(null);
      setDeleteConfirm({ show: false, recordingId: '', recordingName: '' });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, recordingId: '', recordingName: '' });
  };

  // Function to truncate long filenames
  const truncateFileName = (fileName: string, maxLength: number = 10) => {
    if (fileName.length <= maxLength) {
      return fileName;
    }
    return `${fileName.substring(0, 15)}....`;
  };

  return (
    <>
      <div className={`w-80 bg-gray-50 border-r border-gray-200 flex flex-col transition-transform duration-300 ${
        visible ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* SATE Logo/Title */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">SATE</h1>
              <p className="text-sm text-gray-600 mt-1">Speech Annotation and Transcription Enhancer</p>
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
        
        {/* Action Buttons */}
        <div className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Get Started</h3>
          
          <div className="flex gap-2">
            <Button
              onClick={onRecord}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isProcessing}
            >
              <div className="w-4 h-4 mr-2 bg-white rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
              Record
            </Button>
            
            <Button
              variant="outline"
              onClick={onImport}
              className="flex-1"
              disabled={isProcessing}
            >
              Import
            </Button>
          </div>

          {/* Sample Data Button */}
          <Button
            variant="outline"
            onClick={onUseSampleData}
            className="w-full text-sm bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300 hover:text-purple-800"
            disabled={isProcessing}
          >
                Use Sample Data
          </Button>

          {/* Processing Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 animate-spin text-blue-600">⟳</div>
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
        </div>
        
        {/* Recordings List */}
        <div className="flex-1 overflow-y-auto p-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <AudioLines className="w-4 h-4" /> Your Recordings
          </h3>
          {recLoading && <p className="text-xs text-gray-500">Loading...</p>}
          {recError && <p className="text-xs text-red-600">Failed to load recordings</p>}
          {(!recordings || recordings.length === 0) && !recLoading && (
            <p className="text-xs text-gray-500">No recordings yet.</p>
          )}
          <ul className="space-y-2">
            {recordings?.map((r) => (
              <li key={r.id} className="group">
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      if (!onSelectRecording) return;
                      const url = await getRecordingUrl(r.file_path);
                      if (url) {
                        onSelectRecording(url, r.id);
                      }
                    }}
                    className="flex-1 text-left text-sm text-gray-800 hover:bg-gray-100 p-2 rounded-lg flex justify-between"
                    title={r.file_name || r.file_path.split('/').pop() || ''}
                  >
                    <span className="truncate">{truncateFileName(r.file_name || r.file_path.split('/').pop() || '')}</span>
                    <span className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</span>
                  </button>
                  
                  <button
                    onClick={(e) => handleDeleteClick(r.id, r.file_name || r.file_path.split('/').pop() || 'Unknown', e)}
                    disabled={isDeleting === r.id}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all duration-200 disabled:opacity-50"
                    title="Delete recording"
                  >
                    {isDeleting === r.id ? (
                      <div className="w-4 h-4 animate-spin">⟳</div>
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Instructions */}
        <div className="p-6 mt-auto border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-800 mb-2">How it works</h4>
          <ol className="text-xs text-gray-600 space-y-1">
            <li>1. Record or import an audio file</li>
            <li>2. Wait for AI analysis</li>
            <li>3. Review speech patterns</li>
            <li>4. Export results</li>
          </ol>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Recording</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete "<strong>{truncateFileName(deleteConfirm.recordingName)}</strong>"? 
              This will permanently remove the recording and all associated data.
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={handleDeleteCancel}
                disabled={isDeleting !== null}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                disabled={isDeleting !== null}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 animate-spin mr-2">⟳</div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transition-all duration-300 ${
          toast.type === 'success' 
            ? 'bg-green-100 border border-green-200 text-green-800' 
            : 'bg-red-100 border border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              toast.type === 'success' ? 'bg-green-200' : 'bg-red-200'
            }`}>
              {toast.type === 'success' ? '✓' : '✕'}
            </div>
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default LeftSidebar; 