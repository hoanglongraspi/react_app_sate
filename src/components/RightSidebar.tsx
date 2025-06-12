import React from 'react';
import { FileText } from 'lucide-react';
import { type IssueCounts, type Segment } from '../services/dataService';

interface RightSidebarProps {
  visible: boolean;
  onToggle: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  issueCounts: IssueCounts;
  duration: number;
  transcriptData: Segment[];
  activeFilters: string[];
}

const RightSidebar: React.FC<RightSidebarProps> = ({ 
  visible, 
  // onToggle, // Currently unused but kept for future functionality
  activeTab, 
  onTabChange, 
  issueCounts, 
  duration, 
  transcriptData, 
  activeFilters 
}) => {
  // Calculate total issues
  const totalIssues = Object.values(issueCounts).reduce((sum, count) => sum + count, 0);
  
  // Calculate total words
  const calculateTotalWords = () => {
    if (!transcriptData) return 0;
    
    return transcriptData.reduce((count, segment) => {
      return count + segment.words.length;
    }, 0);
  };

  const totalWords = calculateTotalWords();
  
  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate speech rate (assuming average words per minute)
  const calculateSpeechRate = () => {
    if (!transcriptData || duration === 0) return 0;
    
    const wordsPerMinute = Math.round((totalWords / duration) * 60);
    return wordsPerMinute;
  };

  const speechRate = calculateSpeechRate();

  // Get speech rate quality
  const getSpeechRateQuality = (wpm: number) => {
    if (wpm >= 150 && wpm <= 180) return { label: 'Good', color: 'text-green-600 bg-green-100' };
    if (wpm >= 120 && wpm < 150) return { label: 'Slow', color: 'text-yellow-600 bg-yellow-100' };
    if (wpm > 180) return { label: 'Fast', color: 'text-orange-600 bg-orange-100' };
    return { label: 'Very Slow', color: 'text-red-600 bg-red-100' };
  };

  const speechQuality = getSpeechRateQuality(speechRate);

  // Get top issues
  const getTopIssues = () => {
    const issues = [
      { name: 'Pause', count: issueCounts.pause, color: 'bg-blue-500' },
      { name: 'Filler words', count: issueCounts.filler, color: 'bg-orange-500' },
      { name: 'Repetition', count: issueCounts.repetition, color: 'bg-yellow-500' },
      { name: 'Morphemes', count: issueCounts['morpheme-omission'] + issueCounts.morpheme, color: 'bg-green-500' },
    ];
    
    return issues
      .filter(issue => issue.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  };

  const topIssues = getTopIssues();

  return (
    <div className={`w-80 bg-gray-50 border-l border-gray-200 flex flex-col transition-transform duration-300 ${
      visible ? 'translate-x-0' : 'translate-x-full'
    }`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-800">Speech Analysis</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'issues', label: 'Issues' },
            { id: 'annotations', label: 'Active Annotations' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Total Issues</div>
                <div className="text-2xl font-bold text-gray-800">{totalIssues}</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Duration</div>
                <div className="text-2xl font-bold text-gray-800">{formatDuration(duration)}</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200 col-span-2">
                <div className="text-sm text-gray-600 mb-1">Total Words</div>
                <div className="text-2xl font-bold text-gray-800">{totalWords.toLocaleString()}</div>
              </div>
            </div>

            {/* Top Issues */}
            <div>
              <h3 className="text-sm font-medium text-gray-800 mb-3">Top Issues</h3>
              <div className="space-y-3">
                {topIssues.map((issue) => (
                  <div key={issue.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${issue.color}`}></div>
                      <span className="text-sm text-gray-700">{issue.name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-800">{issue.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Speech Rate */}
            <div>
              <h3 className="text-sm font-medium text-gray-800 mb-3">Speech rate</h3>
              <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
                <div className="text-3xl font-bold text-gray-800 mb-1">
                  {speechRate} <span className="text-lg font-normal text-gray-600">wpm</span>
                </div>
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${speechQuality.color}`}>
                  {speechQuality.label}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'issues' && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-800">All Issues</h3>
            <div className="space-y-3">
              {Object.entries(issueCounts).map(([type, count]) => {
                if (count === 0) return null;
                
                const getIssueColor = (issueType: string) => {
                  switch (issueType) {
                    case 'pause': return 'bg-blue-500';
                    case 'filler': return 'bg-orange-500';
                    case 'repetition': return 'bg-yellow-500';
                    case 'mispronunciation': return 'bg-purple-500';
                    case 'morpheme-omission': return 'bg-green-500';
                    case 'revision': return 'bg-pink-500';
                    case 'utterance-error': return 'bg-red-500';
                    default: return 'bg-gray-500';
                  }
                };

                const getIssueLabel = (issueType: string) => {
                  switch (issueType) {
                    case 'morpheme-omission': return 'Morpheme Omission';
                    case 'utterance-error': return 'Utterance Error';
                    default: return issueType.charAt(0).toUpperCase() + issueType.slice(1);
                  }
                };

                return (
                  <div key={type} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getIssueColor(type)}`}></div>
                      <span className="text-sm text-gray-700">{getIssueLabel(type)}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-800">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'annotations' && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-800">Active Filters</h3>
            <div className="space-y-2">
              {activeFilters.length === 0 ? (
                <p className="text-sm text-gray-500">No active annotations</p>
              ) : (
                activeFilters.map((filter) => {
                  const getFilterColor = (filterType: string) => {
                    switch (filterType) {
                      case 'pause': return 'bg-blue-100 text-blue-800';
                      case 'filler': return 'bg-orange-100 text-orange-800';
                      case 'repetition': return 'bg-yellow-100 text-yellow-800';
                      case 'mispronunciation': return 'bg-purple-100 text-purple-800';
                      case 'morpheme-omission': return 'bg-green-100 text-green-800';
                      case 'revision': return 'bg-pink-100 text-pink-800';
                      case 'utterance-error': return 'bg-red-100 text-red-800';
                      default: return 'bg-gray-100 text-gray-800';
                    }
                  };

                  const getFilterLabel = (filterType: string) => {
                    switch (filterType) {
                      case 'morpheme-omission': return 'Morpheme Omission';
                      case 'utterance-error': return 'Utterance Error';
                      default: return filterType.charAt(0).toUpperCase() + filterType.slice(1);
                    }
                  };

                  return (
                    <div key={filter} className={`px-3 py-2 rounded-lg text-sm font-medium ${getFilterColor(filter)}`}>
                      {getFilterLabel(filter)}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RightSidebar; 