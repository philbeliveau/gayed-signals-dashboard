'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Video, 
  VideoDetails, 
  Folder, 
  VideoSummaryRequest, 
  ProcessingStatus,
  VideoInsightsState,
  VideoSearchParams 
} from '../../../lib/types/video-insights';
import { videoInsightsAPI } from '../../../lib/api/video-insights';
import VideoInput from '../../components/video-insights/VideoInput';
import TranscriptViewer from '../../components/video-insights/TranscriptViewer';
import SummaryPanel from '../../components/video-insights/SummaryPanel';
import FolderSidebar from '../../components/video-insights/FolderSidebar';
import { 
  Search, 
  Play, 
  Clock, 
  FileText, 
  Folder as FolderIcon, 
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Youtube,
  Eye,
  Calendar,
  User
} from 'lucide-react';

const POLLING_INTERVAL = 2000; // 2 seconds

export default function VideoInsightsPage() {
  // State management
  const [state, setState] = useState<VideoInsightsState>({
    currentVideo: null,
    videos: [],
    folders: [],
    selectedFolder: null,
    searchQuery: '',
    selectedSummaryMode: 'bullet',
    isProcessing: false,
    processingStatus: null,
    searchResults: null,
    loading: true,
    error: null,
  });

  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Set up polling for processing status
  useEffect(() => {
    if (state.processingStatus && state.processingStatus.status === 'processing') {
      const intervalId = setInterval(() => {
        pollProcessingStatus();
      }, POLLING_INTERVAL);
      setPollingIntervalId(intervalId);

      return () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    } else if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
    }
  }, [state.processingStatus]);

  const loadInitialData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const [videosResult, foldersResult] = await Promise.all([
        videoInsightsAPI.listVideos({ 
          sort_by: 'created_at', 
          sort_order: 'desc',
          per_page: 20 
        }),
        videoInsightsAPI.listFolders()
      ]);

      setState(prev => ({
        ...prev,
        videos: videosResult.videos,
        folders: foldersResult,
        loading: false,
      }));
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load data',
      }));
    }
  };

  const pollProcessingStatus = async () => {
    if (!state.processingStatus?.task_id) return;

    try {
      const status = await videoInsightsAPI.getProcessingStatus(state.processingStatus.task_id);
      setState(prev => ({ ...prev, processingStatus: status }));

      if (status.status === 'completed' || status.status === 'failed') {
        // Refresh video list to get the completed video
        await refreshVideoList();
        setState(prev => ({ 
          ...prev, 
          isProcessing: false,
          processingStatus: null 
        }));
      }
    } catch (error) {
      console.error('Failed to poll processing status:', error);
    }
  };

  const refreshVideoList = async () => {
    try {
      const result = await videoInsightsAPI.listVideos({
        folder_id: state.selectedFolder?.id,
        sort_by: 'created_at',
        sort_order: 'desc',
        per_page: 20
      });
      setState(prev => ({ ...prev, videos: result.videos }));
    } catch (error) {
      console.error('Failed to refresh video list:', error);
    }
  };

  const handleVideoSubmit = async (request: VideoSummaryRequest) => {
    try {
      setState(prev => ({ 
        ...prev, 
        isProcessing: true, 
        error: null,
        selectedSummaryMode: request.summary_mode
      }));

      const response = await videoInsightsAPI.createVideoSummary(request);
      
      setState(prev => ({
        ...prev,
        processingStatus: {
          task_id: response.task_id || '',
          status: 'queued',
          progress: 0,
          stage: 'downloading',
          estimated_completion: response.estimated_completion_time || 240,
        }
      }));

      // Refresh video list to show the new video
      await refreshVideoList();
    } catch (error) {
      console.error('Failed to submit video:', error);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Failed to process video',
      }));
    }
  };

  const handleVideoSelect = async (videoId: string) => {
    try {
      setSelectedVideoId(videoId);
      setState(prev => ({ ...prev, loading: true }));

      const videoDetails = await videoInsightsAPI.getVideoDetails(videoId);
      setState(prev => ({ 
        ...prev, 
        currentVideo: videoDetails.video,
        loading: false 
      }));
    } catch (error) {
      console.error('Failed to load video details:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load video',
      }));
    }
  };

  const handleSearch = async (query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));

    if (!query.trim()) {
      setState(prev => ({ ...prev, searchResults: null }));
      return;
    }

    try {
      const results = await videoInsightsAPI.searchContent(query, state.selectedFolder?.id);
      setState(prev => ({ ...prev, searchResults: results }));
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleFolderSelect = (folderId: string | null) => {
    const folder = folderId ? state.folders.find(f => f.id === folderId) || null : null;
    setState(prev => ({ ...prev, selectedFolder: folder }));
    
    // Refresh video list for the selected folder
    refreshVideoList();
  };

  const handleFolderCreate = async (name: string, parentId?: string) => {
    try {
      const newFolder = await videoInsightsAPI.createFolder(name, parentId);
      setState(prev => ({
        ...prev,
        folders: [...prev.folders, newFolder]
      }));
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const handleFolderRename = async (folderId: string, newName: string) => {
    try {
      const updatedFolder = await videoInsightsAPI.updateFolder(folderId, newName);
      setState(prev => ({
        ...prev,
        folders: prev.folders.map(f => f.id === folderId ? updatedFolder : f)
      }));
    } catch (error) {
      console.error('Failed to rename folder:', error);
    }
  };

  const handleFolderDelete = async (folderId: string) => {
    try {
      await videoInsightsAPI.deleteFolder(folderId);
      setState(prev => ({
        ...prev,
        folders: prev.folders.filter(f => f.id !== folderId),
        selectedFolder: prev.selectedFolder?.id === folderId ? null : prev.selectedFolder
      }));
      await refreshVideoList();
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  };

  const getStatusIcon = (status: Video['status']) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const videosToDisplay = state.searchResults?.videos || state.videos;

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text">
      {/* Header */}
      <header className="border-b border-theme-border bg-theme-card/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                <Youtube className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-theme-text">Video Insights</h1>
                <p className="text-theme-text-muted text-sm">AI-powered YouTube video analysis</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 hover:bg-theme-card-hover rounded-lg transition-colors"
              >
                <FolderIcon className="w-5 h-5" />
              </button>
              <button
                onClick={refreshVideoList}
                className="p-2 hover:bg-theme-card-hover rounded-lg transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 border-r border-theme-border bg-theme-card h-screen sticky top-0 overflow-y-auto">
            <FolderSidebar
              folders={state.folders}
              selectedFolderId={state.selectedFolder?.id || null}
              onFolderSelect={handleFolderSelect}
              onFolderCreate={handleFolderCreate}
              onFolderRename={handleFolderRename}
              onFolderDelete={handleFolderDelete}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-7xl mx-auto p-6">
            {/* Video Input */}
            <div className="mb-8">
              <VideoInput
                onSubmit={handleVideoSubmit}
                isProcessing={state.isProcessing}
                folders={state.folders}
              />
            </div>

            {/* Processing Status */}
            {state.processingStatus && (
              <div className="mb-8 bg-theme-card border border-theme-border rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  <h3 className="text-lg font-semibold">Processing Video</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{state.processingStatus.stage}</span>
                    <span>{state.processingStatus.progress}%</span>
                  </div>
                  <div className="w-full bg-theme-bg rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${state.processingStatus.progress}%` }}
                    />
                  </div>
                  <div className="text-sm text-theme-text-muted">
                    Estimated completion: {Math.round(state.processingStatus.estimated_completion / 60)} minutes
                  </div>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-theme-text-muted" />
                <input
                  type="text"
                  placeholder="Search videos, transcripts, and summaries..."
                  value={state.searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-theme-card border border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Error Display */}
            {state.error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-red-700">{state.error}</span>
                </div>
              </div>
            )}

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Video List */}
              <div className="bg-theme-card border border-theme-border rounded-xl">
                <div className="p-4 border-b border-theme-border">
                  <h2 className="text-lg font-semibold flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>Videos ({videosToDisplay.length})</span>
                  </h2>
                </div>
                
                <div className="max-h-96 sm:max-h-[600px] overflow-y-auto">
                  {state.loading ? (
                    <div className="p-8 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                      <p className="text-theme-text-muted">Loading videos...</p>
                    </div>
                  ) : videosToDisplay.length === 0 ? (
                    <div className="p-8 text-center">
                      <Youtube className="w-12 h-12 mx-auto mb-4 text-theme-text-muted" />
                      <p className="text-theme-text-muted">No videos found</p>
                      <p className="text-sm text-theme-text-light mt-2">
                        {state.searchQuery ? 'Try adjusting your search terms' : 'Add your first YouTube video above'}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-theme-border">
                      {videosToDisplay.map((video) => (
                        <div
                          key={video.id}
                          onClick={() => handleVideoSelect(video.id)}
                          className={`p-4 cursor-pointer hover:bg-theme-card-hover transition-colors ${
                            selectedVideoId === video.id ? 'bg-theme-card-secondary' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              {getStatusIcon(video.status)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-theme-text truncate">{video.title}</h3>
                              <div className="flex items-center space-x-2 mt-1 text-sm text-theme-text-muted">
                                <User className="w-4 h-4" />
                                <span>{video.channel_name}</span>
                              </div>
                              <div className="flex items-center space-x-4 mt-2 text-sm text-theme-text-light">
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatDuration(video.duration)}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>{new Date(video.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Video Details */}
              <div className="bg-theme-card border border-theme-border rounded-xl">
                {state.currentVideo ? (
                  <div className="h-full">
                    <div className="p-4 border-b border-theme-border">
                      <h2 className="text-lg font-semibold flex items-center space-x-2">
                        <Eye className="w-5 h-5" />
                        <span>Video Details</span>
                      </h2>
                    </div>
                    
                    <div className="p-4 space-y-4">
                      <div>
                        <h3 className="font-medium text-theme-text mb-2">{state.currentVideo.title}</h3>
                        <div className="flex items-center space-x-2 text-sm text-theme-text-muted">
                          <User className="w-4 h-4" />
                          <span>{state.currentVideo.channel_name}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-theme-text-muted">Duration:</span>
                          <span className="ml-2 text-theme-text">{formatDuration(state.currentVideo.duration)}</span>
                        </div>
                        <div>
                          <span className="text-theme-text-muted">Status:</span>
                          <span className="ml-2 text-theme-text capitalize">{state.currentVideo.status}</span>
                        </div>
                      </div>

                      {state.currentVideo.status === 'complete' && (
                        <div className="space-y-4">
                          <SummaryPanel
                            video={state.currentVideo}
                            summaries={[]} // This would be loaded from VideoDetails
                            onRegenerateSummary={async (mode, prompt) => {
                              // Implement regenerate summary
                            }}
                            isRegenerating={false}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <Eye className="w-12 h-12 mx-auto mb-4 text-theme-text-muted" />
                      <p className="text-theme-text-muted">Select a video to view details</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}