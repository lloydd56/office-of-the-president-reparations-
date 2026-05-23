import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload as UploadIcon,
  X,
  FileText,
  FileImage,
  FileVideo,
  File,
  Check,
  AlertCircle,
  FolderOpen,
  Tag,
  ChevronDown,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useFileStore } from '../store/fileStore';
import { useAuthStore } from '../store/authStore';
import { cn } from '../utils/cn';

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
  tags: string[];
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return <FileImage className="w-6 h-6 text-pink-500" />;
  if (type.startsWith('video/')) return <FileVideo className="w-6 h-6 text-purple-500" />;
  if (type.includes('pdf') || type.includes('document')) return <FileText className="w-6 h-6 text-red-500" />;
  return <File className="w-6 h-6 text-slate-500" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export const Upload: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { folders, tags, currentFolderId, uploadFile: storeUploadFile } = useFileStore();
  
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(currentFolderId);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);
  
  const addFiles = (newFiles: File[]) => {
    const uploadFiles: UploadFile[] = newFiles.map(file => ({
      id: uuidv4(),
      file,
      progress: 0,
      status: 'pending',
      tags: selectedTags,
    }));

    setFiles(prev => [...prev, ...uploadFiles]);
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };
  
  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };
  
  const handleUpload = async () => {
    if (!user) return;

    setIsUploading(true);

    for (const uploadFile of files) {
      if (uploadFile.status !== 'pending') continue;

      // Show uploading state immediately — gives visual feedback before the network call
      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 20 } : f
      ));

      try {
        // Fix #7: real upload — no fake setTimeout loop
        // Fix #13: use hook-bound uploadFile (destructured at top of component)
        setFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? { ...f, progress: 60 } : f
        ));

        await storeUploadFile(
          uploadFile.file,
          selectedFolder,
          uploadFile.tags,
          user.id,
          user.name
        );

        setFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? { ...f, status: 'complete', progress: 100 } : f
        ));
      } catch {
        setFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? { ...f, status: 'error', error: 'Upload failed' } : f
        ));
      }
    }

    setIsUploading(false);
  };
  
  const completedCount = files.filter(f => f.status === 'complete').length;
  const allComplete = files.length > 0 && completedCount === files.length;
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Upload Files</h1>
        <p className="text-slate-500 mt-1">
          Drag and drop files or click to browse
        </p>
      </div>
      
      {/* Upload Options */}
      <div className="flex flex-wrap gap-4">
        {/* Folder Selection */}
        <div className="relative">
          <button
            onClick={() => setShowFolderDropdown(!showFolderDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <FolderOpen className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-700">
              {selectedFolder 
                ? folders.find(f => f.id === selectedFolder)?.name 
                : 'Root Folder'}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
          
          {showFolderDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowFolderDropdown(false)} />
              <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-20 max-h-64 overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedFolder(null);
                    setShowFolderDropdown(false);
                  }}
                  className={cn(
                    'w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2',
                    selectedFolder === null && 'bg-indigo-50 text-indigo-600'
                  )}
                >
                  <FolderOpen className="w-4 h-4" />
                  Root Folder
                </button>
                {folders.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => {
                      setSelectedFolder(folder.id);
                      setShowFolderDropdown(false);
                    }}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2',
                      selectedFolder === folder.id && 'bg-indigo-50 text-indigo-600'
                    )}
                  >
                    <FolderOpen className="w-4 h-4" style={{ color: folder.color }} />
                    {folder.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        
        {/* Tags Selection */}
        <div className="relative">
          <button
            onClick={() => setShowTagDropdown(!showTagDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Tag className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-700">
              {selectedTags.length > 0 ? `${selectedTags.length} tags` : 'Add Tags'}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
          
          {showTagDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowTagDropdown(false)} />
              <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-20">
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      setSelectedTags(prev => 
                        prev.includes(tag.name) 
                          ? prev.filter(t => t !== tag.name)
                          : [...prev, tag.name]
                      );
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </div>
                    {selectedTags.includes(tag.name) && (
                      <Check className="w-4 h-4 text-indigo-600" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        
        {selectedTags.length > 0 && (
          <div className="flex items-center gap-2">
            {selectedTags.map(tag => (
              <Badge key={tag} variant="info">
                {tag}
                <button
                  onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                  className="ml-1 hover:text-blue-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
      
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all',
          isDragging
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/50'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className={cn(
          'inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 transition-colors',
          isDragging ? 'bg-indigo-200' : 'bg-slate-200'
        )}>
          <UploadIcon className={cn(
            'w-8 h-8 transition-colors',
            isDragging ? 'text-indigo-600' : 'text-slate-400'
          )} />
        </div>
        
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          {isDragging ? 'Drop files here' : 'Drag and drop files'}
        </h3>
        <p className="text-slate-500 mb-4">
          or click to browse your computer
        </p>
        <p className="text-xs text-slate-400">
          Supports all file types up to 100MB
        </p>
      </div>
      
      {/* File List */}
      {files.length > 0 && (
        <Card>
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">
              Files ({completedCount}/{files.length} uploaded)
            </h3>
            {!allComplete && (
              <Button
                onClick={handleUpload}
                isLoading={isUploading}
                disabled={isUploading || files.every(f => f.status !== 'pending')}
              >
                Upload All
              </Button>
            )}
            {allComplete && (
              <Button onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
            )}
          </div>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {files.map(file => (
                <div key={file.id} className="px-6 py-4 flex items-center gap-4">
                  {getFileIcon(file.file.type)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 truncate">
                        {file.file.name}
                      </p>
                      {file.status === 'complete' && (
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                      {file.status === 'error' && (
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-slate-400">
                        {formatFileSize(file.file.size)}
                      </span>
                      {file.tags.length > 0 && (
                        <div className="flex gap-1">
                          {file.tags.map(tag => (
                            <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {file.status === 'uploading' && (
                      <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    )}
                    
                    {file.error && (
                      <p className="text-sm text-red-500 mt-1">{file.error}</p>
                    )}
                  </div>
                  
                  {file.status === 'pending' && (
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
