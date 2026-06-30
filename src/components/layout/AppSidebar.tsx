// =============================================================================
// Smart Campus ERP - Application Sidebar Navigation (Enhanced)
// =============================================================================
// Polished sidebar with: gradient line separators, hover tooltips when collapsed,
// user status indicator (green dot), smooth expand/collapse, active item left
// border accent + subtle background gradient, section dividers, unread badges.
// =============================================================================

'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Building2,
  BookOpen,
  ClipboardCheck,
  FileText,
  FileUp,
  FolderOpen,
  Calendar,
  Bell,
  Plane,
  BarChart3,
  Lightbulb,
  GraduationCap,
  BookMarked,
  X,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppStore, type ViewId } from '@/lib/store';
import api from '@/lib/api';

// Navigation item definition
interface NavItem {
  id: ViewId;
  label: string;
  icon: React.ElementType;
  roles: ('admin' | 'teacher' | 'student')[];
  section?: string;
  badgeCount?: number;
}

// Section labels for grouping
const sections: Record<string, string> = {
  main: 'Overview',
  management: 'Management',
  academic: 'Academic',
  communication: 'Communication',
  insights: 'Insights',
  account: 'Account',
};

// All available navigation items with sections
const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'teacher', 'student'], section: 'main' },
  // Management section (admin)
  { id: 'users', label: 'User Management', icon: Users, roles: ['admin'], section: 'management' },
  { id: 'departments', label: 'Departments', icon: Building2, roles: ['admin'], section: 'management' },
  { id: 'subjects', label: 'Subjects', icon: BookOpen, roles: ['admin'], section: 'management' },
  // Academic section
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck, roles: ['admin', 'teacher', 'student'], section: 'academic' },
  { id: 'marks', label: 'Marks', icon: FileText, roles: ['admin', 'teacher', 'student'], section: 'academic' },
  {
  id: 'fees',
  label: 'Fees',
  icon: FileText,
  roles: ['admin', 'student'],
  section: 'academic'
},
  { id: 'assignments', label: 'Assignments', icon: FileUp, roles: ['admin', 'teacher', 'student'], section: 'academic' },
  { id: 'materials', label: 'Study Materials', icon: FolderOpen, roles: ['admin', 'teacher', 'student'], section: 'academic' },
  {
  id: 'academics',
  label: 'Academics',
  icon: BookMarked,
  roles: ['admin', 'teacher', 'student'],
  section: 'academic'
},
  { id: 'timetable', label: 'Timetable', icon: Calendar, roles: ['admin', 'teacher', 'student'], section: 'academic' },
  // Communication section
  { id: 'notices', label: 'Notices', icon: Bell, roles: ['admin', 'teacher', 'student'], section: 'communication' },
  { id: 'leaves', label: 'Leave Management', icon: Plane, roles: ['admin', 'teacher', 'student'], section: 'communication' },
  // Insights section
  { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['admin', 'teacher', 'student'], section: 'insights' },
  { id: 'recommendations', label: 'AI Study Assistant', icon: Lightbulb, roles: ['student'], section: 'insights' },
  // Account section
  {
  id: 'directory',
  label: 'Directory',
  icon: Users,
  roles: ['admin', 'teacher', 'student'],
  section: 'account'
},
  { id: 'profile', label: 'Profile', icon: UserCircle, roles: ['admin', 'teacher', 'student'], section: 'account' },
  { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin', 'teacher', 'student'], section: 'account' },
];

