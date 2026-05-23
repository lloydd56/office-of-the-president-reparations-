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
import { UserRole } from './types';

// ─── Route guards ────────────────────────────────────────────────────────────

/** Redirect already-authenticated users away from login/register */
const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated) {
    if (!user?.approved) return <Navigate to="/pending-approval" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

/** Fix #12: require authentication before showing pending-approval page */
const PendingApprovalRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

/** Require admin role */
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

/**
 * Fix #11: enforce minimum role for a route.
 * Role hierarchy: guest < staff < manager < admin
 */
const roleLevel: Record<UserRole, number> = {
  guest: 0,
  staff: 1,
  manager: 2,
  admin: 3,
};

const RoleRoute: React.FC<{ children: React.ReactNode; minRole: UserRole }> = ({
  children,
  minRole,
}) => {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (roleLevel[user.role] < roleLevel[minRole]) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

// ─── App ─────────────────────────────────────────────────────────────────────

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
        {/* Public auth routes — redirect away if already logged in */}
        <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
        <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />

        {/* Fix #12: require auth to see pending-approval */}
        <Route path="/pending-approval" element={<PendingApprovalRoute><PendingApproval /></PendingApprovalRoute>} />

        {/* Public share page — no auth required */}
        <Route path="/share/:token" element={<SharePage />} />

        {/* Protected routes — MainLayout handles auth + approval checks */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/file/:id" element={<FileDetail />} />
          <Route path="/trash" element={<Trash />} />
          <Route path="/search" element={<Search />} />
          <Route path="/starred" element={<Starred />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/settings" element={<Settings />} />

          {/* Fix #11: upload requires at least staff role (guests cannot upload) */}
          <Route
            path="/upload"
            element={<RoleRoute minRole="staff"><Upload /></RoleRoute>}
          />

          {/* Admin only */}
          <Route
            path="/admin"
            element={<AdminRoute><Admin /></AdminRoute>}
          />
        </Route>

        {/* Fix #6: unknown routes go to login, not register */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
