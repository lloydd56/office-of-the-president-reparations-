import { create } from 'zustand';
import { User, UserRole, ApprovalStatus } from '../types';
import { supabase, supabaseConfigured } from '../lib/supabase';

interface AuthState {
  user: User | null;
  users: User[];
  isAuthenticated: boolean;
  isLoading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requiresApproval?: boolean }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string; isFirstUser?: boolean; needsConfirmation?: boolean }>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  approveUser: (userId: string) => void;
  rejectUser: (userId: string) => void;
  updateUserRole: (userId: string, role: UserRole) => void;
  getPendingUsers: () => User[];
  getAllUsers: () => User[];
  initialize: () => Promise<void>;
  refreshUsers: () => Promise<void>;
}

const mapProfile = (p: any): User => ({
  id: p.id,
  email: p.email,
  name: p.name,
  role: p.role as UserRole,
  approved: p.approved,
  approvalStatus: p.approval_status as ApprovalStatus,
  avatar: p.avatar_url,
  createdAt: new Date(p.created_at),
  updatedAt: new Date(p.updated_at),
});

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  users: [],
  isAuthenticated: false,
  isLoading: false,
  initialized: false,

  initialize: async () => {
    if (!supabaseConfigured) {
      set({ initialized: true });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          set({ user: mapProfile(profile), isAuthenticated: true });
        }
      }

      // Load all profiles
      await get().refreshUsers();
    } catch (e) {
      console.error('Auth init error:', e);
    }

    set({ initialized: true });

    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        set({ user: null, isAuthenticated: false });
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Small delay for trigger to create profile
        await new Promise((r) => setTimeout(r, 300));

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          set({ user: mapProfile(profile), isAuthenticated: true });
          await get().refreshUsers();
        }
      }
    });
  },

  refreshUsers: async () => {
    if (!supabaseConfigured) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) set({ users: data.map(mapProfile) });
    } catch { /* ignore */ }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });

    if (!supabaseConfigured) {
      set({ isLoading: false });
      return { success: false, error: 'Supabase is not configured.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        set({ isLoading: false });
        return { success: false, error: error.message };
      }

      if (!data.user) {
        set({ isLoading: false });
        return { success: false, error: 'Login failed' };
      }

      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        set({ isLoading: false });
        return { success: false, error: 'Profile not found. The database may not be set up — run the SQL schema in Supabase.' };
      }

      if (profile.approval_status === 'rejected') {
        await supabase.auth.signOut();
        set({ isLoading: false });
        return { success: false, error: 'Your account has been rejected.' };
      }

      const mappedUser = mapProfile(profile);
      set({ user: mappedUser, isAuthenticated: true, isLoading: false });

      // Load users + log activity (fire and forget)
      get().refreshUsers();
      supabase.from('activity_log').insert({
        user_id: data.user.id,
        user_name: profile.name,
        action: 'login',
        resource_type: 'user',
        resource_id: data.user.id,
        resource_name: profile.name,
      }).then();

      return { success: true, requiresApproval: !profile.approved };
    } catch (e: any) {
      set({ isLoading: false });
      return { success: false, error: e.message || 'Login failed' };
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ isLoading: true });

    if (!supabaseConfigured) {
      set({ isLoading: false });
      return { success: false, error: 'Supabase is not configured.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        set({ isLoading: false });
        return { success: false, error: error.message };
      }

      if (!data.user) {
        set({ isLoading: false });
        return { success: false, error: 'Registration failed' };
      }

      // If session is null, email confirmation is needed
      const needsConfirmation = !data.session;

      if (!needsConfirmation) {
        // User is auto-confirmed, wait for trigger then load profile
        await new Promise((r) => setTimeout(r, 800));

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        const isFirstUser = profile?.role === 'admin';
        await get().refreshUsers();

        set({ isLoading: false });
        return { success: true, isFirstUser, needsConfirmation: false };
      }

      set({ isLoading: false });
      return { success: true, isFirstUser: false, needsConfirmation: true };
    } catch (e: any) {
      set({ isLoading: false });
      return { success: false, error: e.message || 'Registration failed' };
    }
  },

  // Fix #3: properly typed as Promise<void>
  logout: async () => {
    if (supabaseConfigured) {
      await supabase.auth.signOut();
    }
    set({ user: null, isAuthenticated: false });
    // Fix #4: reset dataLoaded so the next user gets fresh data
    // We import lazily to avoid circular deps — reset via the fileStore directly
    const { useFileStore } = await import('./fileStore');
    useFileStore.getState().resetData();
  },

  updateUser: async (updates) => {
    const cur = get().user;
    if (!cur) return;

    if (supabaseConfigured) {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.avatar !== undefined) updateData.avatar_url = updates.avatar;
      await supabase.from('profiles').update(updateData).eq('id', cur.id);
    }

    const updated = { ...cur, ...updates, updatedAt: new Date() };
    set({
      user: updated,
      users: get().users.map((u) => (u.id === cur.id ? updated : u)),
    });
  },

  // Fix #9: actually calls Supabase to change the password
  changePassword: async (currentPassword: string, newPassword: string) => {
    if (!supabaseConfigured) {
      return { success: false, error: 'Supabase is not configured.' };
    }

    const user = get().user;
    if (!user) return { success: false, error: 'Not authenticated.' };

    try {
      // Re-authenticate to verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        return { success: false, error: 'Current password is incorrect.' };
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Password change failed.' };
    }
  },

  approveUser: async (userId) => {
    if (supabaseConfigured) {
      await supabase.from('profiles').update({
        approved: true,
        approval_status: 'approved',
        updated_at: new Date().toISOString(),
      }).eq('id', userId);
    }
    set({
      users: get().users.map((u) =>
        u.id === userId ? { ...u, approved: true, approvalStatus: 'approved' as ApprovalStatus, updatedAt: new Date() } : u
      ),
    });
  },

  rejectUser: async (userId) => {
    if (supabaseConfigured) {
      await supabase.from('profiles').update({
        approved: false,
        approval_status: 'rejected',
        updated_at: new Date().toISOString(),
      }).eq('id', userId);
    }
    set({
      users: get().users.map((u) =>
        u.id === userId ? { ...u, approved: false, approvalStatus: 'rejected' as ApprovalStatus, updatedAt: new Date() } : u
      ),
    });
  },

  updateUserRole: async (userId, role) => {
    if (supabaseConfigured) {
      await supabase.from('profiles').update({
        role,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);
    }
    set({
      users: get().users.map((u) =>
        u.id === userId ? { ...u, role, updatedAt: new Date() } : u
      ),
    });
  },

  getPendingUsers: () => get().users.filter((u) => u.approvalStatus === 'pending'),
  getAllUsers: () => get().users,
}));
