import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  HardDrive,
  FileText,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useAuthStore } from '../store/authStore';
import { useFileStore } from '../store/fileStore';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { cn } from '../utils/cn';
import { User, UserRole } from '../types';

// ─── Types for the get_system_stats RPC ──────────────────────────────────────
interface SystemStats {
  total_users: number;
  pending_users: number;
  active_users?: number;
  total_files: number;
  trashed_files: number;
  total_folders: number;
  total_storage: number;
  active_shares: number;
  today_uploads: number;
  users_by_role: Record<string, number>;
  storage_by_user: { user_id: string; name: string; bytes_used: number; file_count: number }[];
}

export const Admin: React.FC = () => {
  const { user: currentUser, getAllUsers, getPendingUsers, approveUser, rejectUser, updateUserRole } = useAuthStore();
  const { getRecentActivity } = useFileStore();
  
  const allUsers = getAllUsers();
  const pendingUsers = getPendingUsers();
  const activities = getRecentActivity(10);
  
  const [activeTab, setActiveTab] = useState<'pending' | 'users' | 'activity' | 'stats'>('pending');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>('staff');

  // ── Server-side stats via get_system_stats() RPC ──────────────────────────
  const [dbStats, setDbStats] = useState<SystemStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchStats = async () => {
    if (!supabaseConfigured) return;
    setStatsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_system_stats');
      if (!error && data) setDbStats(data as SystemStats);
    } catch { /* ignore */ }
    setStatsLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'stats') fetchStats();
  }, [activeTab]);

  // Fallback stats from local store (used for quick cards at top)
  const localStats = {
    totalUsers: allUsers.length,
    pendingUsers: pendingUsers.length,
    activeUsers: allUsers.filter(u => u.approved).length,
    totalFiles: dbStats?.total_files ?? 0,
    totalFolders: dbStats?.total_folders ?? 0,
    totalStorage: dbStats?.total_storage ?? 0,
  };
  
  const formatStorage = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };
  
  const handleApprove = (userId: string) => {
    approveUser(userId);
  };
  
  const handleReject = (userId: string) => {
    rejectUser(userId);
  };
  
  const handleChangeRole = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowRoleModal(true);
  };
  
  const confirmRoleChange = () => {
    if (selectedUser) {
      updateUserRole(selectedUser.id, newRole);
      setShowRoleModal(false);
      setSelectedUser(null);
    }
  };
  
  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'danger';
      case 'manager': return 'warning';
      case 'staff': return 'info';
      case 'guest': return 'default';
    }
  };
  
  const getStatusBadge = (user: User) => {
    if (user.approvalStatus === 'pending') {
      return <Badge variant="warning">Pending</Badge>;
    }
    if (user.approvalStatus === 'rejected') {
      return <Badge variant="danger">Rejected</Badge>;
    }
    return <Badge variant="success">Active</Badge>;
  };
  
  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'upload': return '📤';
      case 'download': return '📥';
      case 'delete': return '🗑️';
      case 'share': return '🔗';
      case 'login': return '🔐';
      case 'register': return '📝';
      case 'star': return '⭐';
      case 'create_folder': return '📁';
      default: return '📋';
    }
  };
  
  const tabs = [
    { id: 'pending', label: 'Pending Approvals', count: pendingUsers.length },
    { id: 'users', label: 'All Users', count: allUsers.length },
    { id: 'activity', label: 'Activity Log' },
    { id: 'stats', label: 'Statistics' },
  ];
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Shield className="w-7 h-7 text-indigo-600" />
            Admin Panel
          </h1>
          <p className="text-slate-500 mt-1">
            Manage users, view activity, and monitor system statistics
          </p>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{localStats.totalUsers}</p>
              <p className="text-sm text-slate-500">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-xl">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{localStats.pendingUsers}</p>
              <p className="text-sm text-slate-500">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{localStats.totalFiles}</p>
              <p className="text-sm text-slate-500">Files</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <HardDrive className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{formatStorage(localStats.totalStorage)}</p>
              <p className="text-sm text-slate-500">Storage</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs — scrollable on mobile */}
      <div className="flex gap-0 border-b border-slate-200 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'px-3 md:px-4 py-3 text-xs md:text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0',
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={cn(
                'px-1.5 py-0.5 text-xs font-semibold rounded-full',
                activeTab === tab.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      
      {/* Pending Approvals */}
      {activeTab === 'pending' && (
        <Card>
          <CardContent className="p-0">
            {pendingUsers.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-900">All caught up!</h3>
                <p className="text-slate-500">No pending user approvals</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingUsers.map(user => (
                  <div key={user.id} className="px-4 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-semibold shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">{user.name}</p>
                        <p className="text-sm text-slate-500 truncate">{user.email}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Registered {format(new Date(user.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(user.id)}
                        leftIcon={<XCircle className="w-4 h-4" />}
                        className="text-red-600 border-red-200 hover:bg-red-50 flex-1 sm:flex-none"
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(user.id)}
                        leftIcon={<CheckCircle className="w-4 h-4" />}
                        className="flex-1 sm:flex-none"
                      >
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* All Users */}
      {activeTab === 'users' && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 md:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="text-left px-4 md:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="text-left px-4 md:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 md:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Last Login</th>
                  <th className="text-left px-4 md:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0',
                          user.role === 'admin' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'
                        )}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">{user.name}</p>
                          <p className="text-xs text-slate-500 truncate hidden sm:block">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      {getStatusBadge(user)}
                    </td>
                    <td className="px-4 md:px-6 py-4 text-sm text-slate-500 hidden md:table-cell">
                      {user.lastLoginAt
                        ? format(new Date(user.lastLoginAt), 'MMM d, yyyy')
                        : 'Never'}
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      {user.id !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleChangeRole(user)}
                        >
                          <span className="hidden sm:inline">Change </span>Role
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      
      {/* Activity Log */}
      {activeTab === 'activity' && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {activities.map(activity => (
                <div key={activity.id} className="px-6 py-4 flex items-start gap-4">
                  <div className="text-2xl">{getActivityIcon(activity.action)}</div>
                  <div className="flex-1">
                    <p className="text-slate-900">
                      <span className="font-medium">{activity.userName}</span>
                      {' '}
                      <span className="text-slate-500">{activity.action.replace('_', ' ')}</span>
                      {' '}
                      <span className="font-medium">{activity.resourceName}</span>
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      {format(new Date(activity.createdAt), 'MMM d, yyyy · h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Statistics */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStats}
              isLoading={statsLoading}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-slate-400" />
                  <h3 className="font-semibold text-slate-900">System Overview</h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    ['Total Users',    dbStats?.total_users   ?? localStats.totalUsers],
                    ['Active Users',   dbStats ? (dbStats.total_users - dbStats.pending_users) : localStats.activeUsers],
                    ['Pending Users',  dbStats?.pending_users ?? localStats.pendingUsers],
                    ['Total Files',    dbStats?.total_files   ?? '—'],
                    ['Trashed Files',  dbStats?.trashed_files ?? '—'],
                    ['Total Folders',  dbStats?.total_folders ?? '—'],
                    ['Active Shares',  dbStats?.active_shares ?? '—'],
                    ["Today's Uploads",dbStats?.today_uploads ?? '—'],
                    ['Storage Used',   formatStorage(dbStats?.total_storage ?? 0)],
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                      <span className="text-slate-500">{label}</span>
                      <span className="font-semibold text-slate-900">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-slate-400" />
                  <h3 className="font-semibold text-slate-900">User Roles Distribution</h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(['admin', 'manager', 'staff', 'guest'] as UserRole[]).map(role => {
                    const count = dbStats?.users_by_role?.[role] ?? allUsers.filter(u => u.role === role).length;
                    const total = dbStats?.total_users ?? localStats.totalUsers;
                    const percentage = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={role}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-600 capitalize">{role}</span>
                          <span className="text-slate-900 font-medium">{count}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              role === 'admin'   && 'bg-red-500',
                              role === 'manager' && 'bg-amber-500',
                              role === 'staff'   && 'bg-blue-500',
                              role === 'guest'   && 'bg-slate-400'
                            )}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Storage by user — only available from DB stats */}
            {dbStats?.storage_by_user && dbStats.storage_by_user.length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-slate-400" />
                    <h3 className="font-semibold text-slate-900">Top Storage Users</h3>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Files</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Storage Used</th>
                        <th className="px-6 py-3 w-48"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dbStats.storage_by_user.map((row) => {
                        const maxBytes = dbStats.storage_by_user[0]?.bytes_used || 1;
                        const pct = (row.bytes_used / maxBytes) * 100;
                        return (
                          <tr key={row.user_id} className="hover:bg-slate-50">
                            <td className="px-6 py-3 font-medium text-slate-900">{row.name}</td>
                            <td className="px-6 py-3 text-slate-500">{row.file_count}</td>
                            <td className="px-6 py-3 text-slate-500">{formatStorage(row.bytes_used)}</td>
                            <td className="px-6 py-3">
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
      
      {/* Change Role Modal */}
      <Modal
        isOpen={showRoleModal}
        onClose={() => {
          setShowRoleModal(false);
          setSelectedUser(null);
        }}
        title={`Change Role for ${selectedUser?.name}`}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select New Role
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
              <option value="guest">Guest</option>
            </select>
          </div>
          
          <div className="p-4 bg-slate-50 rounded-lg">
            <h4 className="text-sm font-medium text-slate-700 mb-2">Role Permissions:</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              {newRole === 'admin' && (
                <>
                  <li>• Full system access</li>
                  <li>• Manage users and approvals</li>
                  <li>• View all files and folders</li>
                </>
              )}
              {newRole === 'manager' && (
                <>
                  <li>• Manage team files</li>
                  <li>• Create and share folders</li>
                  <li>• View activity logs</li>
                </>
              )}
              {newRole === 'staff' && (
                <>
                  <li>• Upload and manage own files</li>
                  <li>• View shared content</li>
                  <li>• Basic collaboration features</li>
                </>
              )}
              {newRole === 'guest' && (
                <>
                  <li>• View shared files only</li>
                  <li>• No upload permissions</li>
                  <li>• Limited access</li>
                </>
              )}
            </ul>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowRoleModal(false)}>
              Cancel
            </Button>
            <Button onClick={confirmRoleChange}>
              Update Role
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
