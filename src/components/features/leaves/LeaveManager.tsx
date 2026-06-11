// =============================================================================
// Smart Campus ERP - Leave Manager Component (Enhanced)
// =============================================================================
// Role-based leave management with:
// - Timeline visualization for leave requests (pending → approved/rejected)
// - Approve/reject buttons with icons and hover effects
// - Duration badges ("3 days", "1 week")
// - Color-coded status, type icons, CSV export, confirmation dialog
// =============================================================================

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane, Plus, CheckCircle, XCircle, Clock, RefreshCw,
  Heart, Coffee, BookOpen, User, CalendarDays, Download,
  ArrowRight, Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api';
import { format, differenceInDays, parseISO, isWithinInterval } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface LeaveRequest {
  id: string; type: string; startDate: string; endDate: string; reason: string; status: string;
  comments: string | null; approvedBy: string | null;
  user: { name: string; email: string; role: string };
  approver?: { name: string } | null;
  createdAt: string;
}

// Status badge styles with more vibrant colors
const STATUS_CONFIG: Record<string, { badge: string; icon: React.ElementType; dot: string; timeline: string }> = {
  pending: {
    badge: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    icon: Clock,
    dot: 'bg-amber-500',
    timeline: 'border-amber-400 bg-amber-50 dark:bg-amber-950/20',
  },
  approved: {
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    icon: CheckCircle,
    dot: 'bg-emerald-500',
    timeline: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20',
  },
  rejected: {
    badge: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    icon: XCircle,
    dot: 'bg-red-500',
    timeline: 'border-red-400 bg-red-50 dark:bg-red-950/20',
  },
};

