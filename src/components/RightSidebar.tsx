import React from 'react';
import { 
  BarChart3, 
  AlertTriangle, 
  Filter, 
  Clock, 
  MessageSquare, 
  Target,
  TrendingUp,
  Activity,
  Hash
} from 'lucide-react';
import { type IssueCounts, type Segment } from '../services/dataService';
import { getBackgroundColor, getLightBackgroundColor, getAnnotationLabel, getAnnotationDescription } from '../lib/annotationColors';

import { type SpeechAnalysis } from '../services/dataService';

interface RightSidebarProps {
  visible: boolean;
  onToggle: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  issueCounts: IssueCounts;
  duration: number;
  transcriptData: Segment[];
  activeFilters: string[];
  speechAnalysis?: SpeechAnalysis;
  selectedSpeaker?: string;
  onSpeakerChange?: (speaker: string) => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ 
  visible, 
  // onToggle, // Currently unused but kept for future functionality
  activeTab, 
  onTabChange, 
  issueCounts,  
  transcriptData, 
  activeFilters,
  selectedSpeaker,
  onSpeakerChange
}) => {
  // Get all available speakers
  const allSpeakers = Array.from(new Set(transcriptData.map(segment => segment.speaker)));
  
  // Calculate utterance counts for each speaker to determine default
  const speakerUtteranceCounts = allSpeakers.reduce((counts, speaker) => {
    counts[speaker] = transcriptData.filter(segment => segment.speaker === speaker).length;
    return counts;
  }, {} as Record<string, number>);
  
  // Get default speaker (speaker with most utterances)
  const defaultSpeaker = allSpeakers.reduce((maxSpeaker, speaker) => 
    speakerUtteranceCounts[speaker] > speakerUtteranceCounts[maxSpeaker] ? speaker : maxSpeaker
  , allSpeakers[0] || '');
  
  // Use selected speaker or default
  const currentSpeaker = selectedSpeaker || defaultSpeaker;
  
  // Filter transcript data by selected speaker
  const speakerTranscriptData = transcriptData.filter(segment => segment.speaker === currentSpeaker);
  
  // Calculate speaker-specific issue counts
  const speakerIssueCounts = {
    pause: 0,
    filler: 0,
    repetition: 0,
    mispronunciation: 0,
    morpheme: 0,
    'morpheme-omission': 0,
    revision: 0,
    'utterance-error': 0
  };
  
  speakerTranscriptData.forEach(segment => {
    if (segment.fillerwords) speakerIssueCounts.filler += segment.fillerwords.length;
    if (segment.repetitions) speakerIssueCounts.repetition += segment.repetitions.length;
    if (segment.pauses) speakerIssueCounts.pause += segment.pauses.length;
    if (segment['utterance-error']) speakerIssueCounts['utterance-error'] += segment['utterance-error'].length;
    if (segment.mispronunciation) speakerIssueCounts.mispronunciation += segment.mispronunciation.length;
    if (segment.morpheme_omissions) speakerIssueCounts['morpheme-omission'] += segment.morpheme_omissions.length;
    if (segment.morphemes) {
      const visibleMorphemes = segment.morphemes.filter((morpheme: any) => 
        morpheme.morpheme_form && morpheme.morpheme_form !== '<IRR>'
      );
      speakerIssueCounts.morpheme += visibleMorphemes.length;
    }
    if (segment.revision) speakerIssueCounts.revision += segment.revision.length;
  });
  
  // Calculate total issues for selected speaker
  const totalIssues = Object.values(speakerIssueCounts).reduce((sum, count) => sum + count, 0);
  
  // Calculate total words (excluding fillers and punctuation) for selected speaker
  const calculateTotalWords = () => {
    if (!speakerTranscriptData) return 0;
    
    // Filter out filler words and punctuation (same logic as NTW)
    const isFillerOrPunctuation = (word: string): boolean => {
      const cleanWord = word.toLowerCase().replace(/[.,!?;:]/g, '');
      return !cleanWord || 
             cleanWord === 'um' || 
             cleanWord === 'uh' || 
             word.includes('[') || 
             word.includes(']') ||
             /^[.,!?;:]+$/.test(word);
    };
    
    return speakerTranscriptData.reduce((count, segment) => {
      return count + segment.words.filter(word => !isFillerOrPunctuation(word.word)).length;
    }, 0);
  };

  const totalWords = calculateTotalWords();
  
  // Calculate NDW (Number of Different Words) for selected speaker
  const calculateNDW = () => {
    // Fallback: calculate from speaker transcript data
    if (!speakerTranscriptData) return 0;
    
    const uniqueWords = new Set<string>();
    
    const isFillerOrPunctuation = (word: string): boolean => {
      const cleanWord = word.toLowerCase().replace(/[.,!?;:]/g, '');
      return !cleanWord || 
             cleanWord === 'um' || 
             cleanWord === 'uh' || 
             word.includes('[') || 
             word.includes(']') ||
             /^[.,!?;:]+$/.test(word);
    };
    
    speakerTranscriptData.forEach(segment => {
      segment.words.forEach(word => {
        if (!isFillerOrPunctuation(word.word)) {
          const cleanWord = word.word.toLowerCase().replace(/[.,!?;:]/g, '');
          if (cleanWord) {
            uniqueWords.add(cleanWord);
          }
        }
      });
    });
    
    return uniqueWords.size;
  };

  const ndw = calculateNDW();
  
  // Calculate MLUw (Mean Length of Utterance in Words) for selected speaker
  const calculateMLUw = () => {
    if (!speakerTranscriptData || speakerTranscriptData.length === 0) return 0;
    
    // Filter to valid segments with meaningful words
    const validSegments = speakerTranscriptData.filter(segment => 
      segment.words.some(word => {
        const cleanWord = word.word.toLowerCase().replace(/[.,!?;:]/g, '');
        return cleanWord && 
               cleanWord !== 'um' && 
               cleanWord !== 'uh' && 
               !word.word.includes('[') && 
               !word.word.includes(']');
      })
    );
    
    if (validSegments.length === 0) return 0;
    
    // Count valid words per segment and calculate average
    let totalValidWords = 0;
    validSegments.forEach(segment => {
      const validWords = segment.words.filter(word => {
        const cleanWord = word.word.toLowerCase().replace(/[.,!?;:]/g, '');
        return cleanWord && 
               cleanWord !== 'um' && 
               cleanWord !== 'uh' && 
               !word.word.includes('[') && 
               !word.word.includes(']');
      });
      totalValidWords += validWords.length;
    });
    
    return totalValidWords / validSegments.length;
  };

  // Calculate MLUm (Mean Length of Utterance in Morphemes) for selected speaker  
  const calculateMLUm = () => {
    if (!speakerTranscriptData || speakerTranscriptData.length === 0) return 0;
    
    // Filter to valid segments with meaningful words
    const validSegments = speakerTranscriptData.filter(segment => 
      segment.words.some(word => {
        const cleanWord = word.word.toLowerCase().replace(/[.,!?;:]/g, '');
        return cleanWord && 
               cleanWord !== 'um' && 
               cleanWord !== 'uh' && 
               !word.word.includes('[') && 
               !word.word.includes(']');
      })
    );
    
    if (validSegments.length === 0) return 0;
    
    let totalMorphemes = 0;
    
    validSegments.forEach(segment => {
      let segmentMorphemes = 0;
      
      // Count morphemes for each valid word in the segment
      const validWords = segment.words.filter(word => {
        const cleanWord = word.word.toLowerCase().replace(/[.,!?;:]/g, '');
        return cleanWord && 
               cleanWord !== 'um' && 
               cleanWord !== 'uh' && 
               !word.word.includes('[') && 
               !word.word.includes(']');
      });
      
      validWords.forEach((validWord) => {
        // Check if this word has a morpheme annotation with non-IRR morpheme_form
        const morpheme = segment.morphemes?.find((m: any) => {
          const cleanWord = validWord.word.replace(/[.,!?;:]$/, '');
          const cleanMorphemeWord = m.word.replace(/[.,!?;:]$/, '');
          return cleanWord === cleanMorphemeWord;
        });
        
        if (morpheme && morpheme.morpheme_form && morpheme.morpheme_form !== '<IRR>') {
          // Word with morpheme annotation (non-IRR) = 2 morphemes (lemma + morpheme_form)
          segmentMorphemes += 2;
        } else {
          // Regular word or IRR morpheme = 1 morpheme
          segmentMorphemes += 1;
        }
      });
      
      totalMorphemes += segmentMorphemes;
    });
    
    return totalMorphemes / validSegments.length;
  };

  const mluw = calculateMLUw();
  const mlum = calculateMLUm();
  
  // Calculate speech rate for selected speaker
  const calculateSpeechRate = () => {
    if (!speakerTranscriptData || speakerTranscriptData.length === 0) return 0;
    
    // Calculate duration for selected speaker
    const speakerDuration = speakerTranscriptData.reduce((total, segment) => {
      return total + (segment.end - segment.start);
    }, 0);
    
    if (speakerDuration === 0) return 0;
    
    const wordsPerMinute = Math.round((totalWords / speakerDuration) * 60);
    return wordsPerMinute;
  };

  const speechRate = calculateSpeechRate();

  // Get speech rate quality
  const getSpeechRateQuality = (wpm: number) => {
    if (wpm >= 150 && wpm <= 180) return { 
      label: 'Optimal', 
      color: 'text-green-700 bg-green-100 border-green-200',
      description: 'Great speaking pace'
    };
    if (wpm >= 120 && wpm < 150) return { 
      label: 'Slow', 
      color: 'text-yellow-700 bg-yellow-100 border-yellow-200',
      description: 'Consider increasing pace'
    };
    if (wpm > 180 && wpm <= 220) return { 
      label: 'Fast', 
      color: 'text-orange-700 bg-orange-100 border-orange-200',
      description: 'Consider slowing down'
    };
    if (wpm > 220) return { 
      label: 'Very Fast', 
      color: 'text-red-700 bg-red-100 border-red-200',
      description: 'Too fast for comprehension'
    };
    return { 
      label: 'Very Slow', 
      color: 'text-red-700 bg-red-100 border-red-200',
      description: 'Too slow, may lose attention'
    };
  };

  const speechQuality = getSpeechRateQuality(speechRate);

  // Get top issues for selected speaker
  const getTopIssues = () => {
    const issues = [
      { name: 'Pauses', count: speakerIssueCounts.pause, color: getBackgroundColor('pause'), type: 'pause', icon: Clock },
      { name: 'Filler Words', count: speakerIssueCounts.filler, color: getBackgroundColor('filler'), type: 'filler', icon: MessageSquare },
      { name: 'Repetition', count: speakerIssueCounts.repetition, color: getBackgroundColor('repetition'), type: 'repetition', icon: Target },
      { name: 'Morphemes', count: speakerIssueCounts['morpheme-omission'] + (speakerIssueCounts.morpheme || 0), color: getBackgroundColor('morpheme-omission'), type: 'morpheme-omission', icon: Activity },
    ];
    
    return issues
      .filter(issue => issue.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  };

  const topIssues = getTopIssues();

  // Calculate error rate for better insights
  const errorRate = totalWords > 0 ? ((totalIssues / totalWords) * 100) : 0;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3, color: 'gray' },
    { id: 'language', label: 'Language', icon: Activity, color: 'blue' },
    { id: 'issues', label: 'Issues', icon: AlertTriangle, color: 'red' },
    { id: 'annotations', label: 'Filters', icon: Filter, color: 'purple' }
  ];

  return (
    <div className={`w-80 bg-white border-l border-gray-200 flex flex-col transition-transform duration-300 ${
      visible ? 'translate-x-0' : 'translate-x-full'
    }`}>
      {/* Simple Header */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-200">
            <BarChart3 className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Speech Analysis</h2>
            <p className="text-sm text-gray-600">Real-time insights</p>
          </div>
        </div>
      </div>

      {/* Speaker Selection */}
      {allSpeakers.length > 1 && (
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="mb-2">
            <label className="text-xs font-medium text-gray-700 mb-1 block">Speaker Analysis</label>
            <select
              value={currentSpeaker}
              onChange={(e) => onSpeakerChange?.(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {allSpeakers.map(speaker => (
                <option key={speaker} value={speaker}>
                  {speaker} ({speakerUtteranceCounts[speaker]} utterances)
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs text-gray-500">
            Analyzing data for {currentSpeaker}
            {currentSpeaker === defaultSpeaker && ' (default)'}
          </div>
        </div>
      )}

      {/* Simple Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            const getTabColors = (color: string, active: boolean) => {
              const colors = {
                gray: {
                  active: 'text-gray-800 border-gray-600 bg-gray-50',
                  inactive: 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                },
                blue: {
                  active: 'text-blue-700 border-blue-600 bg-blue-50',
                  inactive: 'text-blue-500 border-transparent hover:text-blue-700 hover:bg-blue-50'
                },
                red: {
                  active: 'text-red-700 border-red-600 bg-red-50',
                  inactive: 'text-red-500 border-transparent hover:text-red-700 hover:bg-red-50'
                },
                purple: {
                  active: 'text-purple-700 border-purple-600 bg-purple-50',
                  inactive: 'text-purple-500 border-transparent hover:text-purple-700 hover:bg-purple-50'
                }
              };
              return active ? colors[color as keyof typeof colors].active : colors[color as keyof typeof colors].inactive;
            };
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 px-3 py-3 text-xs font-medium border-b-2 transition-all duration-200 flex flex-col items-center gap-1 ${getTabColors(tab.color, isActive)}`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {activeTab === 'overview' && (
          <div className="p-4 space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-red-50 rounded-lg border border-red-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-red-100 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <span className="text-xs font-medium text-red-700">Total Issues</span>
                </div>
                <div className="text-2xl font-bold text-red-800">{totalIssues}</div>
                <div className="text-xs text-red-600">
                  {errorRate.toFixed(1)}% error rate
                </div>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-purple-100 rounded-lg">
                    <Clock className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-xs font-medium text-purple-700">Pause/Word Ratio</span>
                </div>
                <div className="text-2xl font-bold text-purple-800">
                  {totalWords > 0 ? (speakerIssueCounts.pause / totalWords).toFixed(3) : '0.000'}
                </div>
                <div className="text-xs text-purple-600">
                  {speakerIssueCounts.pause} pauses / {totalWords} words
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-blue-100 rounded-lg">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-blue-700">Total Words</span>
                </div>
                <div className="text-2xl font-bold text-blue-800">{totalWords.toLocaleString()}</div>
                <div className="text-xs text-blue-600">
                  All words counted
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg border border-green-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-green-100 rounded-lg">
                    <Hash className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-xs font-medium text-green-700">Different Words</span>
                </div>
                <div className="text-2xl font-bold text-green-800">{ndw.toLocaleString()}</div>
                <div className="text-xs text-green-600">
                  Unique vocabulary
                </div>
              </div>
            </div>

            {/* Speech Rate Analysis */}
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-gray-100 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-gray-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800">Speech Rate Analysis</h3>
              </div>
              
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {speechRate} <span className="text-lg font-normal text-gray-600">wpm</span>
                </div>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${speechQuality.color}`}>
                  {speechQuality.label}
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-3">{speechQuality.description}</p>
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      speechRate >= 150 && speechRate <= 180 ? 'bg-green-500' :
                      speechRate >= 120 && speechRate < 150 ? 'bg-yellow-500' :
                      speechRate > 180 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((speechRate / 250) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0</span>
                  <span>Optimal: 150-180</span>
                  <span>250+</span>
                </div>
              </div>
            </div>

            {/* Top Issues */}
            {topIssues.length > 0 && (
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Most Frequent Issues</h3>
                <div className="space-y-3">
                  {topIssues.map((issue) => {
                    const Icon = issue.icon;
                    return (
                      <div key={issue.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-lg bg-white">
                            <Icon className="w-4 h-4 text-gray-600" />
                          </div>
                                                     <div>
                             <span className="text-sm font-medium text-gray-700">{issue.name}</span>
                             <div className="text-xs text-gray-500">
                               {totalWords > 0 ? ((issue.count / totalWords) * 100).toFixed(1) : '0.0'}% of words
                             </div>
                           </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-800">{issue.count}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'language' && (
          <div className="p-4 space-y-6">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Core Language Metrics</h3>
              
              {/* Core Language Metrics */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="text-xs font-medium text-blue-700 mb-1">NTW</div>
                  <div className="text-xl font-bold text-blue-800">{totalWords}</div>
                  <div className="text-xs text-blue-600">Total Words</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                  <div className="text-xs font-medium text-green-700 mb-1">NDW</div>
                  <div className="text-xl font-bold text-green-800">{ndw}</div>
                  <div className="text-xs text-green-600">Different Words</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="text-xs font-medium text-purple-700 mb-1">MLUw</div>
                  <div className="text-xl font-bold text-purple-800">{mluw.toFixed(2)}</div>
                  <div className="text-xs text-purple-600">Mean Length (Words)</div>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                  <div className="text-xs font-medium text-orange-700 mb-1">MLUm</div>
                  <div className="text-xl font-bold text-orange-800">{mlum.toFixed(2)}</div>
                  <div className="text-xs text-orange-600">Mean Length (Morphemes)</div>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-xs font-medium text-gray-700 mb-1">Pauses</div>
                <div className="text-xl font-bold text-gray-800">{speakerIssueCounts.pause}</div>
                <div className="text-xs text-gray-600">Total pauses in speech</div>
              </div>
            </div>

            {/* Lexical Diversity */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-800 mb-4">Lexical Diversity</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">NDW/NTW Ratio</span>
                    <span className="text-lg font-bold text-gray-800">
                      {totalWords > 0 ? (ndw / totalWords).toFixed(3) : '0.000'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min((ndw / Math.max(totalWords, 1)) * 100, 100)}%` 
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Low (0.0)</span>
                    <span>Good (0.5)</span>
                    <span>High (1.0)</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {(() => {
                      const ratio = ndw / Math.max(totalWords, 1);
                      if (ratio >= 0.5) return "🟢 Excellent vocabulary variety";
                      if (ratio >= 0.35) return "🟡 Good vocabulary variety";
                      if (ratio >= 0.25) return "🟠 Moderate vocabulary variety";
                      return "🔴 Limited vocabulary variety";
                    })()}
                  </div>
                </div>
                
                {/* Additional Lexical Metrics */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <div className="text-xs text-blue-600 mb-1">Unique Words</div>
                      <div className="text-lg font-bold text-blue-800">{ndw}</div>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <div className="text-xs text-blue-600 mb-1">Word Repetition</div>
                      <div className="text-lg font-bold text-blue-800">
                        {totalWords > 0 ? (((totalWords - ndw) / totalWords) * 100).toFixed(1) : '0.0'}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Morphological Complexity */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-800 mb-4">Morphological Complexity</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">MLUm/MLUw Ratio</span>
                    <span className="text-lg font-bold text-gray-800">
                      {mluw > 0 ? (mlum / mluw).toFixed(3) : '0.000'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min(Math.max(((mlum / Math.max(mluw, 1)) - 1) * 100, 0), 100)}%` 
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Simple (1.0)</span>
                    <span>Moderate (1.3)</span>
                    <span>Complex (1.5+)</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {(() => {
                      const ratio = mlum / Math.max(mluw, 1);
                      if (ratio >= 1.4) return "🟢 High morphological complexity";
                      if (ratio >= 1.2) return "🟡 Moderate morphological complexity";
                      if (ratio >= 1.1) return "🟠 Low morphological complexity";
                      return "🔴 Very limited morphological complexity";
                    })()}
                  </div>
                </div>
                
                {/* Additional Morphological Metrics */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <div className="text-xs text-green-600 mb-1">Avg Morphemes/Word</div>
                      <div className="text-lg font-bold text-green-800">
                        {mluw > 0 ? (mlum / mluw).toFixed(2) : '0.00'}
                      </div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <div className="text-xs text-green-600 mb-1">Total Morphemes</div>
                      <div className="text-lg font-bold text-green-800">
                        {Math.round(mlum * speakerUtteranceCounts[currentSpeaker])}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Speaker Summary */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-800 mb-4">Speaker Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Speaking Time</span>
                  <span className="text-lg font-bold text-gray-800">
                    {speakerTranscriptData.reduce((total, segment) => total + (segment.end - segment.start), 0).toFixed(1)}s
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Error Rate</span>
                  <span className="text-lg font-bold text-gray-800">
                    {totalWords > 0 ? ((totalIssues / totalWords) * 100).toFixed(1) : '0.0'}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Average Words per Utterance</span>
                  <span className="text-lg font-bold text-gray-800">
                    {speakerUtteranceCounts[currentSpeaker] > 0 ? (totalWords / speakerUtteranceCounts[currentSpeaker]).toFixed(1) : '0.0'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'issues' && (
          <div className="p-4 space-y-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">All Issues Detected</h3>
              <div className="space-y-3">
                {Object.entries(speakerIssueCounts)
                  .filter(([, count]) => count > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => {
                    const percentage = totalWords > 0 ? ((count / totalWords) * 100) : 0;
                    
                    return (
                      <div key={type} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full ${getBackgroundColor(type)}`}></div>
                            <span className="text-sm font-medium text-gray-800">{getAnnotationLabel(type)}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-800">{count}</div>
                            <div className="text-xs text-gray-500">{(percentage || 0).toFixed(1)}%</div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed ml-7">
                          {getAnnotationDescription(type)}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'annotations' && (
          <div className="p-4 space-y-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Active Filters</h3>
              <div className="space-y-3">
                {activeFilters.length === 0 ? (
                  <div className="text-center py-8">
                    <Filter className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No active filters</p>
                    <p className="text-xs text-gray-400 mt-1">Select filters to highlight specific annotations</p>
                  </div>
                ) : (
                  activeFilters
                    .sort((a, b) => {
                      const countA = issueCounts[a as keyof IssueCounts] || 0;
                      const countB = issueCounts[b as keyof IssueCounts] || 0;
                      return countB - countA; // Decreasing order
                    })
                    .map((filter) => {
                      const count = speakerIssueCounts[filter as keyof IssueCounts] || 0;
                      const percentage = totalWords > 0 ? ((count / totalWords) * 100) : 0;
                      
                      return (
                        <div key={filter} className={`p-4 rounded-lg border ${getLightBackgroundColor(filter)} hover:shadow-md transition-shadow`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${getBackgroundColor(filter)}`}></div>
                              <span className="text-sm font-medium text-gray-800">{getAnnotationLabel(filter)}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-800">{count}</div>
                              <div className="text-xs text-gray-500">{(percentage || 0).toFixed(1)}%</div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RightSidebar; 