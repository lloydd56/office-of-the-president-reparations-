// ============================================================================
// OFFICE OF THE PRESIDENT - REPARATIONS
// Enterprise File Management System - Type Definitions
// ============================================================================

// User Roles for RBAC
export type UserRole = 'admin' | 'manager' | 'staff' | 'guest';

// User approval status
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// User entity
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  approved: boolean;
  approvalStatus: ApprovalStatus;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

// Authentication state
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// File entity
export interface FileItem {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  folderId: string | null;
  uploaderId: string;
  uploaderName: string;
  starred: boolean;
  tags: string[];
  versions: FileVersion[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  sharedWith: string[];
  isPublic: boolean;
  content?: string;
}

// File version for version history
export interface FileVersion {
  id: string;
  fileId: string;
  version: number;
  size: number;
  path: string;
  uploaderId: string;
  createdAt: Date;
  comment?: string;
}

// Folder entity
export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  ownerId: string;
  path: string;
  color?: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
  children?: Folder[];
  fileCount?: number;
}

// Share link entity
export interface ShareLink {
  id: string;
  fileId: string;
  token: string;
  password?: string;
  expiresAt: Date | null;
  accessCount: number;
  maxAccess?: number;
  createdBy: string;
  createdAt: Date;
}

// Activity log entry
export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  action: ActivityAction;
  resourceType: 'file' | 'folder' | 'user' | 'share' | 'system';
  resourceId: string;
  resourceName: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// Activity action types
export type ActivityAction =
  | 'upload'
  | 'download'
  | 'view'
  | 'edit'
  | 'delete'
  | 'restore'
  | 'share'
  | 'unshare'
  | 'move'
  | 'rename'
  | 'star'
  | 'unstar'
  | 'tag'
  | 'untag'
  | 'create_folder'
  | 'delete_folder'
  | 'login'
  | 'logout'
  | 'register'
  | 'approve_user'
  | 'reject_user'
  | 'update_role'
  | 'password_change';

// Tag entity
export interface Tag {
  id: string;
  name: string;
  color: string;
  fileCount: number;
}

// System statistics
export interface SystemStats {
  totalUsers: number;
  pendingUsers: number;
  totalFiles: number;
  totalFolders: number;
  totalStorage: number;
  storageUsed: number;
  activeShares: number;
  todayUploads: number;
  todayDownloads: number;
  weeklyActivity: { date: string; uploads: number; downloads: number }[];
}

// Search parameters
export interface SearchParams {
  query: string;
  type?: string[];
  tags?: string[];
  uploaderId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  starred?: boolean;
  folderId?: string;
}

// Upload progress tracking
export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

// Notification
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

// Theme settings
export interface ThemeSettings {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  compactMode: boolean;
  showFileExtensions: boolean;
  defaultView: 'grid' | 'list';
}

// User preferences
export interface UserPreferences {
  theme: ThemeSettings;
  notifications: {
    email: boolean;
    browser: boolean;
    uploadComplete: boolean;
    shareAccess: boolean;
    systemAlerts: boolean;
  };
  defaultUploadFolder: string | null;
  autoTagging: boolean;
}
