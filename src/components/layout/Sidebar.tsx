import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  FolderOpen,
  Upload,
  Star,
  Trash2,
  Search,
  Settings,
  Activity,
  ChevronRight,
  ChevronDown,
  Folder,
  Plus,
  Shield,
  X,
  Check,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useFileStore } from '../../store/fileStore';
import { useAuthStore } from '../../store/authStore';
import { Folder as FolderType } from '../../types';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const users = useAuthStore((s) => s.users);
  const folders = useFileStore((s) => s.folders);
  const currentFolderId = useFileStore((s) => s.currentFolderId);
  const setCurrentFolder = useFileStore((s) => s.setCurrentFolder);
  const createFolder = useFileStore((s) => s.createFolder);

  const pendingCount = useMemo(
    () => users.filter((u) => u.approvalStatus === 'pending').length,
    [users]
  );

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const mainNav = [
    { icon: <Home className="w-5 h-5" />, label: 'Dashboard', path: '/dashboard' },
    { icon: <Upload className="w-5 h-5" />, label: 'Upload', path: '/upload' },
    { icon: <Star className="w-5 h-5" />, label: 'Starred', path: '/starred' },
    { icon: <Trash2 className="w-5 h-5" />, label: 'Trash', path: '/trash' },
    { icon: <Search className="w-5 h-5" />, label: 'Search', path: '/search' },
  ];

  const systemNav = [
    { icon: <Activity className="w-5 h-5" />, label: 'Activity', path: '/activity', badge: 0, adminOnly: false },
    { icon: <Settings className="w-5 h-5" />, label: 'Settings', path: '/settings', badge: 0, adminOnly: false },
    { icon: <Shield className="w-5 h-5" />, label: 'Admin', path: '/admin', badge: pendingCount, adminOnly: true },
  ];

  const rootFolders = useMemo(() => folders.filter((f) => !f.parentId), [folders]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const handleCreateFolder = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed || !user) return;
    await createFolder(trimmed, currentFolderId, user.id);
    setNewFolderName('');
    setIsCreating(false);
  };

  const cancelCreate = () => {
    setNewFolderName('');
    setIsCreating(false);
  };

  const renderFolder = (folder: FolderType, level = 0) => {
    const children = folders.filter((f) => f.parentId === folder.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = currentFolderId === folder.id;

    return (
      <div key={folder.id}>
        <button
          onClick={() => {
            setCurrentFolder(folder.id);
            navigate('/dashboard');
          }}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg',
            'hover:bg-slate-100',
            isSelected ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
          )}
          style={{ paddingLeft: `${12 + level * 16}px` }}
        >
          {hasChildren ? (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="p-0.5 hover:bg-slate-200 rounded"
            >
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </span>
          ) : (
            <span className="w-4" />
          )}
          <Folder className="w-4 h-4 shrink-0" style={{ color: folder.color || '#6366f1' }} />
          <span className="truncate flex-1 text-left">{folder.name}</span>
          {folder.fileCount !== undefined && folder.fileCount > 0 && (
            <span className="text-xs text-slate-400">{folder.fileCount}</span>
          )}
        </button>
        {hasChildren && isExpanded && (
          <div>{children.map((child) => renderFolder(child, level + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-900 leading-tight">OFFICE OF THE</h1>
            <h2 className="text-xs font-semibold text-indigo-600">PRESIDENT-REPARATIONS</h2>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="p-3 space-y-1">
        {mainNav.map((item) => (
          <button
            key={item.path}
            onClick={() => {
              if (item.path === '/dashboard') setCurrentFolder(null);
              navigate(item.path);
            }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg',
              location.pathname === item.path
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Folders */}
      <div className="flex-1 overflow-y-auto p-3 border-t border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Folders</span>
          <button
            onClick={() => setIsCreating(true)}
            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600"
            title="Create new folder"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Inline new folder input */}
        {isCreating && (
          <div className="mb-2 flex items-center gap-1 px-1">
            <Folder className="w-4 h-4 text-indigo-500 shrink-0" />
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') cancelCreate();
              }}
              className="flex-1 min-w-0 px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Folder name"
              autoFocus
            />
            <button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
              className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-30"
            >
              <Check className="w-4 h-4" />
            </button>
            <button onClick={cancelCreate} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <button
          onClick={() => {
            setCurrentFolder(null);
            navigate('/dashboard');
          }}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg mb-1',
            'hover:bg-slate-100',
            currentFolderId === null ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
          )}
        >
          <FolderOpen className="w-4 h-4" />
          <span>All Files</span>
        </button>

        {rootFolders.map((folder) => renderFolder(folder))}
      </div>

      {/* System Navigation */}
      <div className="p-3 border-t border-slate-200">
        {systemNav
          .filter((item) => !item.adminOnly || user?.role === 'admin')
          .map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg',
                location.pathname === item.path
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-600 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
      </div>
    </aside>
  );
};
