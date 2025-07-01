'use client';

import { useState, useEffect } from 'react';
import { VideoInputProps, VideoSummaryRequest, Folder } from '../../../lib/types/video-insights';
import { 
  Youtube, 
  Send, 
  AlertCircle, 
  CheckCircle, 
  Folder as FolderIcon,
  ChevronDown,
  Sparkles,
  FileText,
  Clock,
  List,
  Target,
  Edit3
} from 'lucide-react';

const SUMMARY_MODES = [
  {
    id: 'bullet' as const,
    name: 'Bullet Points',
    description: 'Key insights as concise bullet points',
    icon: <List className="w-4 h-4" />,
    color: 'text-blue-500',
  },
  {
    id: 'executive' as const,
    name: 'Executive Summary',
    description: 'Professional summary for decision makers',
    icon: <FileText className="w-4 h-4" />,
    color: 'text-green-500',
  },
  {
    id: 'action_items' as const,
    name: 'Action Items',
    description: 'Actionable takeaways and next steps',
    icon: <Target className="w-4 h-4" />,
    color: 'text-orange-500',
  },
  {
    id: 'timeline' as const,
    name: 'Timeline',
    description: 'Chronological breakdown of key events',
    icon: <Clock className="w-4 h-4" />,
    color: 'text-purple-500',
  },
  {
    id: 'custom' as const,
    name: 'Custom Prompt',
    description: 'Use your own analysis prompt',
    icon: <Edit3 className="w-4 h-4" />,
    color: 'text-pink-500',
  },
];

const EXAMPLE_URLS = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtu.be/dQw4w9WgXcQ',
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
];

