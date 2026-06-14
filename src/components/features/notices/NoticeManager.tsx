// =============================================================================
// Smart Campus ERP - Notice Manager Component (Enhanced)
// =============================================================================
// Role-based notice management with:
// - Pin animation for pinned/important notices
// - Mark as Read toggle with smooth transition
// - Urgent notices with red left border + subtle red background tint
// - Relative time display ("2 hours ago", "yesterday")
// - Color-coded priority badges, detail dialog
// =============================================================================

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Plus, RefreshCw, Pin, Trash2, AlertTriangle, AlertCircle, Info, MinusCircle, Search, Eye, EyeOff, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Notice {
  id: string;
  title: string;
  content: string;
  targetRole: string;
  priority: string;
  isPinned: boolean;
  isRead: boolean;
  author: { name: string };
  createdAt: string;
  updatedAt: string;
}

// Color-coded priority config with dark mode
const PRIORITY_CONFIG: Record<string, { badge: string; icon: React.ElementType; border: string; bg: string }> = {
  urgent: {
    badge: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    icon: AlertTriangle,
    border: 'border-l-4 border-l-red-500 dark:border-l-red-400',
    bg: 'bg-red-50/50 dark:bg-red-950/20',
  },
  high: {
    badge: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
    icon: AlertCircle,
    border: 'border-l-4 border-l-orange-500 dark:border-l-orange-400',
    bg: 'bg-orange-50/30 dark:bg-orange-950/10',
  },
  normal: {
    badge: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700',
    icon: MinusCircle,
    border: '',
    bg: '',
  },
  low: {
    badge: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700',
    icon: Info,
    border: '',
    bg: '',
  },
};

