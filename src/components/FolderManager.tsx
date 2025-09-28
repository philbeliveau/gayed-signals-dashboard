'use client';

import { useState, useEffect } from 'react';
import { Folder, FolderPlus, Trash2, Edit2, X, Check } from 'lucide-react';

interface FolderType {
  id: string;
  name: string;
  description?: string;
  color: string;
  video_count: number;
  created_at: string;
  updated_at: string;
}

interface FolderManagerProps {
  selectedFolder?: string;
  onFolderSelect: (folderId: string | undefined, folderName?: string) => void;
  className?: string;
}

export default function FolderManager({ selectedFolder, onFolderSelect, className = '' }: FolderManagerProps) {
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#3B82F6');

  const colorOptions = [
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Orange', value: '#F59E0B' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Indigo', value: '#6366F1' },
    { name: 'Teal', value: '#14B8A6' }
  ];

  // Load folders
  const loadFolders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/folders');
      if (!response.ok) {
        throw new Error('Failed to load folders');
      }
      
      const foldersData = await response.json();
      setFolders(foldersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load folders');
      console.error('Error loading folders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create folder
  const createFolder = async () => {
    if (!newFolderName.trim()) {
      setError('Folder name is required');
      return;
    }

    try {
      setError(null);
      
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          description: newFolderDescription.trim() || undefined,
          color: newFolderColor
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create folder');
      }

      const newFolder = await response.json();
      setFolders(prev => [newFolder, ...prev]);
      
      // Reset form
      setNewFolderName('');
      setNewFolderDescription('');
      setNewFolderColor('#3B82F6');
      setShowCreateForm(false);
      
      console.log('✅ Created folder:', newFolder.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
      console.error('Error creating folder:', err);
    }
  };

  // Delete folder
  const deleteFolder = async (folderId: string, folderName: string) => {
    if (!confirm(`Are you sure you want to delete "${folderName}"? Videos will be moved to the root folder.`)) {
      return;
    }

    try {
      setError(null);
      
      const response = await fetch(`/api/folders/${folderId}?force=true`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete folder');
      }

      setFolders(prev => prev.filter(f => f.id !== folderId));
      
      // If deleted folder was selected, clear selection
      if (selectedFolder === folderId) {
        onFolderSelect(undefined);
      }
      
      console.log('✅ Deleted folder:', folderName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete folder');
      console.error('Error deleting folder:', err);
    }
  };

  // Update folder
  const updateFolder = async (folderId: string, updates: Partial<FolderType>) => {
    try {
      setError(null);
      
      const response = await fetch(`/api/folders/${folderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update folder');
      }

      const updatedFolder = await response.json();
      setFolders(prev => prev.map(f => f.id === folderId ? updatedFolder : f));
      setEditingFolder(null);
      
      console.log('✅ Updated folder:', updatedFolder.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update folder');
      console.error('Error updating folder:', err);
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  if (loading) {
    return (
      <div className={`bg-theme-card rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <Folder className="w-5 h-5 text-theme-text-muted" />
          <h3 className="font-semibold text-theme-text">Folders</h3>
        </div>
        <div className="text-theme-text-muted text-sm">Loading folders...</div>
      </div>
    );
  }

  return (
    <div className={`bg-theme-card rounded-lg p-4 border border-theme-border ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Folder className="w-5 h-5 text-theme-text-muted" />
          <h3 className="font-semibold text-theme-text">Folders</h3>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="p-1 text-theme-text-muted hover:text-theme-text transition-colors"
          title="Create new folder"
        >
          <FolderPlus className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Create folder form */}
      {showCreateForm && (
        <div className="mb-4 p-3 bg-theme-bg rounded-lg border border-theme-border space-y-3">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            className="w-full px-3 py-2 bg-theme-card border border-theme-border rounded text-theme-text text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            maxLength={255}
          />
          <input
            type="text"
            value={newFolderDescription}
            onChange={(e) => setNewFolderDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 bg-theme-card border border-theme-border rounded text-theme-text text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            maxLength={1000}
          />
          <div className="flex flex-wrap gap-2">
            {colorOptions.map((color) => (
              <button
                key={color.value}
                onClick={() => setNewFolderColor(color.value)}
                className={`w-6 h-6 rounded-full border-2 ${
                  newFolderColor === color.value ? 'border-theme-text' : 'border-theme-border'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={createFolder}
              disabled={!newFolderName.trim()}
              className="flex items-center space-x-1 px-3 py-1 bg-theme-primary text-white rounded text-sm hover:bg-theme-primary-hover disabled:bg-theme-text-muted transition-colors"
            >
              <Check className="w-3 h-3" />
              <span>Create</span>
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewFolderName('');
                setNewFolderDescription('');
                setNewFolderColor('#3B82F6');
                setError(null);
              }}
              className="flex items-center space-x-1 px-3 py-1 bg-theme-text-muted text-white rounded text-sm hover:bg-theme-text-muted/80 transition-colors"
            >
              <X className="w-3 h-3" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {/* Root folder */}
      <div
        onClick={() => onFolderSelect(undefined, 'Root')}
        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
          selectedFolder === undefined
            ? 'bg-blue-50 border border-blue-200 text-blue-700'
            : 'hover:bg-theme-card-hover'
        }`}
      >
        <div className="flex items-center space-x-2">
          <Folder className="w-4 h-4 text-theme-text-muted" />
          <span className="text-sm font-medium text-theme-text">Root</span>
        </div>
        <span className="text-xs text-theme-text-muted">
          {folders.reduce((total, folder) => total + folder.video_count, 0)} videos
        </span>
      </div>

      {/* Folder list */}
      <div className="space-y-2">
        {folders.map((folder) => (
          <div
            key={folder.id}
            className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
              selectedFolder === folder.id
                ? 'bg-blue-50 border border-blue-200'
                : 'hover:bg-theme-card-hover cursor-pointer'
            }`}
          >
            {editingFolder === folder.id ? (
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  defaultValue={folder.name}
                  onBlur={(e) => {
                    if (e.target.value.trim() && e.target.value !== folder.name) {
                      updateFolder(folder.id, { name: e.target.value.trim() });
                    } else {
                      setEditingFolder(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    } else if (e.key === 'Escape') {
                      setEditingFolder(null);
                    }
                  }}
                  className="w-full px-2 py-1 bg-theme-bg border border-theme-border rounded text-theme-text text-sm"
                  autoFocus
                />
              </div>
            ) : (
              <>
                <div
                  onClick={() => onFolderSelect(folder.id, folder.name)}
                  className="flex items-center space-x-2 flex-1 cursor-pointer"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: folder.color }}
                  />
                  <div>
                    <div className="text-sm font-medium text-theme-text">{folder.name}</div>
                    {folder.description && (
                      <div className="text-xs text-theme-text-muted">{folder.description}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-theme-text-muted">
                    {folder.video_count} videos
                  </span>
                  <button
                    onClick={() => setEditingFolder(folder.id)}
                    className="p-1 text-theme-text-muted hover:text-theme-text transition-colors"
                    title="Edit folder"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => deleteFolder(folder.id, folder.name)}
                    className="p-1 text-theme-text-muted hover:text-red-600 transition-colors"
                    title="Delete folder"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {folders.length === 0 && !showCreateForm && (
        <div className="text-center py-8 text-theme-text-muted">
          <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No folders yet</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2"
          >
            Create your first folder
          </button>
        </div>
      )}
    </div>
  );
}