export default function AppSidebar() {
  const { currentUser, currentView, setView, sidebarOpen, setSidebarOpen } = useAppStore();
  const role = currentUser?.role || 'student';
  const [collapsed, setCollapsed] = useState(() => {
  if (typeof window === 'undefined') return false;

  return localStorage.getItem('campus-erp-sidebar-compact') === 'true';
});
  const [noticeCount, setNoticeCount] = useState(0);
  const [recommendationCount, setRecommendationCount] = useState(0);

  // Fetch unread counts
 useEffect(() => {
  const loadCounts = () => {
    if (currentUser) {
      api.get('/notices')
        .then((res) => {
          const notices = res.data.data || [];

          const unread = notices.filter(
            (n: any) => !n.isRead
          ).length;

          setNoticeCount(unread);
        })
        .catch(() => {});

      if (role === 'student') {
        api.get('/recommendations?isRead=false')
          .then((res) => setRecommendationCount((res.data.data || []).length))
          .catch(() => {});
      }
    }
  };

  loadCounts();

  window.addEventListener('noticesUpdated', loadCounts);

  return () => {
    window.removeEventListener('noticesUpdated', loadCounts);
  };
}, [currentUser, role]);
useEffect(() => {
  const syncSidebar = () => {
    setCollapsed(
      localStorage.getItem(
        'campus-erp-sidebar-compact'
      ) === 'true'
    );
  };

  window.addEventListener(
    'sidebarCompactChanged',
    syncSidebar
  );

  return () => {
    window.removeEventListener(
      'sidebarCompactChanged',
      syncSidebar
    );
  };
}, []);

  // Filter navigation items based on user role
  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  // Apply badge counts
  const itemsWithBadges = visibleItems.map((item) => {
    if (item.id === 'notices') return { ...item, badgeCount: noticeCount };
    if (item.id === 'recommendations') return { ...item, badgeCount: recommendationCount };
    return item;
  });

  // Group items by section
  const groupedItems = itemsWithBadges.reduce<Record<string, NavItem[]>>((acc, item) => {
    const section = item.section || 'main';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {});

  const sidebarWidth = collapsed ? 72 : 280;

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: sidebarOpen ? 0 : -280,
          width: collapsed && sidebarOpen ? 72 : 280,
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`fixed top-0 left-0 z-50 h-screen bg-[var(--sidebar)] text-[var(--sidebar-foreground)] flex flex-col shadow-xl lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'lg:translate-x-0' : 'lg:-translate-x-[280px]'
        }`}
        style={{ width: sidebarWidth }}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 py-4 min-h-[64px]">
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 overflow-hidden"
              >
                <div className="w-9 h-9 bg-[var(--sidebar-primary)] rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                  <GraduationCap className="w-5 h-5 text-[var(--sidebar-primary-foreground)]" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-sm tracking-tight truncate">Smart Campus</h2>
                  <p className="text-xs text-[var(--sidebar-foreground)]/60 truncate">ERP Platform</p>
                </div>
              </motion.div>
            )}
            {collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-9 h-9 bg-[var(--sidebar-primary)] rounded-lg flex items-center justify-center mx-auto shadow-sm"
              >
                <GraduationCap className="w-5 h-5 text-[var(--sidebar-primary-foreground)]" />
              </motion.div>
            )}
          </AnimatePresence>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-[var(--sidebar-foreground)]/60 hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] shrink-0"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Gradient separator after header */}
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--sidebar-border)] to-transparent" />

        {/* Navigation Items */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto custom-scrollbar space-y-1">
          {Object.entries(groupedItems).map(([sectionKey, items], sectionIdx) => (
            <div key={sectionKey}>
              {/* Section divider with gradient line */}
              {sectionIdx > 0 && (
                <div className="px-3 pt-3 pb-1">
                  {!collapsed && (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-px flex-1 bg-gradient-to-r from-[var(--sidebar-primary)]/40 to-transparent" />
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--sidebar-foreground)]/40 shrink-0">
                          {sections[sectionKey] || sectionKey}
                        </p>
                        <div className="h-px flex-1 bg-gradient-to-l from-[var(--sidebar-primary)]/40 to-transparent" />
                      </div>
                    </>
                  )}
                  {collapsed && (
                    <div className="h-px bg-gradient-to-r from-transparent via-[var(--sidebar-primary)]/30 to-transparent my-2" />
                  )}
                </div>
              )}
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;

                const navButton = (
                  <motion.button
                    key={item.id}
                    onClick={() => {
                      setView(item.id);
                      setSidebarOpen(false);
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                      isActive
                        ? 'bg-gradient-to-r from-[var(--sidebar-primary)]/15 to-[var(--sidebar-primary)]/5 text-[var(--sidebar-primary)] shadow-sm'
                        : 'text-[var(--sidebar-foreground)]/70 hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]'
                    }`}
                  >
                    {/* Active left border accent */}
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active-bar"
                        className="absolute left-0 top-1 bottom-1 w-[3px] bg-[var(--sidebar-primary)] rounded-r-full"
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}
                    <Icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-[var(--sidebar-primary)]' : ''}`} />
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                    {/* Badge for unread count */}
                    {item.badgeCount !== undefined && item.badgeCount > 0 && (
                      collapsed ? (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-destructive text-destructive-foreground rounded-full text-[9px] font-bold flex items-center justify-center px-1">
                          {item.badgeCount > 99 ? '99+' : item.badgeCount}
                        </span>
                      ) : (
                        <Badge className="ml-auto bg-destructive text-destructive-foreground text-[10px] h-5 min-w-[20px] px-1.5 flex items-center justify-center">
                          {item.badgeCount > 99 ? '99+' : item.badgeCount}
                        </Badge>
                      )
                    )}
                  </motion.button>
                );

                // When collapsed, wrap in tooltip
                if (collapsed) {
                  return (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        {navButton}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        {item.label}
                        {item.badgeCount !== undefined && item.badgeCount > 0 && (
                          <Badge className="ml-1.5 bg-destructive text-destructive-foreground text-[10px] h-4 px-1">
                            {item.badgeCount > 99 ? '99+' : item.badgeCount}
                          </Badge>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return navButton;
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="px-3 py-3 border-t border-[var(--sidebar-border)] space-y-2">
          {/* User info with status indicator */}
          {!collapsed && (
            <div className="flex items-center gap-3 px-1">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-[var(--sidebar-accent)] flex items-center justify-center text-sm font-bold text-[var(--sidebar-accent-foreground)] shrink-0 ring-2 ring-[var(--sidebar-primary)]/20">
                  {currentUser?.name?.charAt(0) || 'U'}
                </div>
              </div>
            </div>
          )}
          {collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative w-9 h-9 mx-auto">
                  <div className="w-9 h-9 rounded-full bg-[var(--sidebar-accent)] flex items-center justify-center text-sm font-bold text-[var(--sidebar-accent-foreground)] ring-2 ring-[var(--sidebar-primary)]/20">
                    {currentUser?.name?.charAt(0) || 'U'}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[var(--sidebar)] rounded-full" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {currentUser?.name} · {role}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Collapse toggle (desktop only) */}
          <Button
            variant="ghost"
            size="sm"
            className="hidden lg:flex w-full text-[var(--sidebar-foreground)]/60 hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] gap-2 justify-center"
            onClick={() => {
  const newValue = !collapsed;

  setCollapsed(newValue);

  localStorage.setItem(
    'campus-erp-sidebar-compact',
    String(newValue)
  );
}}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-xs">Collapse</span>
              </>
            )}
          </Button>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}
