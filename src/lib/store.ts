// =============================================================================
// Smart Campus ERP - Zustand State Store
// =============================================================================
// Centralized state management for authentication, navigation, and app-wide data.
// Manages the current user, active view/module, sidebar state, and auth status.
// =============================================================================

import { create } from 'zustand';

// User type matching the backend auth/me response
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  avatar: string | null;
  isActive: boolean;
  student?: {
  id: string;
  rollNumber: string;

  semester: number;
  section: string;

  departmentId: string;

  guardianName?: string | null;
  guardianPhone?: string | null;

  admissionYear?: number | null;
  collegeEmail?: string | null;
bio?: string | null;
  department: {
    name: string;
    code: string;
  };
} | null;
 teacher?: {
  id: string;

  employeeId: string;

  departmentId: string;

  specialization: string | null;
  designation: string;

  researchArea?: string | null;
  qualification?: string | null;
  officeRoom?: string | null;
  phoneNumber?: string | null;
  bio?: string | null;

  department: {
    name: string;
    code: string;
  };
} | null;
}

// Available navigation views/modules
export type ViewId =
  | 'dashboard'
  | 'users'
  | 'departments'
  | 'subjects'
  | 'attendance'
  | 'marks'
  | 'fees'
  | 'assignments'
  | 'materials'
  | 'timetable'
  | 'notices'
  | 'leaves'
  | 'analytics'
  | 'academics'
  | 'recommendations'
  | 'profile'
  | 'settings'
  | 'directory'
  | 'public-profile'
  | 'password-reset-requests'
  | 'reset-password';
interface AppState {
  // Auth state
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  sessionToken: string | null; // Bearer token for Authorization header fallback

  // Navigation state
  currentView: ViewId;
  sidebarOpen: boolean;

  // Command palette state
  commandPaletteOpen: boolean;

  // Actions
  login: (user: User, sessionToken?: string) => void;
  logout: () => void;
  setView: (view: ViewId) => void;
  setSidebarOpen: (open: boolean) => void;
  setLoadingAuth: (loading: boolean) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  selectedProfileId: string | null;
setSelectedProfileId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  currentUser: null,
  isAuthenticated: false,
  isLoadingAuth: true,
  sessionToken: typeof window !== 'undefined' ? localStorage.getItem('campus_session_token') : null,
  currentView: 'dashboard',
  selectedProfileId: null,
  sidebarOpen: typeof window !== 'undefined' && window.innerWidth >= 1024,
  commandPaletteOpen: false,

  // Store the authenticated user and session token, mark as authenticated.
  // The sessionToken is stored in localStorage so it persists across page reloads
  // and is available even when httpOnly cookies are blocked (cross-site iframes).
  login: (user: User, sessionToken?: string) => {
    if (sessionToken && typeof window !== 'undefined') {
      localStorage.setItem('campus_session_token', sessionToken);
    }
    set({ currentUser: user, isAuthenticated: true, isLoadingAuth: false, sessionToken: sessionToken || null });
  },

  // Clear user data, session token, and reset navigation
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('campus_session_token');
    }
    set({
      currentUser: null,
      isAuthenticated: false,
      isLoadingAuth: false,
      sessionToken: null,
      currentView: 'dashboard',
    });
  },

  // Switch the active module/view
  setView: (view: ViewId) => set({ currentView: view }),
  setSelectedProfileId: (id) =>
  set({
    selectedProfileId: id
  }),

  // Toggle sidebar visibility (used for mobile)
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

  // Set auth loading state (while checking session)
  setLoadingAuth: (loading: boolean) => set({ isLoadingAuth: loading }),

  // Toggle the command palette (⌘K search dialog)
  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

  // Explicitly set command palette open state
  setCommandPaletteOpen: (open: boolean) => set({ commandPaletteOpen: open }),
}));