// Leave type config with icons
const TYPE_CONFIG: Record<string, { icon: React.ElementType; badge: string; label: string; color: string }> = {
  casual: { icon: Coffee, badge: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/30 dark:text-sky-400', label: 'Casual Leave', color: 'text-sky-600' },
  sick: { icon: Heart, badge: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400', label: 'Sick Leave', color: 'text-red-600' },
  academic: { icon: BookOpen, badge: 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/30 dark:text-violet-400', label: 'Academic Leave', color: 'text-violet-600' },
  personal: { icon: User, badge: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400', label: 'Personal Leave', color: 'text-amber-600' },
};

// Calculate duration between dates
function getDuration(start: string, end: string): number {
  return differenceInDays(parseISO(end), parseISO(start)) + 1;
}

// Format duration badge
function formatDuration(days: number): string {
  if (days === 1) return '1 day';
  if (days <= 7) return `${days} days`;
  if (days <= 14) return '1 week';
  return `${Math.ceil(days / 7)} weeks`;
}

export default function LeaveManager() {
  const { currentUser } = useAppStore();
  const role = currentUser?.role || 'student';
  const { toast } = useToast();

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [type, setType] = useState('casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [creating, setCreating] = useState(false);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; leaveId: string; action: 'approve' | 'reject' }>({ open: false, leaveId: '', action: 'approve' });

  const loadLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = role === 'admin' ? '/leaves' : '/leaves/my-leaves';
      const res = await api.get(endpoint);
      setLeaves(res.data.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [role]);

  useEffect(() => { loadLeaves(); }, [loadLeaves]);

  // Apply for leave
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      toast({ title: 'Error', description: 'End date must be after start date', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      await api.post('/leaves', { type, startDate, endDate, reason });
      toast({ title: 'Success', description: 'Leave application submitted' });
      setStartDate(''); setEndDate(''); setReason('');
      loadLeaves();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast({ title: 'Error', description: axiosErr.response?.data?.message || 'Failed to apply', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  // Open confirmation dialog
  const openConfirm = (leaveId: string, action: 'approve' | 'reject') => {
    setConfirmDialog({ open: true, leaveId, action });
  };

  // Admin: Approve/reject with confirmation
  const handleAction = async () => {
    const { leaveId, action } = confirmDialog;
    try {
      await api.put(`/leaves/${leaveId}/${action}`);
      toast({ title: `Leave ${action === 'approve' ? 'Approved' : 'Rejected'}` });
      loadLeaves();
    } catch {
      toast({ title: 'Error', description: `Failed to ${action} leave`, variant: 'destructive' });
    } finally {
      setConfirmDialog({ open: false, leaveId: '', action: 'approve' });
    }
  };

  // Export leave requests to CSV
  const exportToCSV = () => {
    if (leaves.length === 0) {
      toast({ title: 'No Data', description: 'No leave requests to export', variant: 'destructive' });
      return;
    }
    const headers = ['Applicant Name', 'Type', 'Start Date', 'End Date', 'Duration (days)', 'Reason', 'Status', 'Approved By'];
    const rows = leaves.map((l) => [
      l.user?.name || 'N/A',
      TYPE_CONFIG[l.type]?.label || l.type,
      format(new Date(l.startDate), 'yyyy-MM-dd'),
      format(new Date(l.endDate), 'yyyy-MM-dd'),
      getDuration(l.startDate, l.endDate),
      l.reason,
      l.status,
      l.approver?.name || l.approvedBy || '-',
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leave-requests-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${leaves.length} leave requests exported successfully` });
  };

  // Summary stats
  const pendingCount = leaves.filter((l) => l.status === 'pending').length;
  const approvedCount = leaves.filter((l) => l.status === 'approved').length;
  const rejectedCount = leaves.filter((l) => l.status === 'rejected').length;

  // Approved leaves for calendar view
  const approvedLeaves = leaves.filter((l) => l.status === 'approved');

  // Get current month dates for mini calendar
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  // Check if a date has an approved leave
  const getLeavesForDate = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    return approvedLeaves.filter((l) => {
      try {
        return isWithinInterval(date, { start: parseISO(l.startDate), end: parseISO(l.endDate) });
      } catch {
        return false;
      }
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Leave Management</h2>

      {/* Summary cards with gradient headers */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400" />
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{approvedCount}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-red-400 to-rose-400" />
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{rejectedCount}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Form + Leave Requests */}
        <div className="lg:col-span-2 space-y-6">
          {/* Apply for Leave Form */}
          {role !== 'admin' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Plus className="w-5 h-5" /> Apply for Leave</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={handleApply} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Leave Type</Label>
                      <Select value={type} onValueChange={setType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                            const TypeIcon = cfg.icon;
                            return (
                              <SelectItem key={key} value={key}>
                                <span className="flex items-center gap-2">
                                  <TypeIcon className="w-4 h-4" /> {cfg.label}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div />
                    <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required /></div>
                    <div className="space-y-2"><Label>End Date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required /></div>
                    {startDate && endDate && (
                      <div className="md:col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarDays className="w-4 h-4" />
                        Duration: <Badge variant="outline" className="text-xs font-medium">{formatDuration(getDuration(startDate, endDate))}</Badge>
                        <span className="text-xs">({getDuration(startDate, endDate)} day{getDuration(startDate, endDate) !== 1 ? 's' : ''})</span>
                      </div>
                    )}
                    <div className="md:col-span-2 space-y-2"><Label>Reason</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} required /></div>
                    <div>
                      <Button type="submit" disabled={creating} className="bg-emerald-700 hover:bg-emerald-800 shadow-sm hover:shadow-md transition-shadow">
                        {creating ? 'Submitting...' : 'Submit Application'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Leave Requests */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">{role === 'admin' ? 'All Leave Requests' : 'My Leaves'}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-1.5">
                    <Download className="w-4 h-4" /> Export
                  </Button>
                  <Button variant="ghost" size="icon" onClick={loadLeaves}><RefreshCw className="w-4 h-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="max-h-[500px] overflow-y-auto custom-scrollbar">
                {loading ? (
                  <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded" />)}</div>
                ) : leaves.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Plane className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No leave requests</p>
                    {role !== 'admin' && <p className="text-xs text-muted-foreground mt-1">Apply for leave using the form above</p>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leaves.map((l) => {
                      const typeConfig = TYPE_CONFIG[l.type] || TYPE_CONFIG.casual;
                      const TypeIcon = typeConfig.icon;
                      const statusConfig = STATUS_CONFIG[l.status] || STATUS_CONFIG.pending;
                      const StatusIcon = statusConfig.icon;
                      const duration = getDuration(l.startDate, l.endDate);

                      return (
                        <motion.div
                          key={l.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`p-4 rounded-lg border ${statusConfig.timeline} transition-all hover:shadow-sm`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={`${typeConfig.badge} flex items-center gap-1 w-fit text-xs`}>
                                  <TypeIcon className="w-3 h-3" /> {typeConfig.label}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {formatDuration(duration)}
                                </Badge>
                              </div>
                              {role === 'admin' && (
                                <p className="text-sm font-medium mb-1">{l.user?.name || 'N/A'}</p>
                              )}
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CalendarDays className="w-3.5 h-3.5" />
                                <span>{format(new Date(l.startDate), 'MMM d')} - {format(new Date(l.endDate), 'MMM d')}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{l.reason}</p>

                              {/* Timeline visualization */}
                              <div className="flex items-center gap-1 mt-3">
                                <div className="flex items-center gap-1">
                                  <div className={`w-2 h-2 rounded-full ${l.status === 'pending' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                                  <span className="text-[10px] text-muted-foreground">Applied</span>
                                </div>
                                <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
                                <div className="flex items-center gap-1">
                                  <div className={`w-2 h-2 rounded-full ${l.status === 'approved' ? 'bg-emerald-500' : l.status === 'rejected' ? 'bg-red-500' : 'bg-muted-foreground/30'}`} />
                                  <span className="text-[10px] text-muted-foreground">
                                    {l.status === 'approved' ? 'Approved' : l.status === 'rejected' ? 'Rejected' : 'Pending'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <Badge className={`${statusConfig.badge} flex items-center gap-1 text-xs`}>
                                <StatusIcon className="w-3 h-3" /> {l.status}
                              </Badge>
                              {role === 'admin' && l.status === 'pending' && (
                                <div className="flex gap-1.5">
                                  <Button
                                    size="sm"
                                    className="h-7 bg-emerald-700 hover:bg-emerald-800 text-xs shadow-sm hover:shadow-md transition-all"
                                    onClick={() => openConfirm(l.id, 'approve')}
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" /> Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-7 text-xs shadow-sm hover:shadow-md transition-all"
                                    onClick={() => openConfirm(l.id, 'reject')}
                                  >
                                    <XCircle className="w-3 h-3 mr-1" /> Reject
                                  </Button>
                                </div>
                              )}
                              {l.status !== 'pending' && l.approver && (
                                <span className="text-[10px] text-muted-foreground">By {l.approver.name}</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right column: Mini Calendar */}
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" /> Leave Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-center mb-3">{format(today, 'MMMM yyyy')}</p>
              <div className="grid grid-cols-7 gap-1 text-center">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <div key={d} className="text-[10px] font-medium text-muted-foreground py-1">{d}</div>
                ))}
                {Array.from({ length: firstDayOfMonth }, (_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const leavesOnDay = getLeavesForDate(day);
                  const isToday = day === today.getDate();
                  const hasLeave = leavesOnDay.length > 0;
                  return (
                    <div
                      key={day}
                      className={`relative h-8 w-8 flex items-center justify-center text-xs rounded-md ${
                        isToday ? 'bg-emerald-600 text-white font-bold' :
                        hasLeave ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium' :
                        'hover:bg-muted/50'
                      }`}
                      title={hasLeave ? `${leavesOnDay.length} approved leave(s)` : undefined}
                    >
                      {day}
                      {hasLeave && !isToday && (
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Approved leave</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-600" /> Today</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.action === 'approve'
                ? 'Are you sure you want to approve this leave request?'
                : 'Are you sure you want to reject this leave request?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}>
              Cancel
            </Button>
            <Button
              className={confirmDialog.action === 'approve' ? 'bg-emerald-700 hover:bg-emerald-800' : ''}
              variant={confirmDialog.action === 'reject' ? 'destructive' : 'default'}
              onClick={handleAction}
            >
              {confirmDialog.action === 'approve' ? 'Yes, Approve' : 'Yes, Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
