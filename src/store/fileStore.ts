import { create } from 'zustand';
import { FileItem, Folder, Tag, ActivityLog, ShareLink } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { supabase, supabaseConfigured } from '../lib/supabase';

// ─── helpers ────────────────────────────────────────────────────────────────

const mapFile = (f: any): FileItem => ({
  id: f.id,
  name: f.name,
  originalName: f.original_name,
  mimeType: f.mime_type,
  size: Number(f.size),
  path: f.storage_path,
  folderId: f.folder_id,
  uploaderId: f.uploader_id,
  uploaderName: f.profiles?.name || 'Unknown',
  starred: f.starred,
  tags: f.tags || [],
  content: f.content,
  versions: (f.file_versions || []).map((v: any) => ({
    id: v.id, fileId: v.file_id, version: v.version,
    size: Number(v.size), path: v.storage_path,
    uploaderId: v.uploader_id, createdAt: new Date(v.created_at),
  })),
  createdAt: new Date(f.created_at),
  updatedAt: new Date(f.updated_at),
  deletedAt: f.deleted_at ? new Date(f.deleted_at) : null,
  sharedWith: [],
  isPublic: false,
});

const mapFolder = (f: any): Folder => ({
  id: f.id,
  name: f.name,
  parentId: f.parent_id,
  ownerId: f.owner_id,
  path: f.path,
  color: f.color,
  createdAt: new Date(f.created_at),
  updatedAt: new Date(f.updated_at),
  fileCount: 0,
});

const mapActivity = (a: any): ActivityLog => ({
  id: a.id,
  userId: a.user_id,
  userName: a.user_name,
  action: a.action,
  resourceType: a.resource_type,
  resourceId: a.resource_id,
  resourceName: a.resource_name,
  metadata: a.metadata,
  createdAt: new Date(a.created_at),
});

const mapShare = (s: any): ShareLink => ({
  id: s.id,
  fileId: s.file_id,
  token: s.token,
  password: s.password,
  expiresAt: s.expires_at ? new Date(s.expires_at) : null,
  maxAccess: s.max_access,
  accessCount: s.access_count,
  createdBy: s.created_by,
  createdAt: new Date(s.created_at),
});

const mapTag = (t: any): Tag => ({
  id: t.id,
  name: t.name,
  color: t.color,
  // Use DB-provided count when available, fall back to 0
  fileCount: typeof t.file_count === 'number' ? t.file_count : 0,
});

// ─── state ──────────────────────────────────────────────────────────────────

interface FileState {
  files: FileItem[];
  folders: Folder[];
  tags: Tag[];
  activities: ActivityLog[];
  shares: ShareLink[];
  currentFolderId: string | null;
  selectedFiles: string[];
  viewMode: 'grid' | 'list';
  sortBy: 'name' | 'date' | 'size' | 'type';
  sortOrder: 'asc' | 'desc';
  dataLoaded: boolean;

  loadData: () => Promise<void>;
  resetData: () => void;
  setCurrentFolder: (folderId: string | null) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setSortBy: (s: 'name' | 'date' | 'size' | 'type') => void;
  setSortOrder: (o: 'asc' | 'desc') => void;
  selectFile: (id: string) => void;
  deselectFile: (id: string) => void;
  selectAllFiles: () => void;
  clearSelection: () => void;

  uploadFile: (file: File, folderId: string | null, tags: string[], userId: string, userName: string) => Promise<FileItem>;
  deleteFile: (id: string) => void;
  permanentDeleteFile: (id: string) => void;
  restoreFile: (id: string) => void;
  starFile: (id: string) => void;
  unstarFile: (id: string) => void;
  moveFile: (id: string, folderId: string | null) => void;
  renameFile: (id: string, name: string) => void;
  updateFileTags: (id: string, tags: string[]) => void;
  updateFileContent: (id: string, content: string) => void;

  createFolder: (name: string, parentId: string | null, userId: string) => Promise<Folder>;
  deleteFolder: (id: string) => void;
  renameFolder: (id: string, name: string) => void;

  createShareLink: (fileId: string, userId: string, password?: string, expiresAt?: Date) => Promise<ShareLink>;
  deleteShareLink: (id: string) => void;

  getFilesInFolder: (folderId: string | null) => FileItem[];
  getStarredFiles: () => FileItem[];
  getRecentFiles: (limit?: number) => FileItem[];
  getTrashedFiles: () => FileItem[];
  searchFiles: (query: string, filters?: { tags?: string[]; type?: string; dateFrom?: Date; dateTo?: Date }) => FileItem[];
  getFolderTree: () => Folder[];
  getFolderPath: (folderId: string | null) => Folder[];
  getFileById: (id: string) => FileItem | undefined;
  getFolderById: (id: string) => Folder | undefined;

