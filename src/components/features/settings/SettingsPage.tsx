// =============================================================================
// Smart Campus ERP - Settings Page Component
// =============================================================================
// Comprehensive settings page organized into tabs: General (appearance/theme),
// Notifications (toggle preferences), and Security (password change, danger zone).
// All visual preferences stored in localStorage with campus-erp- prefix.
// =============================================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  Settings, Sun, Moon, Monitor, Bell, BellOff, Mail, ClipboardCheck,
  FileText, AlertCircle, Lightbulb, User, Shield, KeyRound, Eye, EyeOff,
  Trash2, AlertTriangle, ChevronRight, Type, PanelLeftClose, Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// ---------------------------------------------------------------------------
// localStorage helpers with campus-erp- prefix
// ---------------------------------------------------------------------------

const LS_NOTIFICATIONS = 'campus-erp-notifications';
const LS_SIDEBAR_COMPACT = 'campus-erp-sidebar-compact';
const LS_FONT_SIZE = 'campus-erp-font-size';

interface NotificationPrefs {
  email: boolean;
  attendance: boolean;
  assignments: boolean;
  notices: boolean;
  recommendations: boolean;
}

const defaultNotificationPrefs: NotificationPrefs = {
  email: true,
  attendance: true,
  assignments: true,
  notices: true,
  recommendations: true,
};

