import React, { useState } from 'react';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  FileText,
  FileImage,
  FileVideo,
  File,
  Clock,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { useFileStore } from '../store/fileStore';
import { cn } from '../utils/cn';

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <FileImage className="w-8 h-8 text-pink-500" />;
  if (mimeType.startsWith('video/')) return <FileVideo className="w-8 h-8 text-purple-500" />;
  if (mimeType.includes('pdf') || mimeType.includes('document')) return <FileText className="w-8 h-8 text-red-500" />;
  return <File className="w-8 h-8 text-slate-500" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export const Trash: React.FC = () => {
  const { getTrashedFiles, restoreFile, permanentDeleteFile } = useFileStore();
  const trashedFiles = getTrashedFiles();
  
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  const toggleSelection = (fileId: string) => {
    setSelectedFiles(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };
  
  const handleRestore = (fileId: string) => {
    restoreFile(fileId);
    setSelectedFiles(prev => prev.filter(id => id !== fileId));
  };
  
  const handleRestoreSelected = () => {
    selectedFiles.forEach(id => restoreFile(id));
    setSelectedFiles([]);
  };
  
  const handlePermanentDelete = (fileId: string) => {
    permanentDeleteFile(fileId);
    setShowDeleteConfirm(null);
    setSelectedFiles(prev => prev.filter(id => id !== fileId));
  };
  
  const handleEmptyTrash = () => {
    trashedFiles.forEach(file => permanentDeleteFile(file.id));
    setShowEmptyConfirm(false);
    setSelectedFiles([]);
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Trash2 className="w-7 h-7 text-slate-400" />
            Trash
          </h1>
          <p className="text-slate-500 mt-1">
            {trashedFiles.length} {trashedFiles.length === 1 ? 'file' : 'files'} in trash
          </p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {selectedFiles.length > 0 && (
            <Button
              variant="outline"
              onClick={handleRestoreSelected}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Restore ({selectedFiles.length})
            </Button>
          )}
          {trashedFiles.length > 0 && (
            <Button
              variant="danger"
              onClick={() => setShowEmptyConfirm(true)}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Empty Trash
            </Button>
          )}
        </div>
      </div>
      
      {/* Warning */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Items in trash</p>
          <p className="text-sm text-amber-700">
            Files in trash will be automatically deleted after 30 days. You can restore them before then.
          </p>
        </div>
      </div>
      
      {/* File List */}
      {trashedFiles.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Trash2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Trash is empty</h3>
            <p className="text-slate-500">
              Deleted files will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {trashedFiles.map(file => (
                <div
                  key={file.id}
                  className={cn(
                    'px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors',
                    selectedFiles.includes(file.id) && 'bg-indigo-50'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(file.id)}
                    onChange={() => toggleSelection(file.id)}
                    className="rounded border-slate-300"
                  />
                  
                  {getFileIcon(file.mimeType)}
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{file.name}</p>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mt-0.5">
                      <span>{formatFileSize(file.size)}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span className="hidden sm:inline">Deleted </span>
                        {file.deletedAt ? format(new Date(file.deletedAt), 'MMM d, yyyy') : 'Unknown'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(file.id)}
                      leftIcon={<RotateCcw className="w-4 h-4" />}
                    >
                      <span className="hidden sm:inline">Restore</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(file.id)}
                      className="text-red-600 hover:bg-red-50"
                      leftIcon={<X className="w-4 h-4" />}
                    >
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Empty Trash Confirmation */}
      <Modal
        isOpen={showEmptyConfirm}
        onClose={() => setShowEmptyConfirm(false)}
        title="Empty Trash?"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">This action cannot be undone</p>
              <p className="text-sm text-red-700 mt-1">
                All {trashedFiles.length} files in trash will be permanently deleted.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowEmptyConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleEmptyTrash}>
              Empty Trash
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Single Delete Confirmation */}
      <Modal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        title="Delete Permanently?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-600">
            This file will be permanently deleted. This action cannot be undone.
          </p>
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => showDeleteConfirm && handlePermanentDelete(showDeleteConfirm)}
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
