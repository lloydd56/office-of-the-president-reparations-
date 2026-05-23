import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useFileStore } from '../../store/fileStore';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const activities = useFileStore((s) => s.activities);

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setShowUserMenu(false);
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node))
        setShowNotifications(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Use recent activities as notifications
  const recentActivities = activities.slice(0, 5);

  return (
    <header className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search files, folders, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </form>

      {/* Right Side */}
      <div className="flex items-center gap-4 ml-6">
        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <Bell className="w-5 h-5" />
            {recentActivities.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900">Recent Activity</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {recentActivities.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No activity yet</p>
                  </div>
                ) : (
                  recentActivities.map((a) => (
                    <div key={a.id} className="px-4 py-3 border-b border-slate-100 hover:bg-slate-50">
                      <p className="text-sm text-slate-900">
                        <span className="font-medium">{a.userName}</span>{' '}
                        <span className="text-slate-500">{a.action.replace('_', ' ')}</span>{' '}
                        <span className="font-medium">{a.resourceName}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(a.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
              {recentActivities.length > 0 && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
                  <button
                    onClick={() => { setShowNotifications(false); navigate('/activity'); }}
                    className="w-full text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    View all activity
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 pl-4 border-l border-slate-200"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-200">
                <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <div className="py-2">
                <button
                  onClick={() => { setShowUserMenu(false); navigate('/settings'); }}
                  className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                >
                  <User className="w-4 h-4" /> Profile
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); navigate('/settings'); }}
                  className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                >
                  <Settings className="w-4 h-4" /> Settings
                </button>
              </div>
              <div className="py-2 border-t border-slate-200">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
