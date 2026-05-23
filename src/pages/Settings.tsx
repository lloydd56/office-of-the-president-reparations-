import React, { useState, useEffect } from 'react';
import {
  User,
  Lock,
  Bell,
  Palette,
  Shield,
  Camera,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuthStore } from '../store/authStore';
import { useFileStore } from '../store/fileStore';
import { cn } from '../utils/cn';

export const Settings: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const changePassword = useAuthStore((s) => s.changePassword);
  const viewMode = useFileStore((s) => s.viewMode);
  const setViewMode = useFileStore((s) => s.setViewMode);

  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [profileSaved, setProfileSaved] = useState(false);
  
  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Notification settings
  const [notifications, setNotifications] = useState({
    email: true,
    browser: true,
    uploadComplete: true,
    shareAccess: true,
    systemAlerts: false,
  });
  const [notificationsSaved, setNotificationsSaved] = useState(false);

  // Appearance settings
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [compactMode, setCompactMode] = useState(false);
  const [showFileExtensions, setShowFileExtensions] = useState(true);
  const [defaultView, setDefaultView] = useState<'grid' | 'list'>(viewMode);
  const [appearanceSaved, setAppearanceSaved] = useState(false);

  // Sync defaultView with store
  useEffect(() => {
    setDefaultView(viewMode);
  }, [viewMode]);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Lock className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
  ];

  // Password validation
  const passwordRequirements = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(newPassword) },
    { label: 'Contains a number', met: /[0-9]/.test(newPassword) },
    { label: 'Contains special character', met: /[^A-Za-z0-9]/.test(newPassword) },
  ];
  const allRequirementsMet = passwordRequirements.every((r) => r.met);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSaveProfile = () => {
    if (!name.trim()) return;
    updateUser({ name: name.trim() });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handleSavePassword = async () => {
    setPasswordError('');
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError('Please enter your current password');
      return;
    }
    if (!allRequirementsMet) {
      setPasswordError('New password does not meet requirements');
      return;
    }
    if (!passwordsMatch) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordLoading(true);
    // Fix #9: actually call Supabase to change the password
    const result = await changePassword(currentPassword, newPassword);
    setPasswordLoading(false);

    if (result.success) {
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } else {
      setPasswordError(result.error || 'Password change failed');
    }
  };

  const handleSaveNotifications = () => {
    // In real app, would save to backend
    setNotificationsSaved(true);
    setTimeout(() => setNotificationsSaved(false), 3000);
  };

  const handleSaveAppearance = () => {
    setViewMode(defaultView);
    // In real app, would save theme and other preferences
    setAppearanceSaved(true);
    setTimeout(() => setAppearanceSaved(false), 3000);
  };

  const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
        enabled ? 'bg-indigo-600' : 'bg-slate-200'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm',
          enabled ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account settings and preferences</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="md:w-48 shrink-0">
          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors',
                  activeTab === tab.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-slate-900">Profile Information</h2>
                <p className="text-sm text-slate-500">Update your profile details and avatar</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                      <Camera className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900">{user?.name}</h3>
                    <p className="text-sm text-slate-500 capitalize">{user?.role}</p>
                    <p className="text-xs text-slate-400 mt-1">{user?.email}</p>
                  </div>
                </div>

                {/* Form */}
                <div className="space-y-4">
                  <Input
                    label="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    leftIcon={<User className="w-4 h-4" />}
                    placeholder="Enter your name"
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    leftIcon={<span className="text-xs">@</span>}
                  />
                </div>

                {/* Role Info */}
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">Role:</span>
                    <span className="font-medium text-slate-900 capitalize">{user?.role}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Contact an administrator to change your role
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={handleSaveProfile} disabled={!name.trim()}>
                    Save Changes
                  </Button>
                  {profileSaved && (
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <Check className="w-4 h-4" />
                      Profile updated successfully
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-slate-900">Security Settings</h2>
                <p className="text-sm text-slate-500">Manage your password and security preferences</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {passwordError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{passwordError}</p>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-green-700">Password updated successfully!</p>
                  </div>
                )}

                <div className="space-y-4">
                  <Input
                    label="Current Password"
                    type={showPasswords ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                  <Input
                    label="New Password"
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4" />}
                  />

                  {/* Password Requirements */}
                  {newPassword.length > 0 && (
                    <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                      <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Password Requirements</p>
                      {passwordRequirements.map((req, i) => (
                        <div key={i} className="flex items-center gap-2">
                          {req.met ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                          )}
                          <span className={cn('text-sm', req.met ? 'text-green-700' : 'text-slate-500')}>
                            {req.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Input
                    label="Confirm New Password"
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4" />}
                    error={confirmPassword && !passwordsMatch ? 'Passwords do not match' : undefined}
                  />
                </div>

                <Button
                  onClick={handleSavePassword}
                  disabled={!currentPassword || !newPassword || !confirmPassword}
                  isLoading={passwordLoading}
                >
                  Update Password
                </Button>

                {/* Sessions */}
                <div className="pt-6 border-t border-slate-200">
                  <h3 className="font-medium text-slate-900 mb-4">Active Sessions</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">Current Session</p>
                        <p className="text-sm text-slate-500">This device · Active now</p>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-slate-900">Notification Preferences</h2>
                <p className="text-sm text-slate-500">Choose how and when you want to be notified</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-1">
                  {[
                    { key: 'email', label: 'Email Notifications', description: 'Receive notifications via email' },
                    { key: 'browser', label: 'Browser Notifications', description: 'Show desktop notifications' },
                    { key: 'uploadComplete', label: 'Upload Complete', description: 'Notify when file uploads finish' },
                    { key: 'shareAccess', label: 'Share Activity', description: 'Notify when shared files are accessed' },
                    { key: 'systemAlerts', label: 'System Alerts', description: 'Important system announcements' },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{item.label}</p>
                        <p className="text-sm text-slate-500">{item.description}</p>
                      </div>
                      <ToggleSwitch
                        enabled={notifications[item.key as keyof typeof notifications]}
                        onChange={() =>
                          setNotifications((prev) => ({
                            ...prev,
                            [item.key]: !prev[item.key as keyof typeof prev],
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={handleSaveNotifications}>Save Preferences</Button>
                  {notificationsSaved && (
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <Check className="w-4 h-4" />
                      Preferences saved
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-slate-900">Appearance</h2>
                <p className="text-sm text-slate-500">Customize the look and feel of the application</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">Theme</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['light', 'dark', 'system'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={cn(
                          'p-4 rounded-lg border-2 text-center transition-all',
                          theme === t
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-slate-200 hover:border-slate-300'
                        )}
                      >
                        <div
                          className={cn(
                            'w-10 h-10 rounded-full mx-auto mb-2',
                            t === 'light' && 'bg-gradient-to-br from-amber-300 to-yellow-500',
                            t === 'dark' && 'bg-gradient-to-br from-slate-700 to-slate-900',
                            t === 'system' && 'bg-gradient-to-br from-blue-400 to-purple-500'
                          )}
                        />
                        <span className="text-sm font-medium text-slate-900 capitalize">{t}</span>
                      </button>
                    ))}
                  </div>
                  {theme === 'dark' && (
                    <p className="text-xs text-amber-600 mt-2">
                      Note: Dark mode is a preview feature and not fully implemented yet.
                    </p>
                  )}
                </div>

                {/* Default View */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">Default File View</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDefaultView('grid')}
                      className={cn(
                        'flex-1 p-4 rounded-lg border-2 text-center transition-all',
                        defaultView === 'grid'
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <div className="grid grid-cols-3 gap-1 w-12 mx-auto mb-2">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="w-3 h-3 bg-slate-300 rounded-sm" />
                        ))}
                      </div>
                      <span className="text-sm font-medium text-slate-900">Grid View</span>
                    </button>
                    <button
                      onClick={() => setDefaultView('list')}
                      className={cn(
                        'flex-1 p-4 rounded-lg border-2 text-center transition-all',
                        defaultView === 'list'
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <div className="space-y-1 w-12 mx-auto mb-2">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="h-2 bg-slate-300 rounded-sm" />
                        ))}
                      </div>
                      <span className="text-sm font-medium text-slate-900">List View</span>
                    </button>
                  </div>
                </div>

                {/* Toggle Options */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between py-4 border-b border-slate-100">
                    <div>
                      <p className="font-medium text-slate-900">Compact Mode</p>
                      <p className="text-sm text-slate-500">Reduce spacing and padding</p>
                    </div>
                    <ToggleSwitch enabled={compactMode} onChange={() => setCompactMode(!compactMode)} />
                  </div>

                  <div className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium text-slate-900">Show File Extensions</p>
                      <p className="text-sm text-slate-500">Display .pdf, .docx, etc.</p>
                    </div>
                    <ToggleSwitch
                      enabled={showFileExtensions}
                      onChange={() => setShowFileExtensions(!showFileExtensions)}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={handleSaveAppearance}>Save Appearance</Button>
                  {appearanceSaved && (
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <Check className="w-4 h-4" />
                      Appearance saved
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
