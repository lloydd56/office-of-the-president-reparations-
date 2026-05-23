import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Shield, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../store/authStore';

export const PendingApproval: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const handleRefresh = () => {
    window.location.reload();
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyek0zNiAxNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      
      <div className="relative w-full max-w-lg text-center">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-2xl mb-6">
          <Clock className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-4">
          Account Pending Approval
        </h1>
        
        <p className="text-slate-300 text-lg mb-8">
          Hello <span className="font-semibold text-white">{user?.name}</span>, your account is currently awaiting administrator approval.
        </p>
        
        {/* Status Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-indigo-400" />
            <span className="text-white font-medium">Account Status</span>
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-amber-400 font-semibold text-lg">Pending Review</span>
          </div>
          
          <div className="space-y-4 text-left">
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-slate-400">Email</span>
              <span className="text-white">{user?.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-slate-400">Role</span>
              <span className="text-white capitalize">{user?.role}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Registered</span>
              <span className="text-white">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>
        
        <p className="text-slate-400 mb-8">
          An administrator will review your registration request. You will be able to access the system once your account has been approved.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={handleRefresh}
            variant="outline"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            className="border-white/30 text-white hover:bg-white/10"
          >
            Check Status
          </Button>
          <Button
            onClick={handleLogout}
            variant="ghost"
            leftIcon={<LogOut className="w-4 h-4" />}
            className="text-slate-300 hover:text-white hover:bg-white/10"
          >
            Sign Out
          </Button>
        </div>
        
        <p className="mt-8 text-sm text-slate-500">
          Need immediate access? Contact your system administrator.
        </p>
      </div>
    </div>
  );
};
