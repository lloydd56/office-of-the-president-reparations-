import React, { useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { PendingApproval } from './pages/PendingApproval';
import { useAuthStore } from './store/authStore';
import { useFileStore } from './store/fileStore';
import { Shield } from 'lucide-react';
import { UserRole } from './types';

// Lazy-load heavy pages so they're only bundled/parsed when visited
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Upload = lazy(() => import('./pages/Upload').then((m) => ({ default: m.Upload })));
const FileDetail = lazy(() => import('./pages/FileDetail').then((m) => ({ default: m.FileDetail })));
const Trash = lazy(() => import('./pages/Trash').then((m) => ({ default: m.Trash })));
const Search = lazy(() => import('./pages/Search').then((m) => ({ default: m.Search })));
const Starred = lazy(() => import('./pages/Starred').then((m) => ({ default: m.Starred })));
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const Activity = lazy(() => import('./pages/Activity').then((m) => ({ default: m.Activity })));
const SharePage = lazy(() => import('./pages/SharePage').then((m) => ({ default: m.SharePage })));

const PageLoader = () => (
  <div className="flex h-full items-center justify-center">
    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
  </div>
);

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
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
    </HashRouter>
  );
}

export default App;