export default function VideoInput({ onSubmit, isProcessing, folders }: VideoInputProps) {
  const [formData, setFormData] = useState({
    youtube_url: '',
    summary_mode: 'bullet' as VideoSummaryRequest['summary_mode'],
    user_prompt: '',
    folder_id: '',
  });

  const [urlError, setUrlError] = useState<string | null>(null);
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [validationState, setValidationState] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');

  // Validate YouTube URL
  const validateYouTubeUrl = (url: string): boolean => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)[a-zA-Z0-9_-]{11}(&.*)?$/;
    return youtubeRegex.test(url.trim());
  };

  // Handle URL change with validation
  const handleUrlChange = (url: string) => {
    setFormData(prev => ({ ...prev, youtube_url: url }));

    if (!url.trim()) {
      setValidationState('idle');
      setUrlError(null);
      return;
    }

    setValidationState('validating');
    
    // Debounce validation
    const timeoutId = setTimeout(() => {
      if (validateYouTubeUrl(url)) {
        setValidationState('valid');
        setUrlError(null);
      } else {
        setValidationState('invalid');
        setUrlError('Please enter a valid YouTube URL');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  // Handle summary mode change
  const handleSummaryModeChange = (mode: VideoSummaryRequest['summary_mode']) => {
    setFormData(prev => ({ ...prev, summary_mode: mode }));
    setShowCustomPrompt(mode === 'custom');
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.youtube_url.trim()) {
      setUrlError('Please enter a YouTube URL');
      return;
    }

    if (!validateYouTubeUrl(formData.youtube_url)) {
      setUrlError('Please enter a valid YouTube URL');
      return;
    }

    if (formData.summary_mode === 'custom' && !formData.user_prompt.trim()) {
      setUrlError('Please provide a custom prompt for analysis');
      return;
    }

    const request: VideoSummaryRequest = {
      youtube_url: formData.youtube_url.trim(),
      summary_mode: formData.summary_mode,
      user_prompt: formData.summary_mode === 'custom' ? formData.user_prompt.trim() || undefined : undefined,
      folder_id: formData.folder_id || undefined,
    };

    try {
      await onSubmit(request);
      
      // Reset form after successful submission
      setFormData({
        youtube_url: '',
        summary_mode: 'bullet',
        user_prompt: '',
        folder_id: '',
      });
      setShowCustomPrompt(false);
      setValidationState('idle');
    } catch (error) {
      // Error handling is done in parent component
      console.error('Submit error:', error);
    }
  };

  // Get validation icon
  const getValidationIcon = () => {
    switch (validationState) {
      case 'valid':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'invalid':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Youtube className="w-5 h-5 text-theme-text-muted" />;
    }
  };

  const selectedMode = SUMMARY_MODES.find(mode => mode.id === formData.summary_mode);
  const selectedFolder = folders && Array.isArray(folders) ? folders.find(folder => folder.id === formData.folder_id) : null;

  return (
    <div className="bg-theme-card border border-theme-border rounded-xl p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
          <Youtube className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-theme-text">Analyze YouTube Video</h2>
          <p className="text-theme-text-muted text-sm">Extract insights with AI-powered transcription and summarization</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* YouTube URL Input */}
        <div>
          <label className="block text-sm font-medium text-theme-text mb-2">
            YouTube URL
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {getValidationIcon()}
            </div>
            <input
              type="url"
              value={formData.youtube_url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className={`w-full pl-10 pr-4 py-3 bg-theme-bg border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                urlError 
                  ? 'border-red-500 focus:ring-red-500' 
                  : validationState === 'valid'
                    ? 'border-green-500 focus:ring-green-500'
                    : 'border-theme-border focus:ring-blue-500'
              }`}
              disabled={isProcessing}
            />
          </div>
          {urlError && (
            <p className="mt-2 text-sm text-red-500 flex items-center space-x-1">
              <AlertCircle className="w-4 h-4" />
              <span>{urlError}</span>
            </p>
          )}
          
          {/* Example URLs */}
          <div className="mt-2">
            <p className="text-xs text-theme-text-muted mb-1">Example formats:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_URLS.map((url, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleUrlChange(url)}
                  className="text-xs px-2 py-1 bg-theme-bg border border-theme-border rounded hover:bg-theme-card-hover transition-colors"
                  disabled={isProcessing}
                >
                  {url.includes('youtu.be') ? 'youtu.be/...' : url.includes('embed') ? 'youtube.com/embed/...' : 'youtube.com/watch?v=...'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Mode Selection */}
        <div>
          <label className="block text-sm font-medium text-theme-text mb-3">
            Summary Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SUMMARY_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => handleSummaryModeChange(mode.id)}
                className={`p-4 border rounded-lg text-left transition-all ${
                  formData.summary_mode === mode.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-theme-border hover:border-theme-border-hover hover:bg-theme-card-hover'
                }`}
                disabled={isProcessing}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <span className={mode.color}>{mode.icon}</span>
                  <span className="font-medium text-theme-text">{mode.name}</span>
                </div>
                <p className="text-sm text-theme-text-muted">{mode.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Prompt Input */}
        {showCustomPrompt && (
          <div>
            <label className="block text-sm font-medium text-theme-text mb-2">
              Custom Analysis Prompt
            </label>
            <textarea
              value={formData.user_prompt}
              onChange={(e) => setFormData(prev => ({ ...prev, user_prompt: e.target.value }))}
              placeholder="Describe what specific insights you want to extract from this video..."
              rows={4}
              className="w-full px-4 py-3 bg-theme-bg border border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={isProcessing}
            />
            <p className="mt-1 text-xs text-theme-text-muted">
              Be specific about what you want to learn from the video. Examples: "Extract key financial metrics mentioned", "Summarize the main arguments", "List all recommended actions"
            </p>
          </div>
        )}

        {/* Folder Selection */}
        {folders && Array.isArray(folders) && folders.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-theme-text mb-2">
              Save to Folder (Optional)
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                className="w-full px-4 py-3 bg-theme-bg border border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
                disabled={isProcessing}
              >
                <div className="flex items-center space-x-2">
                  <FolderIcon className="w-4 h-4 text-theme-text-muted" />
                  <span className="text-theme-text">
                    {selectedFolder ? selectedFolder.name : 'Select folder...'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-theme-text-muted" />
              </button>

              {showFolderDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-theme-card border border-theme-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, folder_id: '' }));
                      setShowFolderDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-theme-card-hover transition-colors"
                  >
                    <span className="text-theme-text-muted">No folder</span>
                  </button>
                  {folders && Array.isArray(folders) && folders.map((folder) => (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, folder_id: folder.id }));
                        setShowFolderDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-theme-card-hover transition-colors flex items-center space-x-2"
                    >
                      <FolderIcon className="w-4 h-4 text-theme-text-muted" />
                      <span className="text-theme-text">{folder.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-theme-text-muted">
            Processing typically takes 2-4 minutes for videos under 20 minutes
          </div>
          
          <button
            type="submit"
            disabled={isProcessing || validationState === 'invalid' || !formData.youtube_url.trim()}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Analyze Video</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}