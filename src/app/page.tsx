// =============================================================================
// Smart Campus ERP - Main Application Page (Single Page Architecture)
// =============================================================================
// This is the ONLY page of the application. It renders either:
// - Login page (if not authenticated)
// - Dashboard layout with sidebar + header + content area (if authenticated)
//
// All navigation is client-side using the Zustand store's currentView state.
// No actual route changes occur — everything is rendered within this single page.
// =============================================================================

'use client';

import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore, type ViewId } from '@/lib/store';
import api from '@/lib/api';
import AcademicsPage from '@/components/features/academics/AcademicsPage';
import FeesPage from '@/components/features/dashboard/fees/page';
// Layout components
import AppSidebar from '@/components/layout/AppSidebar';
import AppHeader from '@/components/layout/AppHeader';

// Auth
import LoginPage from '@/components/features/auth/LoginPage';

// Dashboards
import AdminDashboard from '@/components/features/dashboard/AdminDashboard';
import TeacherDashboard from '@/components/features/dashboard/TeacherDashboard';
import StudentDashboard from '@/components/features/dashboard/StudentDashboard';

// Feature modules
import AttendanceManager from '@/components/features/attendance/AttendanceManager';
import MarksManager from '@/components/features/marks/MarksManager';
import AssignmentManager from '@/components/features/assignments/AssignmentManager';
import MaterialManager from '@/components/features/materials/MaterialManager';
import TimetableManager from '@/components/features/timetable/TimetableManager';
import NoticeManager from '@/components/features/notices/NoticeManager';
import LeaveManager from '@/components/features/leaves/LeaveManager';
import AnalyticsManager from '@/components/features/analytics/AnalyticsManager';
import RecommendationManager from '@/components/features/recommendations/RecommendationManager';

// Admin modules
import UserManager from '@/components/features/admin/UserManager';
import DepartmentManager from '@/components/features/admin/DepartmentManager';
import SubjectManager from '@/components/features/admin/SubjectManager';

// Profile
import ProfilePage from '@/components/features/profile/ProfilePage';
import DirectoryPage from
'@/components/features/directory/DirectoryPage';

import PublicProfilePage from
'@/components/features/directory/PublicProfilePage';

// Settings
import SettingsPage from '@/components/features/settings/SettingsPage';
import PasswordResetRequests from '@/components/features/auth/PasswordResetRequests';
import ResetPasswordPage from '@/components/features/auth/ResetPasswordPage';
// Shared components
import CommandPalette from '@/components/shared/CommandPalette';

// Page transition animation variant
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

/**
 * Renders the correct content component based on the current view ID.
 * Each module has its own dedicated component file.
 */
function renderView(view: ViewId, role: string) {
  switch (view) {
    case 'dashboard':
      if (role === 'admin') return <AdminDashboard />;
      if (role === 'teacher') return <TeacherDashboard />;
      return <StudentDashboard />;
    case 'attendance': return <AttendanceManager />;
    case 'marks': return <MarksManager />;
    case 'fees': return <FeesPage />;
    case 'assignments': return <AssignmentManager />;
    case 'materials': return <MaterialManager />;
    case 'timetable': return <TimetableManager />;
    case 'notices': return <NoticeManager />;
    case 'leaves': return <LeaveManager />;
    case 'analytics': return <AnalyticsManager />;
    case 'academics':return <AcademicsPage />;
    case 'recommendations': return <RecommendationManager />;
    case 'users': return <UserManager />;
    case 'departments': return <DepartmentManager />;
    case 'subjects': return <SubjectManager />;
    case 'directory':
  return <DirectoryPage />;

case 'public-profile':
  return <PublicProfilePage />;
    case 'profile': return <ProfilePage />;
    case 'settings':
  return <SettingsPage />;

case 'password-reset-requests':
  return <PasswordResetRequests />;

case 'reset-password':
  return <ResetPasswordPage />;

default:
  return <AdminDashboard />;
}
}

// View title mapping for the header
const viewTitles: Record<ViewId, string> = {
  dashboard: 'Dashboard',
  users: 'User Management',
  departments: 'Department Management',
  subjects: 'Subject Management',
  attendance: 'Attendance',
  marks: 'Marks',
  fees: 'Fees',
  assignments: 'Assignments',
  materials: 'Study Materials',
  timetable: 'Timetable',
  notices: 'Notices',
  leaves: 'Leave Management',
  analytics: 'Analytics',
  academics: 'Academics',
  recommendations: 'Recommendations',
  profile: 'Profile',
  settings: 'Settings',
  directory: 'Directory',
  'public-profile': 'Profile',
  'password-reset-requests': 'Forgot Password Logs',
  'reset-password': 'Reset Password',
};

export default function Home() {
  const { isAuthenticated, isLoadingAuth, currentUser, currentView, login, logout, setLoadingAuth } = useAppStore();

  // Check existing session on mount
  // The sessionToken from localStorage is already loaded into the Zustand store
  // and attached to API requests via the Authorization header interceptor.
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await api.get('/auth/me');
        // On session restore, we don't get a new sessionToken from /auth/me,
        // but the existing token from localStorage is already in the store.
        login(res.data.data);
      } catch {
        // No valid session, user needs to login
        logout();
      }
    };
    checkSession();
  }, [login, logout]);

  // Loading screen while checking session
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-primary rounded-2xl flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5" />
            </svg>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Smart Campus ERP</h2>
          <p className="text-sm text-muted-foreground mt-1">Loading...</p>
        </motion.div>
      </div>
    );
  }

  // Not authenticated: show login page
  if (!isAuthenticated || !currentUser) {
    return <LoginPage />;
  }

  // Command palette is rendered globally so it works from any state
  const commandPalette = <CommandPalette />;

  // Authenticated: show dashboard layout
  const role = currentUser.role;

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Command Palette - global overlay */}
      {commandPalette}

      {/* Sidebar Navigation */}
      <AppSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Sticky Header */}
        <AppHeader />

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto h-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Page Title */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                {/* Breadcrumb-like heading */}
                {currentView !== 'dashboard' && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground">Home / {viewTitles[currentView]}</p>
                  </div>
                )}

                {/* Render the active module */}
                {renderView(currentView, role)}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sticky Footer */}
          <footer className="mt-auto border-t bg-card py-4 px-6">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
              <p>Smart Campus ERP &copy; {new Date().getFullYear()} &middot; Academic Management Platform</p>
              <p>Built with Next.js, TypeScript &amp; shadcn/ui</p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