  logActivity: (a: Omit<ActivityLog, 'id' | 'createdAt'>) => void;
  getRecentActivity: (limit?: number) => ActivityLog[];
}

export const useFileStore = create<FileState>()((set, get) => ({
  files: [],
  folders: [],
  tags: [
    { id: 'tag-1', name: 'Important', color: '#ef4444', fileCount: 0 },
    { id: 'tag-2', name: 'Research', color: '#3b82f6', fileCount: 0 },
    { id: 'tag-3', name: 'Legal', color: '#8b5cf6', fileCount: 0 },
    { id: 'tag-4', name: 'Financial', color: '#10b981', fileCount: 0 },
    { id: 'tag-5', name: 'Historical', color: '#f59e0b', fileCount: 0 },
    { id: 'tag-6', name: 'Confidential', color: '#ec4899', fileCount: 0 },
  ],
  activities: [],
  shares: [],
  currentFolderId: null,
  selectedFiles: [],
  viewMode: 'grid',
  sortBy: 'date',
  sortOrder: 'desc',
  dataLoaded: false,

  loadData: async () => {
    if (!supabaseConfigured || get().dataLoaded) return;

    try {
      // Fetch files without versions (versions are loaded on-demand in FileDetail)
      // Limit initial file fetch to 200 most recent to keep the payload small
      const [filesRes, foldersRes, activitiesRes, sharesRes, tagsRes] = await Promise.all([
        supabase
          .from('files')
          .select('*, profiles(name)')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase.from('folders').select('*').order('name'),
        supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('share_links').select('*'),
        supabase.from('tags').select('*').order('name'),
      ]);

      set({
        files: (filesRes.data || []).map((f) => mapFile({ ...f, file_versions: [] })),
        folders: (foldersRes.data || []).map(mapFolder),
        activities: (activitiesRes.data || []).map(mapActivity),
        shares: (sharesRes.data || []).map(mapShare),
        tags: (tagsRes.data || []).map(mapTag),
        dataLoaded: true,
      });
    } catch (e) {
      console.error('Failed to load data:', e);
      set({ dataLoaded: true });
    }
  },

  // Fix #4: called by authStore.logout() so the next user gets a clean slate
  resetData: () => {
    set({
      files: [],
      folders: [],
      activities: [],
      shares: [],
      currentFolderId: null,
      selectedFiles: [],
      dataLoaded: false,
    });
  },

  setCurrentFolder: (id) => set({ currentFolderId: id, selectedFiles: [] }),
  setViewMode: (m) => set({ viewMode: m }),
  setSortBy: (s) => set({ sortBy: s }),
  setSortOrder: (o) => set({ sortOrder: o }),

  selectFile: (id) => set((s) => ({ selectedFiles: [...s.selectedFiles, id] })),
  deselectFile: (id) => set((s) => ({ selectedFiles: s.selectedFiles.filter((i) => i !== id) })),
  selectAllFiles: () => {
    const files = get().getFilesInFolder(get().currentFolderId);
    set({ selectedFiles: files.map((f) => f.id) });
  },
  clearSelection: () => set({ selectedFiles: [] }),

  uploadFile: async (file, folderId, tags, userId, userName) => {
    const id = uuidv4();
    const storagePath = `${userId}/${id}_${file.name}`;

    // Read text content for text-based files
    let content: string | undefined;
    const textExtensions = ['.txt', '.csv', '.json', '.md', '.xml', '.html', '.css', '.js', '.ts', '.log', '.yml', '.yaml', '.ini', '.cfg', '.conf', '.env', '.sql', '.py', '.sh', '.bat'];
    const isTextFile = file.type.startsWith('text/') || file.type === 'application/json' || file.type === 'application/xml'
      || textExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (isTextFile) {
      try { content = await file.text(); } catch { /* skip */ }
    }

    if (supabaseConfigured) {
      // Upload to Supabase Storage
      const { error: storageErr } = await supabase.storage.from('files').upload(storagePath, file);
      if (storageErr) console.error('Storage upload error:', storageErr);

      // Insert file record
      const { data: inserted, error: dbErr } = await supabase.from('files').insert({
        id, name: file.name, original_name: file.name,
        mime_type: file.type || 'application/octet-stream',
        size: file.size, storage_path: storagePath,
        folder_id: folderId, uploader_id: userId,
        tags, content,
      }).select('*, profiles(name), file_versions(*)').single();

      if (dbErr) console.error('DB insert error:', dbErr);

      // Insert version
      await supabase.from('file_versions').insert({
        file_id: id, version: 1, size: file.size,
        storage_path: storagePath, uploader_id: userId,
      });

      // Log activity
      await supabase.from('activity_log').insert({
        user_id: userId, user_name: userName,
        action: 'upload', resource_type: 'file',
        resource_id: id, resource_name: file.name,
      });

      if (inserted) {
        const mapped = mapFile(inserted);
        set((s) => ({ files: [mapped, ...s.files] }));
        return mapped;
      }
    }

    // Local fallback
    const item: FileItem = {
      id, name: file.name, originalName: file.name,
      mimeType: file.type || 'application/octet-stream', size: file.size,
      path: storagePath, folderId,
      uploaderId: userId, uploaderName: userName,
      starred: false, tags, content,
      versions: [{ id: uuidv4(), fileId: id, version: 1, size: file.size, path: storagePath, uploaderId: userId, createdAt: new Date() }],
      createdAt: new Date(), updatedAt: new Date(),
      deletedAt: null, sharedWith: [], isPublic: false,
    };
    set((s) => ({ files: [item, ...s.files] }));
    get().logActivity({ userId, userName, action: 'upload', resourceType: 'file', resourceId: id, resourceName: file.name });
    return item;
  },

  deleteFile: async (id) => {
    set((s) => ({
      files: s.files.map((f) => f.id === id ? { ...f, deletedAt: new Date() } : f),
      selectedFiles: s.selectedFiles.filter((i) => i !== id),
    }));
    if (supabaseConfigured) {
      await supabase.from('files').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    }
  },

  permanentDeleteFile: async (id) => {
    const file = get().files.find((f) => f.id === id);
    set((s) => ({ files: s.files.filter((f) => f.id !== id) }));
    if (supabaseConfigured) {
      if (file?.path) await supabase.storage.from('files').remove([file.path]);
      await supabase.from('files').delete().eq('id', id);
    }
  },

  restoreFile: async (id) => {
    set((s) => ({ files: s.files.map((f) => f.id === id ? { ...f, deletedAt: null } : f) }));
    if (supabaseConfigured) {
      await supabase.from('files').update({ deleted_at: null }).eq('id', id);
    }
  },

  starFile: async (id) => {
    set((s) => ({ files: s.files.map((f) => f.id === id ? { ...f, starred: true } : f) }));
    if (supabaseConfigured) await supabase.from('files').update({ starred: true }).eq('id', id);
  },

  unstarFile: async (id) => {
    set((s) => ({ files: s.files.map((f) => f.id === id ? { ...f, starred: false } : f) }));
    if (supabaseConfigured) await supabase.from('files').update({ starred: false }).eq('id', id);
  },

  moveFile: async (id, folderId) => {
    set((s) => ({ files: s.files.map((f) => f.id === id ? { ...f, folderId, updatedAt: new Date() } : f) }));
    if (supabaseConfigured) await supabase.from('files').update({ folder_id: folderId, updated_at: new Date().toISOString() }).eq('id', id);
  },

  renameFile: async (id, name) => {
    set((s) => ({ files: s.files.map((f) => f.id === id ? { ...f, name, updatedAt: new Date() } : f) }));
    if (supabaseConfigured) await supabase.from('files').update({ name, updated_at: new Date().toISOString() }).eq('id', id);
  },

  updateFileTags: async (id, tags) => {
    set((s) => ({ files: s.files.map((f) => f.id === id ? { ...f, tags, updatedAt: new Date() } : f) }));
    if (supabaseConfigured) await supabase.from('files').update({ tags, updated_at: new Date().toISOString() }).eq('id', id);
  },

  updateFileContent: async (id, content) => {
    set((s) => ({ files: s.files.map((f) => f.id === id ? { ...f, content, size: new Blob([content]).size, updatedAt: new Date() } : f) }));
    if (supabaseConfigured) await supabase.from('files').update({ content, size: new Blob([content]).size, updated_at: new Date().toISOString() }).eq('id', id);
  },

  createFolder: async (name, parentId, userId) => {
    const id = uuidv4();
    const parent = parentId ? get().getFolderById(parentId) : null;
    const path = parent ? `${parent.path}/${name}` : `/${name}`;

    const folder: Folder = {
      id, name, parentId, ownerId: userId, path,
      createdAt: new Date(), updatedAt: new Date(), fileCount: 0,
    };

    if (supabaseConfigured) {
      const { data } = await supabase.from('folders').insert({
        id, name, parent_id: parentId, owner_id: userId, path,
      }).select().single();

      if (data) {
        const mapped = mapFolder(data);
        set((s) => ({ folders: [...s.folders, mapped] }));
        return mapped;
      }
    }

    set((s) => ({ folders: [...s.folders, folder] }));
    return folder;
  },

  deleteFolder: async (id) => {
    // Fix #8: collect all descendant folder IDs recursively before removing
    const allFolders = get().folders;
    const collectDescendants = (parentId: string): string[] => {
      const children = allFolders.filter((f) => f.parentId === parentId).map((f) => f.id);
      return children.reduce<string[]>((acc, childId) => [...acc, childId, ...collectDescendants(childId)], []);
    };
    const descendantIds = collectDescendants(id);
    const removedIds = new Set([id, ...descendantIds]);

    set((s) => ({
      folders: s.folders.filter((f) => !removedIds.has(f.id)),
      files: s.files.map((f) =>
        f.folderId && removedIds.has(f.folderId) ? { ...f, deletedAt: new Date() } : f
      ),
    }));
    if (supabaseConfigured) {
      await supabase.from('files').update({ deleted_at: new Date().toISOString() }).eq('folder_id', id);
      await supabase.from('folders').delete().eq('id', id); // CASCADE handles children in DB
    }
  },

  renameFolder: async (id, name) => {
    set((s) => ({ folders: s.folders.map((f) => f.id === id ? { ...f, name, updatedAt: new Date() } : f) }));
    if (supabaseConfigured) await supabase.from('folders').update({ name, updated_at: new Date().toISOString() }).eq('id', id);
  },

  createShareLink: async (fileId, userId, password, expiresAt) => {
    const id = uuidv4();
    const token = uuidv4().replace(/-/g, '');

    const share: ShareLink = {
      id, fileId, token, password,
      expiresAt: expiresAt || null,
      accessCount: 0, createdBy: userId, createdAt: new Date(),
    };

    if (supabaseConfigured) {
      const { data } = await supabase.from('share_links').insert({
        id, file_id: fileId, token, password,
        expires_at: expiresAt?.toISOString() || null,
        created_by: userId,
      }).select().single();

      if (data) {
        const mapped = mapShare(data);
        set((s) => ({ shares: [...s.shares, mapped] }));
        return mapped;
      }
    }

    set((s) => ({ shares: [...s.shares, share] }));
    return share;
  },

  deleteShareLink: async (id) => {
    set((s) => ({ shares: s.shares.filter((x) => x.id !== id) }));
    if (supabaseConfigured) await supabase.from('share_links').delete().eq('id', id);
  },

  getFilesInFolder: (folderId) => {
    const s = get();
    const files = s.files.filter((f) => f.folderId === folderId && !f.deletedAt);
    return [...files].sort((a, b) => {
      let c = 0;
      switch (s.sortBy) {
        case 'name': c = a.name.localeCompare(b.name); break;
        case 'date': c = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); break;
        case 'size': c = b.size - a.size; break;
        case 'type': c = a.mimeType.localeCompare(b.mimeType); break;
      }
      return s.sortOrder === 'asc' ? c : -c;
    });
  },

  getStarredFiles: () => get().files.filter((f) => f.starred && !f.deletedAt),
  getRecentFiles: (limit = 10) =>
    [...get().files].filter((f) => !f.deletedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit),
  getTrashedFiles: () => get().files.filter((f) => f.deletedAt !== null),

  searchFiles: (query, filters) => {
    let files = get().files.filter((f) => !f.deletedAt);
    if (query) {
      const q = query.toLowerCase();
      files = files.filter((f) => f.name.toLowerCase().includes(q) || f.tags.some((t) => t.toLowerCase().includes(q)));
    }
    if (filters?.tags?.length) files = files.filter((f) => filters.tags!.some((t) => f.tags.includes(t)));
    if (filters?.type) files = files.filter((f) => f.mimeType.startsWith(filters.type!));
    if (filters?.dateFrom) files = files.filter((f) => new Date(f.createdAt) >= filters.dateFrom!);
    if (filters?.dateTo) files = files.filter((f) => new Date(f.createdAt) <= filters.dateTo!);
    return files;
  },

  getFolderTree: () => {
    const folders = get().folders;
    const build = (p: Folder): Folder => ({
      ...p, children: folders.filter((f) => f.parentId === p.id).map(build),
    });
    return folders.filter((f) => !f.parentId).map(build);
  },

  getFolderPath: (folderId) => {
    if (!folderId) return [];
    const folders = get().folders;
    const path: Folder[] = [];
    let cur = folders.find((f) => f.id === folderId);
    while (cur) {
      path.unshift(cur);
      cur = cur.parentId ? folders.find((f) => f.id === cur!.parentId) : undefined;
    }
    return path;
  },

  getFileById: (id) => get().files.find((f) => f.id === id),
  getFolderById: (id) => get().folders.find((f) => f.id === id),

  logActivity: async (a) => {
    const entry: ActivityLog = { ...a, id: uuidv4(), createdAt: new Date() };
    set((s) => ({ activities: [entry, ...s.activities].slice(0, 100) }));

    if (supabaseConfigured) {
      await supabase.from('activity_log').insert({
        user_id: a.userId, user_name: a.userName,
        action: a.action, resource_type: a.resourceType,
        resource_id: a.resourceId, resource_name: a.resourceName,
        metadata: a.metadata,
      });
    }
  },

  getRecentActivity: (limit = 20) => get().activities.slice(0, limit),
}));
