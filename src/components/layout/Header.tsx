import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useFileStore } from '../../store/fileStore';

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const activities = useFileStore((s) => s.activities);

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
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
      setShowMobileSearch(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const recentActivities = activities.slice(0, 5);

  return (
    <header className="h-14 md:h-16 shrink-0 bg-white border-b border-slate-200 flex items-center px-3 md:px-6 gap-3">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg shrink-0"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Desktop search */}
      <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search files, folders, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </form>

      {/* Mobile: page title placeholder so search icon sits on the right */}
      <div className="flex-1 md:hidden" />

      {/* Right side */}
      <div className="flex items-center gap-1 md:gap-3 ml-auto">
        {/* Mobile search toggle */}
        <button
          onClick={() => setShowMobileSearch((v) => !v)}
          className="md:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          aria-label="Search"
        >
          {showMobileSearch ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {recentActivities.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900">Recent Activity</h3>
              </div>
              <div className="max-h-72 overflow-y-auto">
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
            className="flex items-center gap-2 pl-2 md:pl-4 md:border-l md:border-slate-200"
            aria-label="User menu"
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-slate-900 leading-tight">{user?.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-200">
                <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
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

      {/* Mobile search bar — slides down when toggled */}
      {showMobileSearch && (
        <form
          onSubmit={handleSearch}
          className="absolute top-14 left-0 right-0 z-40 bg-white border-b border-slate-200 px-4 py-3 md:hidden"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search files, folders, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </form>
      )}
    </header>
  );
};
