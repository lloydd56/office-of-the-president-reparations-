import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { PendingApproval } from './pages/PendingApproval';
import { Dashboard } from './pages/Dashboard';
import { Upload } from './pages/Upload';
import { FileDetail } from './pages/FileDetail';
import { Trash } from './pages/Trash';
import { Search } from './pages/Search';
import { Starred } from './pages/Starred';
import { Admin } from './pages/Admin';
import { Settings } from './pages/Settings';
import { Activity } from './pages/Activity';
import { SharePage } from './pages/SharePage';
import { useAuthStore } from './store/authStore';
import { useFileStore } from './store/fileStore';
import { Shield } from 'lucide-react';

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated) {
    if (!user?.approved) return <Navigate to="/pending-approval" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

function App() {
  const initialize = useAuthStore((s) => s.initialize);
  const initialized = useAuthStore((s) => s.initialized);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loadData = useFileStore((s) => s.loadData);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-lg mb-4 animate-pulse">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-500">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
        <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />
        <Route path="/pending-approval" element={<PendingApproval />} />
        <Route path="/share/:token" element={<SharePage />} />

        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/file/:id" element={<FileDetail />} />
          <Route path="/trash" element={<Trash />} />
          <Route path="/search" element={<Search />} />
          <Route path="/starred" element={<Starred />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
        </Route>

        <Route path="/" element={<Navigate to="/register" replace />} />
        <Route path="*" element={<Navigate to="/register" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