export default function NoticeManager() {
  const { currentUser } = useAppStore();
  const role = currentUser?.role || 'student';
  const { toast } = useToast();

  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  

  // Create form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRole, setTargetRole] = useState('all');
  const [priority, setPriority] = useState('normal');
  const [creating, setCreating] = useState(false);

  // Detail dialog state
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadNotices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notices');
      setNotices(res.data.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadNotices(); }, [loadNotices]);

  // Persist read state
  

  // Toggle read state
  const toggleRead = async (
  id: string,
  e: React.MouseEvent
) => {
  e.stopPropagation();

  try {
    const res = await api.post(`/notices/${id}/read`);

    setNotices((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, isRead: res.data.data.isRead }
          : n
      )
    );
  } catch {
    toast({
      title: 'Error',
      description: 'Failed to update notice',
      variant: 'destructive',
    });
  }
};

  // Mark all as read
  const markAllRead = async () => {
  try {
    await api.post('/notices/read-all');

    setNotices((prev) =>
      prev.map((n) => ({
        ...n,
        isRead: true,
      }))
    );

    toast({
      title: 'Done',
      description: 'All notices marked as read',
    });
  } catch {
    toast({
      title: 'Error',
      description: 'Failed to mark all as read',
      variant: 'destructive',
    });
  }
};

  // Create notice
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) {
      toast({ title: 'Error', description: 'Please fill title and content', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      await api.post('/notices', { title, content, targetRole, priority });
      toast({ title: 'Success', description: 'Notice posted' });
      setTitle(''); setContent(''); setTargetRole('all'); setPriority('normal');
      loadNotices();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast({ title: 'Error', description: axiosErr.response?.data?.message || 'Failed to post notice', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  // Delete notice
  const deleteNotice = async (id: string) => {
    try {
      await api.delete(`/notices/${id}`);
      setNotices((prev) => prev.filter((n) => n.id !== id));
      toast({ title: 'Deleted', description: 'Notice removed' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete notice', variant: 'destructive' });
    }
  };

  // Open detail dialog
const openDetail = async (notice: Notice) => {
  setSelectedNotice(notice);
  setDetailOpen(true);

  if (!notice.isRead) {
    try {
      await api.post(`/notices/${notice.id}/read`);

      setNotices((prev) =>
        prev.map((n) =>
          n.id === notice.id
            ? { ...n, isRead: true }
            : n
        )
      );
    } catch {}
  }
};

  const canCreate = role === 'admin' || role === 'teacher';
  const canDelete = role === 'admin';

  // Sort notices: pinned first, then by date; also filter by search and priority
  const sortedNotices = [...notices]
    .filter((n) => {
      const matchesSearch = !searchQuery || n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = filterPriority === 'all' || n.priority === filterPriority;
      return matchesSearch && matchesPriority;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const unreadCount =
  notices.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Notices</h2>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground">{unreadCount} unread notice{unreadCount !== 1 ? 's' : ''}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Mark All Read
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5 no-print" onClick={() => window.print()}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7M6 18H4a1 1 0 01-1-1v-7a1 1 0 011-1h16a1 1 0 011 1v7a1 1 0 01-1 1h-2M6 14h12v8H6z"/></svg>
            Print
          </Button>
          <Button variant="ghost" size="icon" onClick={loadNotices}><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Create Notice Form */}
      {canCreate && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Plus className="w-5 h-5" /> Post Notice</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Content</Label><Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Target Audience</Label>
                    <Select value={targetRole} onValueChange={setTargetRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Everyone</SelectItem>
                        <SelectItem value="student">Students</SelectItem>
                        <SelectItem value="teacher">Teachers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" disabled={creating} className="bg-emerald-700 hover:bg-emerald-800">
                  {creating ? 'Posting...' : 'Post Notice'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Notice List */}
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 no-print">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search notices..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 rounded" /></CardContent></Card>)}</div>
      ) : notices.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-2">No notices yet</p>
            {canCreate && (
              <p className="text-xs text-muted-foreground">Create a notice to keep everyone informed</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {sortedNotices.map((n, idx) => {
              const pConfig = PRIORITY_CONFIG[n.priority] || PRIORITY_CONFIG.normal;
              const PriorityIcon = pConfig.icon;
              const relativeTime = formatDistanceToNow(new Date(n.createdAt), { addSuffix: true });
              const isRead = n.isRead;

              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100, height: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <Card
                    className={`hover:shadow-md transition-all cursor-pointer group ${pConfig.border} ${pConfig.bg} ${n.isPinned ? 'border-amber-300 bg-amber-50/30 dark:bg-amber-950/10' : ''} ${!isRead ? 'border-l-emerald-400' : ''}`}
                    onClick={() => openDetail(n)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {n.isPinned && (
                              <motion.span
                                animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
                                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                              >
                                <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              </motion.span>
                            )}
                            <h3 className={`font-semibold truncate ${!isRead ? '' : 'opacity-70'}`}>{n.title}</h3>
                            {!isRead && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            )}
                          </div>
                          <p className={`text-sm text-muted-foreground line-clamp-2 ${isRead ? 'opacity-60' : ''}`}>{n.content}</p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="text-xs text-muted-foreground">By {n.author?.name || 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1" title={format(new Date(n.createdAt), 'MMM d, yyyy h:mm a')}>
                              <Clock className="w-3 h-3" />
                              {relativeTime}
                            </span>
                            <Badge variant="outline" className="text-xs capitalize">{n.targetRole === 'all' ? 'Everyone' : n.targetRole + 's'}</Badge>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <Badge className={`${pConfig.badge} text-xs flex items-center gap-1`}>
                            <PriorityIcon className="w-3 h-3" />
                            {n.priority}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-6 text-xs ${isRead ? 'hover:bg-emerald-500/10' : 'hover:bg-muted'}`}
                              onClick={(e) => toggleRead(n.id, e)}
                              title={isRead ? 'Mark as unread' : 'Mark as read'}
                            >
                              {isRead ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </Button>
                            {canDelete && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive h-6 text-xs hover:bg-destructive/10"
                                onClick={(e) => { e.stopPropagation(); deleteNotice(n.id); }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}

      {/* Notice Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          {selectedNotice && (() => {
            const pConfig = PRIORITY_CONFIG[selectedNotice.priority] || PRIORITY_CONFIG.normal;
            const PriorityIcon = pConfig.icon;
            const relativeTime = formatDistanceToNow(new Date(selectedNotice.createdAt), { addSuffix: true });
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    {selectedNotice.isPinned && (
                      <motion.span animate={{ rotate: [0, -15, 15, -10, 10, 0] }} transition={{ duration: 0.5 }}>
                        <Pin className="w-4 h-4 text-amber-500" />
                      </motion.span>
                    )}
                    {selectedNotice.title}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${pConfig.badge} text-xs flex items-center gap-1`}>
                      <PriorityIcon className="w-3 h-3" /> {selectedNotice.priority}
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">
                      {selectedNotice.targetRole === 'all' ? 'Everyone' : selectedNotice.targetRole + 's'}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {relativeTime}
                    </span>
                  </div>
                  <Separator />
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{selectedNotice.content}</div>
                  <Separator />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>By {selectedNotice.author?.name || 'Unknown'}</span>
                    <span>{format(new Date(selectedNotice.createdAt), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                  {selectedNotice.updatedAt !== selectedNotice.createdAt && (
                    <p className="text-xs text-muted-foreground">Last updated: {format(new Date(selectedNotice.updatedAt), 'MMM d, yyyy h:mm a')}</p>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
