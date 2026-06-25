// =============================================================================
// Smart Campus ERP - Command Palette (⌘K Search Dialog)
// =============================================================================
// Global search dialog activated by ⌘K / Ctrl+K or clicking the search button
// in the header. Supports fuzzy search, arrow-key navigation, recently visited
// views, and role-based navigation filtering.
// =============================================================================

'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Dialog, DialogContent, DialogTitle
} from '@/components/ui/dialog';
import { useAppStore, type ViewId } from '@/lib/store';
import {
  Search, LayoutDashboard, Users, Building2, BookOpen,
  ClipboardCheck, FileText, FileUp, FolderOpen, Calendar,
  Bell, Plane, BarChart3, Lightbulb, UserCircle, Settings,
  ArrowRight, Clock, ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';

// Navigation items matching sidebar
interface NavItem {
  id: ViewId;
  label: string;
  icon: React.ElementType;
  keywords: string[];
  roles: ('admin' | 'teacher' | 'student')[];
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, keywords: ['home', 'overview', 'main'], roles: ['admin', 'teacher', 'student'] },
  { id: 'users', label: 'User Management', icon: Users, keywords: ['people', 'accounts', 'students', 'teachers'], roles: ['admin'] },
  { id: 'departments', label: 'Departments', icon: Building2, keywords: ['branches', 'divisions'], roles: ['admin'] },
  { id: 'subjects', label: 'Subjects', icon: BookOpen, keywords: ['courses', 'classes', 'curriculum'], roles: ['admin'] },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck, keywords: ['qr', 'presence', 'check-in'], roles: ['admin', 'teacher', 'student'] },
  {
  id: 'fees',
  label: 'Fees',
  icon: FileText,
  keywords: [
    'fee',
    'payment',
    'finance',
    'tuition'
  ],
  roles: [
    'admin',
    'student'
  ]
},
  { id: 'marks', label: 'Marks', icon: FileText, keywords: ['grades', 'scores', 'results', 'exams'], roles: ['admin', 'teacher', 'student'] },
  { id: 'assignments', label: 'Assignments', icon: FileUp, keywords: ['homework', 'tasks', 'submissions'], roles: ['admin', 'teacher', 'student'] },
  { id: 'materials', label: 'Study Materials', icon: FolderOpen, keywords: ['resources', 'documents', 'files', 'notes'], roles: ['admin', 'teacher', 'student'] },
  { id: 'timetable', label: 'Timetable', icon: Calendar, keywords: ['schedule', 'routine', 'classes'], roles: ['admin', 'teacher', 'student'] },
  { id: 'notices', label: 'Notices', icon: Bell, keywords: ['announcements', 'alerts', 'news'], roles: ['admin', 'teacher', 'student'] },
  { id: 'leaves', label: 'Leave Management', icon: Plane, keywords: ['absence', 'time-off', 'vacation', 'sick'], roles: ['admin', 'teacher', 'student'] },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, keywords: ['insights', 'reports', 'data', 'charts'], roles: ['admin', 'teacher', 'student'] },
  {
  id: 'academics',
  label: 'Academics',
  icon: BookOpen,
  keywords: [
    'academic',
    'cgpa',
    'semester',
    'performance'
  ],
  roles: [
    'admin',
    'teacher',
    'student'
  ]
},
  { id: 'recommendations', label: 'Recommendations', icon: Lightbulb, keywords: ['suggestions', 'tips', 'ai'], roles: ['student'] },
  {
  id: 'directory',
  label: 'Directory',
  icon: Users,
  keywords: ['people', 'teacher', 'student', 'search'],
  roles: ['admin', 'teacher', 'student']
},
  { id: 'profile', label: 'Profile', icon: UserCircle, keywords: ['account', 'personal'], roles: ['admin', 'teacher', 'student'] },
  { id: 'settings', label: 'Settings', icon: Settings, keywords: ['preferences', 'config', 'theme'], roles: ['admin', 'teacher', 'student'] },
  
];

const STORAGE_KEY = 'campus-erp-recent-views';
const MAX_RECENT = 5;

