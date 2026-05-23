import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star,
  FileText,
  FileImage,
  FileVideo,
  File,
  Download,
  Share2,
} from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useFileStore } from '../store/fileStore';

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

export const Starred: React.FC = () => {
  const navigate = useNavigate();
  const { getStarredFiles, unstarFile } = useFileStore();
  const starredFiles = getStarredFiles();
  
  const handleUnstar = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    unstarFile(fileId);
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <Star className="w-7 h-7 text-amber-500" fill="currentColor" />
          Starred Files
        </h1>
        <p className="text-slate-500 mt-1">
          {starredFiles.length} {starredFiles.length === 1 ? 'file' : 'files'} starred
        </p>
      </div>
      
      {/* Files */}
      {starredFiles.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Star className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No starred files</h3>
            <p className="text-slate-500 mb-6">
              Star important files to quickly access them here
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Browse Files
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {starredFiles.map(file => (
                <div
                  key={file.id}
                  onClick={() => navigate(`/file/${file.id}`)}
                  className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  {getFileIcon(file.mimeType)}
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{file.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-slate-500">{formatFileSize(file.size)}</span>
                      <span className="text-sm text-slate-400">
                        {format(new Date(file.updatedAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleUnstar(file.id, e)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Unstar"
                    >
                      <Star className="w-5 h-5 text-amber-500" fill="currentColor" />
                    </button>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Download className="w-5 h-5 text-slate-400" />
                    </button>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Share2 className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
