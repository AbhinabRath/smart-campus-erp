// =============================================================================
// Smart Campus ERP - Application Header Bar (Enhanced)
// =============================================================================
// Top header bar with: animated notification bell with shake, premium breadcrumb
// with chevron separators, command palette search (⌘K) with dialog, dark mode
// toggle, user avatar with ring effect, role badge in dropdown.
// =============================================================================

'use client';
import { BACKEND_URL } from "@/lib/config";
import React, {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { useTheme } from 'next-themes';
import {
  Menu, LogOut, Bell, Search, Sun, Moon,
  User, Settings, ChevronRight, Home,
  Command,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';

import { useAppStore, type ViewId } from '@/lib/store';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

// View title mapping
const viewTitles: Record<ViewId, string> = {
  dashboard: 'Dashboard',
  users: 'User Management',
  departments: 'Department Management',
  subjects: 'Subject Management',
  attendance: 'Attendance',
  marks: 'Marks',
  assignments: 'Assignments',
  materials: 'Study Materials',
  timetable: 'Timetable',
  notices: 'Notices',
  leaves: 'Leave Management',
  analytics: 'Analytics',
  recommendations: 'AI Study Assistant',
  profile: 'Profile',
  settings: 'Settings',
  fees: "Fees",
academics: "Academics",
directory: "Directory",
"public-profile": "Public Profile",
'password-reset-requests': 'Password Reset Requests',
'reset-password': 'Reset Password',
};

interface NoticeItem {
  id: string;
  title: string;
  priority: string;
  createdAt: string;
  isRead: boolean;
}

export default function AppHeader() {
  const { currentUser, setSidebarOpen, logout, sidebarOpen, currentView, toggleCommandPalette } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  // Search dialog is now managed by the global CommandPalette component
  // via commandPaletteOpen / toggleCommandPalette in the Zustand store.

  // Use useSyncExternalStore to detect hydration safely for theme toggle
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Searchable modules are now handled by the CommandPalette component.
  // Keeping a minimal version here for the notification popover only.

  // Fetch notices for notification count
 useEffect(() => {
  const loadNotices = () => {
    if (currentUser) {
      api.get('/notices?limit=5')
        .then((res) => setNotices(res.data.data || []))
        .catch(() => {});
    }
  };

  loadNotices();

  window.addEventListener('noticesUpdated', loadNotices);

  return () => {
    window.removeEventListener('noticesUpdated', loadNotices);
  };
}, [currentUser]);

  // ⌘K / Ctrl+K keyboard shortcut is now handled globally by the CommandPalette component.

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout errors
    }
    logout();
  };

  const navigateTo = (viewId: ViewId) => {
    useAppStore.getState().setView(viewId);
  };

  const roleColorMap: Record<string, string> = {
    admin: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    teacher: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    student: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800',
  };

  const unreadCount = useMemo(
  () => notices.filter((n) => !n.isRead).length,
  [notices]
);

const hasUnread = unreadCount > 0;

  return (
    <header className="h-16 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm">
      {/* Left: Menu toggle + Premium Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 hover:bg-emerald-500/10"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Premium Breadcrumb with animated separators */}
        <nav className="hidden sm:flex items-center gap-1 text-sm min-w-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            onClick={() => navigateTo('dashboard')}
          >
            <Home className="w-3.5 h-3.5 mr-1" />
            Home
          </Button>
          {currentView !== 'dashboard' && (
            <>
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
              </motion.span>
              <motion.span
                key={currentView}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.05 }}
                className="text-foreground font-medium truncate"
              >
                {viewTitles[currentView]}
              </motion.span>
            </>
          )}
        </nav>
      </div>

      {/* Center: Search trigger button (command palette style) */}
      <div className="hidden md:flex items-center flex-1 mx-4 max-w-sm">
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground h-9 bg-muted/30 hover:bg-muted/50 border-dashed"
          onClick={() => toggleCommandPalette()}
        >
          <Search className="w-4 h-4 mr-2" />
          <span className="text-sm">Search modules...</span>
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </Button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Dark mode toggle */}
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 hover:bg-emerald-500/10"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <AnimatePresence mode="wait">
              {theme === 'dark' ? (
                <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Sun className="w-4 h-4" />
                </motion.div>
              ) : (
                <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Moon className="w-4 h-4" />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        )}

        {/* Notification bell with animated shake when unread */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9 hover:bg-emerald-500/10">
              <motion.div
                animate={hasUnread ? {
                  rotate: [0, -10, 10, -10, 10, 0],
                } : {}}
                transition={{
                  duration: 0.5,
                  repeat: hasUnread ? Infinity : 0,
                  repeatDelay: 3,
                }}
              >
                <Bell className="w-4 h-4" />
              </motion.div>
              {hasUnread && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center px-1 shadow-sm"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 shadow-lg" align="end">
            <div className="p-3 border-b bg-muted/20">
              <h4 className="font-semibold text-sm">Notifications</h4>
              <p className="text-xs text-muted-foreground">{unreadCount} unread notices</p>
            </div>
            <div className="max-h-72 overflow-y-auto custom-scrollbar">
              {notices.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">No notifications</p>
              ) : (
                notices.map((notice) => (
                  <div key={notice.id} className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors border-b last:border-0 cursor-pointer"
                    onClick={() => navigateTo('notices')}
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{notice.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(notice.createdAt), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <Badge
                      variant={notice.priority === 'urgent' ? 'destructive' : 'secondary'}
                      className="text-[10px] shrink-0"
                    >
                      {notice.priority}
                    </Badge>
                  </div>
                ))
              )}
            </div>
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs hover:text-emerald-600"
                onClick={() => navigateTo('notices')}
              >
                View All Notices
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* User dropdown with avatar ring */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2 hover:bg-emerald-500/10">
              <Avatar className="h-7 w-7 ring-2 ring-emerald-500/30 ring-offset-1 ring-offset-background">

  {(currentUser?.avatar) ? (
    <AvatarImage
      src={
        currentUser.avatar.startsWith('/uploads')
          ? `${BACKEND_URL}${currentUser.avatar}`
          : currentUser.avatar
      }
      alt={currentUser.name}
    />
  ) : null}

  <AvatarFallback className="text-xs bg-emerald-600 text-white">
    {currentUser?.name?.charAt(0)}
  </AvatarFallback>

</Avatar>
              <span className="hidden sm:inline text-sm font-medium max-w-[100px] truncate">
                {currentUser?.name}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 shadow-lg" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{currentUser?.name}</p>
                <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
                <Badge
                  variant="outline"
                  className={`text-[10px] w-fit capitalize ${roleColorMap[currentUser?.role || 'student']}`}
                >
                  {currentUser?.role}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigateTo('profile')} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigateTo('settings')} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} variant="destructive" className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Command Palette is now rendered globally in page.tsx via CommandPalette component */}
    </header>
  );
}