function getRecentViews(): ViewId[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addRecentView(viewId: ViewId) {
  if (typeof window === 'undefined') return;
  try {
    const recent = getRecentViews().filter((v) => v !== viewId);
    recent.unshift(viewId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // Ignore storage errors
  }
}

// Fuzzy score: higher is better match
function fuzzyScore(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.toLowerCase();

  // Exact substring match gets highest score
  const idx = t.indexOf(q);
  if (idx === 0) return 100;
  if (idx > 0) return 80;

  // Fuzzy match scoring
  let score = 0;
  let ti = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const char = q[qi];
    const found = t.indexOf(char, ti);
    if (found === -1) return -1;
    // Consecutive characters get bonus
    if (found === ti) score += 10;
    score += 5;
    ti = found + 1;
  }
  return score;
}

export default function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, currentUser, currentView, setView } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const role = currentUser?.role || 'student';

  // Compute recent views from localStorage during render (no setState needed)
  const recentViews = useMemo(() => getRecentViews(), [commandPaletteOpen, currentView]);

  // Reset search and highlight when palette opens
  const handleClose = useCallback((open: boolean) => {
    if (!open) {
      // Palette is closing
      setSearchQuery('');
      setHighlightedIndex(0);
    }
    setCommandPaletteOpen(open);
  }, [setCommandPaletteOpen]);

  // Focus input when palette opens
  useEffect(() => {
    if (commandPaletteOpen) {
      // Small delay to let Dialog animation settle
      const timer = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [commandPaletteOpen]);

  // Track view changes and save to recent
  useEffect(() => {
    if (currentView && currentView !== 'dashboard') {
      addRecentView(currentView);
    }
  }, [currentView]);

  // Filter navigation items based on role
  const visibleNavItems = useMemo(
    () => navItems.filter((item) => item.roles.includes(role as 'admin' | 'teacher' | 'student')),
    [role]
  );

  // Build recent items
  const recentItems = useMemo(() => {
    return recentViews
      .filter((v) => visibleNavItems.some((n) => n.id === v))
      .map((v) => visibleNavItems.find((n) => n.id === v)!)
      .filter(Boolean);
  }, [recentViews, visibleNavItems]);

  // Filtered results with fuzzy search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return visibleNavItems;
    const q = searchQuery.trim();

    return visibleNavItems
      .map((item) => {
        const labelScore = fuzzyScore(item.label, q);
        const keywordScore = Math.max(
          ...item.keywords.map((kw) => fuzzyScore(kw, q))
        );
        const bestScore = Math.max(labelScore, keywordScore);
        return { ...item, score: bestScore };
      })
      .filter((item) => (item as NavItem & { score: number }).score > 0)
      .sort((a, b) => (b as NavItem & { score: number }).score - (a as NavItem & { score: number }).score)
      .map(({ score, ...item }) => item as NavItem);
  }, [searchQuery, visibleNavItems]);

  // Grouped items for display
  const groupedItems = useMemo(() => {
    const groups: { heading: string; items: NavItem[] }[] = [];

    if (!searchQuery.trim() && recentItems.length > 0) {
      groups.push({ heading: 'Recent', items: recentItems });
    }

    groups.push({ heading: searchQuery.trim() ? 'Search Results' : 'Navigation', items: filteredItems });

    return groups;
  }, [searchQuery, filteredItems, recentItems]);

  // Total flat items for keyboard navigation
  const allItems = useMemo(
    () => groupedItems.flatMap((g) => g.items),
    [groupedItems]
  );

  // Handle search input change - reset highlight when typing
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setHighlightedIndex(0);
  }, []);

  const handleSelect = useCallback(
    (item: NavItem) => {
      setView(item.id);
      setCommandPaletteOpen(false);
      setSearchQuery('');
      addRecentView(item.id);
    },
    [setView, setCommandPaletteOpen]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % Math.max(allItems.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + allItems.length) % Math.max(allItems.length, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (allItems[highlightedIndex]) {
          handleSelect(allItems[highlightedIndex]);
        }
      }
    },
    [allItems, highlightedIndex, handleSelect]
  );

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current) {
      const highlighted = listRef.current.querySelector('[data-highlighted="true"]');
      if (highlighted) {
        highlighted.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!useAppStore.getState().commandPaletteOpen);
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [setCommandPaletteOpen]);

  return (
    <Dialog open={commandPaletteOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 shadow-2xl overflow-hidden">

  <DialogTitle className="sr-only">
    Command Palette - Search and Navigate
  </DialogTitle>

        {/* Search Input */}
        <div className="flex items-center border-b px-3 h-12">
          <Search className="w-4 h-4 shrink-0 text-muted-foreground mr-2" />
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            placeholder="Search modules, pages..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground shrink-0 ml-2">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto custom-scrollbar py-1">
          {allItems.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No results found for &ldquo;{searchQuery}&rdquo;</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Try a different search term</p>
            </div>
          ) : (
            groupedItems.map((group) => (
              <div key={group.heading}>
                {/* Group heading */}
                <div className="px-3 py-1.5 flex items-center gap-2">
                  {group.heading === 'Recent' && (
                    <Clock className="w-3 h-3 text-muted-foreground/60" />
                  )}
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {group.heading}
                  </span>
                </div>

                {/* Group items */}
                {group.items.map((item) => {
                  const globalIndex = allItems.indexOf(item);
                  const isHighlighted = globalIndex === highlightedIndex;
                  const Icon = item.icon;

                  return (
                    <motion.button
                      key={`${group.heading}-${item.id}`}
                      data-highlighted={isHighlighted}
                      className={`w-full text-left px-3 py-2.5 transition-colors flex items-center gap-3 group rounded-md mx-1 ${
                        isHighlighted
                          ? 'bg-emerald-50 dark:bg-emerald-950/30'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setHighlightedIndex(globalIndex)}
                      initial={false}
                      animate={isHighlighted ? { x: 2 } : { x: 0 }}
                      transition={{ duration: 0.1 }}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isHighlighted
                            ? 'bg-emerald-100 dark:bg-emerald-900/40'
                            : 'bg-muted/50 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/20'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 transition-colors ${
                            isHighlighted
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium transition-colors ${
                          isHighlighted ? 'text-emerald-700 dark:text-emerald-300' : ''
                        }`}>
                          {item.label}
                        </p>
                      </div>
                      {isHighlighted && (
                        <ChevronRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      )}
                      {!isHighlighted && (
                        <ArrowRight className="w-3 h-3 text-muted-foreground/30 shrink-0 group-hover:text-muted-foreground transition-colors" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer with keyboard shortcuts */}
        <div className="border-t px-3 py-2 flex items-center gap-4 text-[11px] text-muted-foreground/60">
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">&uarr;&darr;</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">&crarr;</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">esc</kbd>
            close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