function loadNotificationPrefs(): NotificationPrefs {
  if (typeof window === 'undefined') return defaultNotificationPrefs;
  try {
    const raw = localStorage.getItem(LS_NOTIFICATIONS);
    if (raw) return { ...defaultNotificationPrefs, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultNotificationPrefs;
}

function saveNotificationPrefs(prefs: NotificationPrefs) {
  try { localStorage.setItem(LS_NOTIFICATIONS, JSON.stringify(prefs)); } catch { /* ignore */ }
}

function loadSidebarCompact(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(LS_SIDEBAR_COMPACT) === 'true';
}

function saveSidebarCompact(val: boolean) {
  try { localStorage.setItem(LS_SIDEBAR_COMPACT, String(val)); } catch { /* ignore */ }
}

function loadFontSize(): string {
  if (typeof window === 'undefined') return 'medium';
  return localStorage.getItem(LS_FONT_SIZE) || 'medium';
}

function saveFontSize(val: string) {
  try { localStorage.setItem(LS_FONT_SIZE, val); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ---------------------------------------------------------------------------
// SettingsPage Component
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const { currentUser } = useAppStore();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  // ---- General Tab State ----
  const [sidebarCompact, setSidebarCompact] = useState(false);
  const [fontSize, setFontSize] = useState('medium');

  // ---- Notifications Tab State ----
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(defaultNotificationPrefs);

  // ---- Security Tab State ----
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // ---- Load localStorage on mount ----
useEffect(() => {
  setSidebarCompact(loadSidebarCompact());

  const savedSize = loadFontSize();
  setFontSize(savedSize);

  const root = document.documentElement;

  if (savedSize === 'small') {
    root.style.setProperty('--app-font-scale', '0.9');
  } else if (savedSize === 'large') {
    root.style.setProperty('--app-font-scale', '1.1');
  } else {
    root.style.setProperty('--app-font-scale', '1');
  }

  setNotifPrefs(loadNotificationPrefs());
}, []);
  // ---- Handlers ----

  const handleSidebarCompact = useCallback((val: boolean) => {
    setSidebarCompact(val);
    saveSidebarCompact(val);
    window.dispatchEvent(
  new Event('sidebarCompactChanged')
);
    toast({
      title: val ? 'Compact sidebar enabled' : 'Compact sidebar disabled',
      description: 'This preference is saved locally.',
    });
  }, [toast]);

 const handleFontSize = useCallback((val: string) => {
  setFontSize(val);
  saveFontSize(val);

  const root = document.documentElement;

  if (val === 'small') {
    root.style.setProperty('--app-font-scale', '0.9');
  } else if (val === 'large') {
    root.style.setProperty('--app-font-scale', '1.1');
  } else {
    root.style.setProperty('--app-font-scale', '1');
  }

  toast({
    title: 'Font size updated',
    description: `Font size set to ${val}.`,
  });
}, [toast]);

  const handleNotifToggle = useCallback((key: keyof NotificationPrefs, val: boolean) => {
    setNotifPrefs((prev) => {
      const updated = { ...prev, [key]: val };
      saveNotificationPrefs(updated);
      return updated;
    });
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: 'Error', description: 'Please fill all password fields', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'New password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'New passwords do not match', variant: 'destructive' });
      return;
    }

    setChangingPassword(true);
    try {
      await api.put(`/users/${currentUser.id}/password`, {
        currentPassword,
        newPassword,
      });
      toast({ title: 'Success', description: 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast({
        title: 'Error',
        description: axiosErr.response?.data?.message || 'Failed to change password',
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const navigateToProfile = () => {
    useAppStore.getState().setView('profile');
  };

  // ---- Theme button helper ----
  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const;

  if (!currentUser) {
    return null;
  }

  return (
    <motion.div
  variants={containerVariants}
  initial="hidden"
  animate="show"
  className="max-w-5xl mx-auto space-y-6"
>
      {/* Page Title */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <Settings className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-sm text-muted-foreground">Manage your preferences and account security</p>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <motion.div variants={itemVariants}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="general" className="gap-2">
              <Settings className="w-4 h-4 hidden sm:block" />
              General
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4 hidden sm:block" />
              Security
            </TabsTrigger>
          </TabsList>
        </motion.div>

        {/* ================================================================= */}
        {/* GENERAL TAB                                                       */}
        {/* ================================================================= */}
        <TabsContent value="general" className="space-y-4">
          {/* Appearance Card */}
          <motion.div variants={itemVariants}>
            <Card className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sun className="w-5 h-5 text-amber-500" />
                  Appearance
                </CardTitle>
                <CardDescription>Customize how the application looks and feels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme toggle */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Theme</Label>
                  <div className="grid grid-cols-3 gap-3 max-w-sm">
                    {themeOptions.map((opt) => {
                      const Icon = opt.icon;
                      const isActive = theme === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setTheme(opt.value)}
                          className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200 hover:border-emerald-300 dark:hover:border-emerald-700 ${
                            isActive
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-sm'
                              : 'border-border bg-card'
                          }`}
                        >
                          <Icon className={`w-6 h-6 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
                          <span className={`text-xs font-medium ${isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}`}>
                            {opt.label}
                          </span>
                          {isActive && (
                            <motion.div
                              layoutId="theme-check"
                              className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"
                              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                            >
                              <Check className="w-3 h-3 text-white" />
                            </motion.div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* Compact sidebar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                      <PanelLeftClose className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Compact Sidebar</Label>
                      <p className="text-xs text-muted-foreground">Use a narrower sidebar with icons only</p>
                    </div>
                  </div>
                  <Switch
                    checked={sidebarCompact}
                    onCheckedChange={handleSidebarCompact}
                  />
                </div>

                <Separator />

                {/* Font size */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                      <Type className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Font Size</Label>
                      <p className="text-xs text-muted-foreground">Adjust the base text size</p>
                    </div>
                  </div>
                  <Select value={fontSize} onValueChange={handleFontSize}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ================================================================= */}
        {/* SECURITY TAB                                                      */}
        {/* ================================================================= */}
        <TabsContent value="security" className="space-y-4">
          {/* Account Info Card */}
          <motion.div variants={itemVariants}>
            <Card className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-500" />
                  Account Information
                </CardTitle>
                <CardDescription>Your account details (read-only)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Name</Label>
                    <p className="text-sm font-medium">{currentUser.name}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
                    <p className="text-sm font-medium">{currentUser.email}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Role</Label>
                    <Badge
                      variant="outline"
                      className="capitalize mt-0.5 bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
                    >
                      {currentUser.role}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <Button
                  variant="outline"
                  className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                  onClick={navigateToProfile}
                >
                  <User className="w-4 h-4" />
                  Go to Profile
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Change Password Card */}
          <motion.div variants={itemVariants}>
            <Card className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-500" />
                  Change Password
                </CardTitle>
                <CardDescription>Update your password to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="settings-current-password">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="settings-current-password"
                        type={showCurrent ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowCurrent(!showCurrent)}
                      >
                        {showCurrent ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="settings-new-password">New Password</Label>
                      <div className="relative">
                        <Input
                          id="settings-new-password"
                          type={showNew ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          required
                          minLength={6}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowNew(!showNew)}
                        >
                          {showNew ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="settings-confirm-password">Confirm New Password</Label>
                      <Input
                        id="settings-confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Passwords do not match
                    </p>
                  )}
                  <Button type="submit" disabled={changingPassword} className="bg-emerald-700 hover:bg-emerald-800">
                    <KeyRound className="w-4 h-4 mr-2" />
                    {changingPassword ? 'Changing Password...' : 'Change Password'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Danger Zone Card */}
          <motion.div variants={itemVariants}>
            <Card className="border-red-300 dark:border-red-800 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-red-500 to-rose-500" />
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription className="text-red-500/80 dark:text-red-400/80">
                  Irreversible and destructive actions
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <div>
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">Delete Account</p>
                    <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={0}>
                          <Button variant="destructive" disabled className="gap-2 shrink-0">
                            <Trash2 className="w-4 h-4" />
                            Delete Account
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Contact administrator to delete your account</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// NotificationRow sub-component
// ---------------------------------------------------------------------------

interface NotificationRowProps {
  icon: React.ReactNode;
  bgColor: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (val: boolean) => void;
}

function NotificationRow({ icon, bgColor, title, description, checked, onCheckedChange }: NotificationRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg ${bgColor} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
