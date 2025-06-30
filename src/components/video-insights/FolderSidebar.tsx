'use client';

import { useState } from 'react';
import { FolderSidebarProps } from '../../lib/types/video-insights';
import { 
  Folder, 
  FolderPlus, 
  FolderOpen,
  Edit2, 
  Trash2, 
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  Hash,
  Plus,
  Check,
  X,
  AlertTriangle
} from 'lucide-react';

export default function FolderSidebar({ 
  folders, 
  selectedFolderId, 
  onFolderSelect, 
  onFolderCreate, 
  onFolderRename, 
  onFolderDelete 
}: FolderSidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [folderMenuOpen, setFolderMenuOpen] = useState<string | null>(null);

  // Build folder tree structure
  const buildFolderTree = () => {
    const folderMap = new Map();
    const rootFolders: any[] = [];

    // First pass: create folder objects
    folders.forEach(folder => {
      folderMap.set(folder.id, {
        ...folder,
        children: []
      });
    });

    // Second pass: build tree
    folders.forEach(folder => {
      const folderWithChildren = folderMap.get(folder.id);
      if (folder.parent_id && folderMap.has(folder.parent_id)) {
        folderMap.get(folder.parent_id).children.push(folderWithChildren);
      } else {
        rootFolders.push(folderWithChildren);
      }
    });

    return rootFolders;
  };

  const folderTree = buildFolderTree();

  // Toggle folder expansion
  const toggleFolderExpansion = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  // Start editing folder name
  const startEditing = (folderId: string, currentName: string) => {
    setEditingFolderId(folderId);
    setEditingName(currentName);
    setFolderMenuOpen(null);
  };

  // Save folder name edit
  const saveEdit = async () => {
    if (editingFolderId && editingName.trim()) {
      try {
        await onFolderRename(editingFolderId, editingName.trim());
        setEditingFolderId(null);
        setEditingName('');
      } catch (error) {
        console.error('Failed to rename folder:', error);
      }
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingFolderId(null);
    setEditingName('');
  };

  // Handle create folder
  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      try {
        await onFolderCreate(newFolderName.trim(), parentFolderId || undefined);
        setNewFolderName('');
        setShowCreateForm(false);
        setParentFolderId(null);
      } catch (error) {
        console.error('Failed to create folder:', error);
      }
    }
  };

  // Handle delete folder
  const handleDeleteFolder = async (folderId: string) => {
    try {
      await onFolderDelete(folderId);
      setShowDeleteConfirm(null);
      setFolderMenuOpen(null);
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  };

  // Render folder item
  const renderFolder = (folder: any, level: number = 0) => {
    const isSelected = selectedFolderId === folder.id;
    const isExpanded = expandedFolders.has(folder.id);
    const hasChildren = folder.children && folder.children.length > 0;
    const isEditing = editingFolderId === folder.id;
    const isMenuOpen = folderMenuOpen === folder.id;

    return (
      <div key={folder.id}>
        <div 
          className={`group flex items-center py-2 px-3 hover:bg-theme-card-hover rounded-lg transition-colors ${
            isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500' : ''
          }`}
          style={{ paddingLeft: `${0.75 + level * 1.5}rem` }}
        >
          {/* Expand/Collapse Button */}
          {hasChildren && (
            <button
              onClick={() => toggleFolderExpansion(folder.id)}
              className="p-0.5 hover:bg-theme-card-hover rounded mr-1"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-theme-text-muted" />
              ) : (
                <ChevronRight className="w-4 h-4 text-theme-text-muted" />
              )}
            </button>
          )}

          {/* Folder Icon */}
          <div className="mr-2">
            {hasChildren && isExpanded ? (
              <FolderOpen className="w-4 h-4 text-blue-500" />
            ) : (
              <Folder className="w-4 h-4 text-blue-500" />
            )}
          </div>

          {/* Folder Name */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center space-x-1">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  className="flex-1 px-2 py-1 text-sm bg-theme-bg border border-theme-border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={saveEdit}
                  className="p-1 hover:bg-green-100 dark:hover:bg-green-800 rounded"
                >
                  <Check className="w-3 h-3 text-green-600" />
                </button>
                <button
                  onClick={cancelEdit}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-800 rounded"
                >
                  <X className="w-3 h-3 text-red-600" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onFolderSelect(folder.id)}
                className="w-full text-left truncate"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm truncate ${isSelected ? 'text-blue-600 font-medium' : 'text-theme-text'}`}>
                    {folder.name}
                  </span>
                  {folder.video_count !== undefined && (
                    <span className="text-xs text-theme-text-muted ml-2">
                      ({folder.video_count})
                    </span>
                  )}
                </div>
              </button>
            )}
          </div>

          {/* Folder Menu */}
          {!isEditing && (
            <div className="relative">
              <button
                onClick={() => setFolderMenuOpen(isMenuOpen ? null : folder.id)}
                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-theme-card-hover rounded transition-opacity"
              >
                <MoreHorizontal className="w-4 h-4 text-theme-text-muted" />
              </button>

              {isMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setFolderMenuOpen(null)}
                  />
                  
                  {/* Menu */}
                  <div className="absolute right-0 top-full mt-1 w-48 bg-theme-card border border-theme-border rounded-lg shadow-lg z-20">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setParentFolderId(folder.id);
                          setShowCreateForm(true);
                          setFolderMenuOpen(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-theme-card-hover flex items-center space-x-2"
                      >
                        <FolderPlus className="w-4 h-4" />
                        <span>Add Subfolder</span>
                      </button>
                      <button
                        onClick={() => startEditing(folder.id, folder.name)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-theme-card-hover flex items-center space-x-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Rename</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(folder.id);
                          setFolderMenuOpen(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center space-x-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Render Children */}
        {hasChildren && isExpanded && (
          <div>
            {folder.children.map((child: any) => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-theme-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-theme-text">Folders</h3>
          <button
            onClick={() => setShowCreateForm(true)}
            className="p-2 hover:bg-theme-card-hover rounded-lg transition-colors"
            title="Create new folder"
          >
            <FolderPlus className="w-4 h-4 text-blue-500" />
          </button>
        </div>

        {/* All Videos Option */}
        <button
          onClick={() => onFolderSelect(null)}
          className={`w-full text-left p-3 rounded-lg transition-colors ${
            selectedFolderId === null ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : 'hover:bg-theme-card-hover'
          }`}
        >
          <div className="flex items-center space-x-2">
            <FolderOpen className="w-4 h-4 text-blue-500" />
            <span className={`text-sm ${selectedFolderId === null ? 'text-blue-600 font-medium' : 'text-theme-text'}`}>
              All Videos
            </span>
            <span className="text-xs text-theme-text-muted ml-auto">
              ({folders.reduce((sum, f) => sum + (f.video_count || 0), 0)})
            </span>
          </div>
        </button>
      </div>

      {/* Create Folder Form */}
      {showCreateForm && (
        <div className="p-4 border-b border-theme-border bg-theme-bg">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <FolderPlus className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-theme-text">New Folder</span>
            </div>
            
            {parentFolderId && (
              <div className="text-xs text-theme-text-muted">
                Creating in: {folders.find(f => f.id === parentFolderId)?.name}
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') {
                    setShowCreateForm(false);
                    setNewFolderName('');
                    setParentFolderId(null);
                  }
                }}
                placeholder="Folder name"
                className="flex-1 px-2 py-1 text-sm bg-theme-card border border-theme-border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="p-1 hover:bg-green-100 dark:hover:bg-green-800 rounded disabled:opacity-50"
              >
                <Check className="w-3 h-3 text-green-600" />
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewFolderName('');
                  setParentFolderId(null);
                }}
                className="p-1 hover:bg-red-100 dark:hover:bg-red-800 rounded"
              >
                <X className="w-3 h-3 text-red-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folder Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {folderTree.length === 0 ? (
          <div className="text-center py-8">
            <Folder className="w-12 h-12 mx-auto mb-4 text-theme-text-muted" />
            <p className="text-theme-text-muted text-sm mb-2">No folders created</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="text-blue-500 hover:text-blue-600 text-sm transition-colors flex items-center space-x-1 mx-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Create your first folder</span>
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {folderTree.map(folder => renderFolder(folder))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-theme-card border border-theme-border rounded-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-theme-text">Delete Folder</h3>
                <p className="text-sm text-theme-text-muted">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-theme-text mb-6">
              Are you sure you want to delete "
              <span className="font-medium">
                {folders.find(f => f.id === showDeleteConfirm)?.name}
              </span>
              "? All videos in this folder will be moved to uncategorized.
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-theme-text-muted hover:text-theme-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteFolder(showDeleteConfirm)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}