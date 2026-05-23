import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  List,
  ChevronRight,
  Star,
  MoreVertical,
  Download,
  Share2,
  Trash2,
  Edit2,
  FolderOpen,
  FileText,
  FileImage,
  FileVideo,
  FileSpreadsheet,
  FileArchive,
  File,
  Plus,
  SortAsc,
  SortDesc,
  Check,
  Clock,
  HardDrive,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useFileStore } from '../store/fileStore';
import { useAuthStore } from '../store/authStore';
import { cn } from '../utils/cn';
import { FileItem, Folder } from '../types';

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <FileImage className="w-8 h-8 text-pink-500" />;
  if (mimeType.startsWith('video/')) return <FileVideo className="w-8 h-8 text-purple-500" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('csv')) return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
  if (mimeType.includes('pdf') || mimeType.includes('document')) return <FileText className="w-8 h-8 text-red-500" />;
  if (mimeType.includes('zip') || mimeType.includes('archive')) return <FileArchive className="w-8 h-8 text-amber-500" />;
  return <File className="w-8 h-8 text-slate-500" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const allFiles = useFileStore((s) => s.files);
  const folders = useFileStore((s) => s.folders);
  const currentFolderId = useFileStore((s) => s.currentFolderId);
  const viewMode = useFileStore((s) => s.viewMode);
  const setViewMode = useFileStore((s) => s.setViewMode);
  const sortBy = useFileStore((s) => s.sortBy);
  const setSortBy = useFileStore((s) => s.setSortBy);
  const sortOrder = useFileStore((s) => s.sortOrder);
  const setSortOrder = useFileStore((s) => s.setSortOrder);
  const selectedFiles = useFileStore((s) => s.selectedFiles);
  const selectFile = useFileStore((s) => s.selectFile);
  const deselectFile = useFileStore((s) => s.deselectFile);
  const selectAllFiles = useFileStore((s) => s.selectAllFiles);
  const clearSelection = useFileStore((s) => s.clearSelection);
  const starFile = useFileStore((s) => s.starFile);
  const unstarFile = useFileStore((s) => s.unstarFile);
  const deleteFile = useFileStore((s) => s.deleteFile);
  const setCurrentFolder = useFileStore((s) => s.setCurrentFolder);
  const createFolder = useFileStore((s) => s.createFolder);

  const [contextMenu, setContextMenu] = useState<{ file: FileItem; x: number; y: number } | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Derive data — memoized so these only recompute when their inputs change
  const activeFiles = useMemo(() => allFiles.filter((f) => !f.deletedAt), [allFiles]);

  const files = useMemo(() => {
    return activeFiles
      .filter((f) => f.folderId === currentFolderId)
      .sort((a, b) => {
        let c = 0;
        switch (sortBy) {
          case 'name': c = a.name.localeCompare(b.name); break;
          case 'date': c = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); break;
          case 'size': c = b.size - a.size; break;
          case 'type': c = a.mimeType.localeCompare(b.mimeType); break;
        }
        return sortOrder === 'asc' ? c : -c;
      });
  }, [activeFiles, currentFolderId, sortBy, sortOrder]);

  const subfolders = useMemo(
    () => folders.filter((f) => f.parentId === currentFolderId),
    [folders, currentFolderId]
  );

  const folderPath: Folder[] = useMemo(() => {
    const path: Folder[] = [];
    if (currentFolderId) {
      let cur = folders.find((f) => f.id === currentFolderId);
      while (cur) {
        path.unshift(cur);
        cur = cur.parentId ? folders.find((f) => f.id === cur!.parentId) : undefined;
      }
    }
    return path;
  }, [folders, currentFolderId]);

  const recentFiles = useMemo(
    () =>
      [...activeFiles]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5),
    [activeFiles]
  );

  const starredCount = useMemo(() => activeFiles.filter((f) => f.starred).length, [activeFiles]);
  const totalStorage = useMemo(() => activeFiles.reduce((acc, f) => acc + f.size, 0), [activeFiles]);
  const totalFileCount = activeFiles.length;

  const doCreateFolder = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed || !user) return;
    await createFolder(trimmed, currentFolderId, user.id);
    setNewFolderName('');
    setShowNewFolderModal(false);
  };

  const handleFileClick = (file: FileItem) => navigate(`/file/${file.id}`);
  const handleFolderClick = (folder: Folder) => setCurrentFolder(folder.id);

  const toggleFileSelection = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedFiles.includes(fileId)) deselectFile(fileId);
    else selectFile(fileId);
  };

  const handleContextMenu = (file: FileItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ file, x: e.clientX, y: e.clientY });
  };

  const handleToggleStar = (fileId: string, isStarred: boolean) => {
    if (isStarred) unstarFile(fileId);
    else starFile(fileId);
    setContextMenu(null);
  };

  const handleDelete = (fileId: string) => {
    deleteFile(fileId);
    setContextMenu(null);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setCurrentFolder(null)}
            className="text-slate-500 hover:text-indigo-600"
          >
            All Files
          </button>
          {folderPath.map((folder, i) => (
            <React.Fragment key={folder.id}>
              <ChevronRight className="w-4 h-4 text-slate-300" />
              <button
                onClick={() => handleFolderClick(folder)}
                className={cn(
                  i === folderPath.length - 1
                    ? 'text-slate-900 font-medium'
                    : 'text-slate-500 hover:text-indigo-600'
                )}
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewFolderModal(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Folder
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/upload')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Upload
          </Button>
        </div>
      </div>

      {/* Stats Cards (show only on root) */}
      {!currentFolderId && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="p-3 bg-indigo-100 rounded-xl">
                <FileText className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{totalFileCount}</p>
                <p className="text-sm text-slate-500">Total Files</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <Star className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{starredCount}</p>
                <p className="text-sm text-slate-500">Starred</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <HardDrive className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{formatFileSize(totalStorage)}</p>
                <p className="text-sm text-slate-500">Storage Used</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <FolderOpen className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{folders.length}</p>
                <p className="text-sm text-slate-500">Folders</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Files (show only on root) */}
      {!currentFolderId && recentFiles.length > 0 && (
        <Card>
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            <h3 className="font-semibold text-slate-900">Recent Files</h3>
          </div>
          <CardContent className="p-4">
            <div className="flex gap-4 overflow-x-auto pb-2">
              {recentFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => handleFileClick(file)}
                  className="shrink-0 w-40 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  <div className="flex items-center justify-center h-16 mb-2">
                    {getFileIcon(file.mimeType)}
                  </div>
                  <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500">{format(new Date(file.updatedAt), 'MMM d')}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          {selectedFiles.length > 0 ? (
            <>
              <button onClick={clearSelection} className="text-sm text-slate-500 hover:text-slate-700">
                Clear ({selectedFiles.length} selected)
              </button>
              <Button variant="ghost" size="sm" leftIcon={<Download className="w-4 h-4" />}>Download</Button>
              <Button variant="ghost" size="sm" leftIcon={<Share2 className="w-4 h-4" />}>Share</Button>
              <Button variant="ghost" size="sm" leftIcon={<Trash2 className="w-4 h-4" />} className="text-red-600 hover:bg-red-50">Delete</Button>
            </>
          ) : (
            <button onClick={selectAllFiles} className="text-sm text-slate-500 hover:text-slate-700">Select All</button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="name">Name</option>
            <option value="date">Date</option>
            <option value="size">Size</option>
            <option value="type">Type</option>
          </select>

          <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="p-2 hover:bg-slate-100 rounded-lg">
            {sortOrder === 'asc' ? <SortAsc className="w-4 h-4 text-slate-500" /> : <SortDesc className="w-4 h-4 text-slate-500" />}
          </button>

          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-2', viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50')}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-2', viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Subfolders */}
      {subfolders.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-500 mb-3">Folders</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {subfolders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => handleFolderClick(folder)}
                className="p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-8 h-8 shrink-0" style={{ color: folder.color || '#6366f1' }} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 truncate group-hover:text-indigo-600">{folder.name}</p>
                    <p className="text-xs text-slate-400">{folder.fileCount || 0} files</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files */}
      <div>
        {(subfolders.length > 0 || !currentFolderId) && files.length > 0 && (
          <h3 className="text-sm font-medium text-slate-500 mb-3">Files</h3>
        )}

        {files.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <FolderOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No files yet</h3>
            <p className="text-slate-500 mb-6">
              {currentFolderId ? 'This folder is empty' : 'Start by uploading your first file'}
            </p>
            <Button onClick={() => navigate('/upload')}>Upload Files</Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {files.map((file) => (
              <div
                key={file.id}
                onClick={() => handleFileClick(file)}
                onContextMenu={(e) => handleContextMenu(file, e)}
                className={cn(
                  'relative p-4 bg-white rounded-xl border hover:shadow-md cursor-pointer group',
                  selectedFiles.includes(file.id)
                    ? 'border-indigo-500 ring-2 ring-indigo-100'
                    : 'border-slate-200 hover:border-indigo-300'
                )}
              >
                <button
                  onClick={(e) => toggleFileSelection(file.id, e)}
                  className={cn(
                    'absolute top-2 left-2 w-5 h-5 rounded border flex items-center justify-center',
                    selectedFiles.includes(file.id)
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-slate-300 opacity-0 group-hover:opacity-100 bg-white hover:border-indigo-400'
                  )}
                >
                  {selectedFiles.includes(file.id) && <Check className="w-3 h-3" />}
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleStar(file.id, file.starred); }}
                  className={cn(
                    'absolute top-2 right-2 p-1 rounded',
                    file.starred ? 'text-amber-500' : 'text-slate-300 opacity-0 group-hover:opacity-100 hover:text-amber-500'
                  )}
                >
                  <Star className="w-4 h-4" fill={file.starred ? 'currentColor' : 'none'} />
                </button>

                <div className="flex items-center justify-center h-16 mb-3">
                  {getFileIcon(file.mimeType)}
                </div>

                <p className="text-sm font-medium text-slate-900 truncate mb-1">{file.name}</p>
                <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>

                {file.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {file.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">{tag}</span>
                    ))}
                    {file.tags.length > 2 && <span className="text-xs text-slate-400">+{file.tags.length - 2}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="w-8 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedFiles.length === files.length && files.length > 0}
                      onChange={() => selectedFiles.length === files.length ? clearSelection() : selectAllFiles()}
                      className="rounded border-slate-300"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Size</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Modified</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Tags</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {files.map((file) => (
                  <tr
                    key={file.id}
                    onClick={() => handleFileClick(file)}
                    onContextMenu={(e) => handleContextMenu(file, e)}
                    className={cn('hover:bg-slate-50 cursor-pointer', selectedFiles.includes(file.id) && 'bg-indigo-50')}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => selectedFiles.includes(file.id) ? deselectFile(file.id) : selectFile(file.id)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.mimeType)}
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">{file.name}</p>
                          <p className="text-xs text-slate-400">{file.mimeType}</p>
                        </div>
                        {file.starred && <Star className="w-4 h-4 text-amber-500 shrink-0" fill="currentColor" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 hidden md:table-cell">{formatFileSize(file.size)}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 hidden lg:table-cell">{format(new Date(file.updatedAt), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {file.tags.slice(0, 3).map((tag) => <Badge key={tag} size="sm">{tag}</Badge>)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleContextMenu(file, e); }}
                        className="p-1 hover:bg-slate-100 rounded"
                      >
                        <MoreVertical className="w-4 h-4 text-slate-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 bg-white rounded-xl shadow-xl border border-slate-200 py-2 w-48"
            style={{ top: Math.min(contextMenu.y, window.innerHeight - 250), left: Math.min(contextMenu.x, window.innerWidth - 200) }}
          >
            <button onClick={() => { handleFileClick(contextMenu.file); setContextMenu(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-3">
              <FileText className="w-4 h-4 text-slate-400" /> Open
            </button>
            <button className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-3">
              <Download className="w-4 h-4 text-slate-400" /> Download
            </button>
            <button className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-3">
              <Share2 className="w-4 h-4 text-slate-400" /> Share
            </button>
            <button onClick={() => handleToggleStar(contextMenu.file.id, contextMenu.file.starred)} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-3">
              <Star className="w-4 h-4 text-slate-400" /> {contextMenu.file.starred ? 'Unstar' : 'Star'}
            </button>
            <button className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-3">
              <Edit2 className="w-4 h-4 text-slate-400" /> Rename
            </button>
            <div className="border-t border-slate-100 my-1" />
            <button onClick={() => handleDelete(contextMenu.file.id)} className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-3">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </>
      )}

      {/* New Folder Modal */}
      <Modal isOpen={showNewFolderModal} onClose={() => setShowNewFolderModal(false)} title="Create New Folder" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Folder Name</label>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter folder name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') doCreateFolder();
              }}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowNewFolderModal(false)}>Cancel</Button>
            <Button onClick={doCreateFolder} disabled={!newFolderName.trim()}>
              Create Folder
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
