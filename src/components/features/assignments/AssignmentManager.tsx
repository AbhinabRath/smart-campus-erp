// =============================================================================
// Smart Campus ERP - Assignment Manager Component (Enhanced)
// =============================================================================
// Role-based assignment management:
// - Teacher: Create assignments with deadline picker, view submissions, grade
// - Student: View assignment cards with status badges, submit work, file upload UI
// - Admin: Full overview with department/subject filters, stat cards,
//   assignment cards with teacher info, create on behalf of teacher
// =============================================================================

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileUp, Plus, RefreshCw, Upload, Eye, CheckCircle, Clock,
  AlertTriangle, Calendar, FileText, Send, Trash2, Users, TrendingUp,
  ClipboardList, Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Subject { id: string; name: string; code: string; departmentId?: string; department?: { name: string; code: string }; }
interface Department { id: string; name: string; code: string; }
interface Teacher { id: string; user: { name: string }; employeeId: string; }
interface Assignment {
  id: string; title: string; description: string; deadline: string; maxMarks: number; filePath: string | null; fileName: string | null;
  subject: { id?: string; name: string; code: string; departmentId?: string };
  teacher: { user: { name: string } };
  submissions: Array<{
    id: string; studentId: string; filePath: string | null; fileName: string | null;
    submittedAt: string; status: string; marksObtained: number | null; feedback: string | null;
    student: { user: { name: string }; rollNumber: string };
  }>;
  _count?: { submissions: number };
}

export default function AssignmentManager() {
  const { currentUser } = useAppStore();
  const role = currentUser?.role || 'student';
  const { toast } = useToast();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);
  const [deadlineTime, setDeadlineTime] = useState('23:59');
  const [maxMarks, setMaxMarks] = useState('100');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Submission state - per assignment
  const [submitFiles, setSubmitFiles] = useState<Record<string, File | null>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  // Grading state
  const [gradeId, setGradeId] = useState('');
  const [gradeMarks, setGradeMarks] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [grading, setGrading] = useState(false);
  const [gradeOpen, setGradeOpen] = useState(false);

  // View submissions dialog
  const [viewAssignment, setViewAssignment] = useState<Assignment | null>(null);

  // Admin view state
  const [adminDepts, setAdminDepts] = useState<Department[]>([]);
  const [adminFilterDept, setAdminFilterDept] = useState('all');
  const [adminFilterSubject, setAdminFilterSubject] = useState('all');
  const [adminTeachers, setAdminTeachers] = useState<Teacher[]>([]);
  const [adminSelectedTeacher, setAdminSelectedTeacher] = useState('');
  const [adminCreateOpen, setAdminCreateOpen] = useState(false);
  const [adminCalendarOpen, setAdminCalendarOpen] = useState(false);
  const [adminTitle, setAdminTitle] = useState('');
  const [adminDescription, setAdminDescription] = useState('');
  const [adminDeadline, setAdminDeadline] = useState<Date | undefined>(undefined);
  const [adminDeadlineTime, setAdminDeadlineTime] = useState('23:59');
  const [adminMaxMarks, setAdminMaxMarks] = useState('100');
  const [adminSelectedSubject, setAdminSelectedSubject] = useState('');
  const [adminCreating, setAdminCreating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [assignRes, subRes] = await Promise.all([
        api.get('/assignments'),
        api.get('/subjects'),
      ]);
      setAssignments(assignRes.data.data || []);
      setSubjects(subRes.data.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  // Admin data loading
  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [assignRes, subRes, deptRes, teacherRes] = await Promise.all([
        api.get('/assignments'),
        api.get('/subjects'),
        api.get('/departments'),
        api.get('/users?role=teacher'),
      ]);
      setAssignments(assignRes.data.data || []);
      setSubjects(subRes.data.data || []);
      setAdminDepts(deptRes.data.data || []);
      // Transform teacher users to Teacher format
      const teacherUsers = teacherRes.data.data || [];
      const teacherList = teacherUsers.map((u: { id: string; name: string; teacher?: { id: string; employeeId: string } | null }) => ({
        id: u.teacher?.id || u.id,
        user: { name: u.name },
        employeeId: u.teacher?.employeeId || 'N/A',
      }));
      setAdminTeachers(teacherList);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (role === 'admin') {
      loadAdminData();
    } else {
      loadData();
    }
  }, [role, loadData, loadAdminData]);

  // Teacher: Create assignment
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !selectedSubject || !deadline) {
      toast({ title: 'Error', description: 'Please fill title, subject, and deadline', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const deadlineDate = new Date(deadline);
      const [hours, minutes] = deadlineTime.split(':').map(Number);
      deadlineDate.setHours(hours || 23, minutes || 59, 0);

      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('subjectId', selectedSubject);
      formData.append('deadline', deadlineDate.toISOString());
      formData.append('maxMarks', maxMarks);
      if (file) formData.append('file', file);

      await api.post('/assignments', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast({ title: 'Success', description: 'Assignment created' });
      setCreateOpen(false);
      setTitle(''); setDescription(''); setDeadline(undefined); setDeadlineTime('23:59'); setFile(null);
      setSelectedSubject(''); setMaxMarks('100');
      loadData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast({ title: 'Error', description: axiosErr.response?.data?.message || 'Failed to create assignment', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  // Admin: Create assignment on behalf of teacher
  const handleAdminCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminTitle || !adminSelectedSubject || !adminDeadline || !adminSelectedTeacher) {
      toast({ title: 'Error', description: 'Please fill title, subject, teacher, and deadline', variant: 'destructive' });
      return;
    }
    setAdminCreating(true);
    try {
      const deadlineDate = new Date(adminDeadline);
      const [hours, minutes] = adminDeadlineTime.split(':').map(Number);
      deadlineDate.setHours(hours || 23, minutes || 59, 0);

      await api.post('/assignments', {
        title: adminTitle,
        description: adminDescription,
        subjectId: adminSelectedSubject,
        deadline: deadlineDate.toISOString(),
        maxMarks: adminMaxMarks,
        teacherId: adminSelectedTeacher,
      });
      toast({ title: 'Success', description: 'Assignment created successfully' });
      setAdminCreateOpen(false);
      setAdminTitle(''); setAdminDescription(''); setAdminDeadline(undefined); setAdminDeadlineTime('23:59');
      setAdminSelectedSubject(''); setAdminSelectedTeacher(''); setAdminMaxMarks('100');
      loadAdminData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast({ title: 'Error', description: axiosErr.response?.data?.message || 'Failed to create assignment', variant: 'destructive' });
    } finally {
      setAdminCreating(false);
    }
  };

  // Admin: Delete assignment
  const handleAdminDelete = async (id: string) => {
    try {
      await api.delete(`/assignments/${id}`);
      toast({ title: 'Deleted', description: 'Assignment deleted' });
      loadAdminData();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete assignment', variant: 'destructive' });
    }
  };

  // Student: Submit assignment
  const handleSubmit = async (assignmentId: string) => {
    const submitFile = submitFiles[assignmentId];
    if (!submitFile) {
      toast({ title: 'Error', description: 'Please select a file', variant: 'destructive' });
      return;
    }
    setSubmitting(assignmentId);
    try {
      const formData = new FormData();
      formData.append('file', submitFile);
      await api.post(`/assignments/${assignmentId}/submit`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast({ title: 'Success', description: 'Assignment submitted' });
      setSubmitFiles((prev) => ({ ...prev, [assignmentId]: null }));
      loadData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast({ title: 'Error', description: axiosErr.response?.data?.message || 'Failed to submit', variant: 'destructive' });
    } finally {
      setSubmitting(null);
    }
  };

  // Teacher: Grade submission
  const handleGrade = async () => {
    if (!gradeId || !gradeMarks) return;
    setGrading(true);
    try {
      await api.put(`/assignments/submissions/${gradeId}/grade`, {
        marksObtained: parseFloat(gradeMarks),
        feedback: gradeFeedback,
      });
      toast({ title: 'Success', description: 'Submission graded' });
      setGradeOpen(false);
      setGradeMarks(''); setGradeFeedback('');
      loadData();
    } catch {
      toast({ title: 'Error', description: 'Failed to grade submission', variant: 'destructive' });
    } finally {
      setGrading(false);
    }
  };

  const openGrade = (subId: string, currentMarks?: number | null, currentFeedback?: string | null) => {
    setGradeId(subId);
    setGradeMarks(currentMarks?.toString() || '');
    setGradeFeedback(currentFeedback || '');
    setGradeOpen(true);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'graded': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'late': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-sky-100 text-sky-800 border-sky-200';
    }
  };

  const deadlinePassed = (dl: string) => new Date(dl) < new Date();

  // Get student assignment status
  const getAssignmentStatus = (a: Assignment) => {
    if (role !== 'student') return null;
    const mySub = a.submissions?.[0];
    if (mySub) {
      return { type: 'submitted' as const, sub: mySub };
    }
    if (deadlinePassed(a.deadline)) {
      return { type: 'overdue' as const, sub: null };
    }
    return { type: 'pending' as const, sub: null };
  };

  // Status badge for student view
  const renderStatusBadge = (status: ReturnType<typeof getAssignmentStatus>) => {
    if (!status) return null;
    switch (status.type) {
      case 'submitted':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
          <CheckCircle className="w-3 h-3 mr-1" /> Submitted
        </Badge>;
      case 'overdue':
        return <Badge variant="destructive">
          <AlertTriangle className="w-3 h-3 mr-1" /> Overdue
        </Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
          <Clock className="w-3 h-3 mr-1" /> Pending
        </Badge>;
    }
  };

  // Admin: Export assignments CSV
  const exportAdminCSV = () => {
    const dataToExport = assignments;
    if (dataToExport.length === 0) {
      toast({ title: 'No Data', description: 'No assignments to export', variant: 'destructive' });
      return;
    }
    const headers = ['Title', 'Subject', 'Teacher', 'Due Date', 'Max Marks', 'Submissions', 'Status'];
    const rows = dataToExport.map((a) => [
      a.title,
      a.subject?.name || 'N/A',
      a.teacher?.user?.name || 'N/A',
      format(new Date(a.deadline), 'yyyy-MM-dd h:mm a'),
      a.maxMarks,
      a._count?.submissions || 0,
      deadlinePassed(a.deadline) ? 'Overdue' : 'Active',
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assignments-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${dataToExport.length} assignments exported successfully` });
  };

  // =========================================================================
  // Admin View
  // =========================================================================
  if (role === 'admin') {
    // Filter subjects by department
    const filteredAdminSubjects = adminFilterDept === 'all'
      ? subjects
      : subjects.filter((s) => s.departmentId === adminFilterDept);

    // Filter assignments
    const filteredAdminAssignments = assignments.filter((a) => {
      const deptMatch = adminFilterDept === 'all' || (a.subject?.id && subjects.find((s) => s.id === a.subject.id)?.departmentId === adminFilterDept);
      const subMatch = adminFilterSubject === 'all' || a.subject?.id === adminFilterSubject;
      return deptMatch && subMatch;
    });

    // Compute stats
    const totalAssignments = filteredAdminAssignments.length;
    const activeCount = filteredAdminAssignments.filter((a) => !deadlinePassed(a.deadline)).length;
    const overdueCount = filteredAdminAssignments.filter((a) => deadlinePassed(a.deadline)).length;
    const avgSubmissionRate = totalAssignments > 0
      ? Math.round(
          filteredAdminAssignments.reduce((sum, a) => {
            const totalStudents = 6; // approximate from seed data
            const subs = a._count?.submissions || 0;
            return sum + (subs / totalStudents) * 100;
          }, 0) / totalAssignments
        )
      : 0;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Assignments Management</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportAdminCSV} className="gap-1.5">
              <Download className="w-4 h-4" /> Export
            </Button>
            <Dialog open={adminCreateOpen} onOpenChange={setAdminCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-700 hover:bg-emerald-800"><Plus className="w-4 h-4 mr-2" /> Create Assignment</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Create Assignment (Admin)</DialogTitle></DialogHeader>
                <form onSubmit={handleAdminCreate} className="space-y-4">
                  <div className="space-y-2"><Label>Title *</Label><Input value={adminTitle} onChange={(e) => setAdminTitle(e.target.value)} required /></div>
                  <div className="space-y-2"><Label>Description</Label><Textarea value={adminDescription} onChange={(e) => setAdminDescription(e.target.value)} rows={3} /></div>
                  <div className="space-y-2">
                    <Label>Teacher *</Label>
                    <Select value={adminSelectedTeacher} onValueChange={setAdminSelectedTeacher}>
                      <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {adminTeachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.user.name} ({t.employeeId})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject *</Label>
                    <Select value={adminSelectedSubject} onValueChange={setAdminSelectedSubject}>
                      <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Deadline *</Label>
                      <Popover open={adminCalendarOpen} onOpenChange={setAdminCalendarOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <Calendar className="w-4 h-4 mr-2" />
                            {adminDeadline ? format(adminDeadline, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={adminDeadline}
                            onSelect={(d) => { setAdminDeadline(d); setAdminCalendarOpen(false); }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Input type="time" value={adminDeadlineTime} onChange={(e) => setAdminDeadlineTime(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Max Marks</Label>
                    <Input type="number" value={adminMaxMarks} onChange={(e) => setAdminMaxMarks(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={adminCreating} className="w-full bg-emerald-700 hover:bg-emerald-800">
                    {adminCreating ? 'Creating...' : 'Create Assignment'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="icon" onClick={loadAdminData}><RefreshCw className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap">Department:</Label>
                  <Select value={adminFilterDept} onValueChange={(v) => { setAdminFilterDept(v); setAdminFilterSubject('all'); }}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Departments" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {adminDepts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap">Subject:</Label>
                  <Select value={adminFilterSubject} onValueChange={setAdminFilterSubject}>
                    <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Subjects" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {filteredAdminSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stat Cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
                    <ClipboardList className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalAssignments}</p>
                    <p className="text-xs text-muted-foreground">Total Assignments</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-950/50 flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6 text-sky-700 dark:text-sky-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{activeCount}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6 text-red-700 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{overdueCount}</p>
                    <p className="text-xs text-muted-foreground">Overdue</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-6 h-6 text-amber-700 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{avgSubmissionRate}%</p>
                    <p className="text-xs text-muted-foreground">Avg Submission Rate</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Assignment List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <Card key={i}><CardContent className="p-6"><Skeleton className="h-40 rounded" /></CardContent></Card>)}
          </div>
        ) : filteredAdminAssignments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <FileUp className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-2">No assignments found</p>
              <p className="text-xs text-muted-foreground">
                {adminFilterDept !== 'all' || adminFilterSubject !== 'all'
                  ? 'Try adjusting the filters above'
                  : 'Create assignments to get started'}
              </p>
              <Button onClick={() => setAdminCreateOpen(true)} className="mt-4 bg-emerald-700 hover:bg-emerald-800">
                <Plus className="w-4 h-4 mr-2" /> Create Assignment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAdminAssignments.map((a, idx) => {
              const isPast = deadlinePassed(a.deadline);
              const daysLeft = Math.ceil((new Date(a.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const subCount = a._count?.submissions || 0;

              return (
                <motion.div key={a.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                  <Card className={`hover:shadow-md transition-shadow ${isPast ? 'border-red-200 dark:border-red-900' : daysLeft <= 3 ? 'border-amber-200 dark:border-amber-900' : ''}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold truncate">{a.title}</h3>
                          <p className="text-sm text-muted-foreground">{a.subject?.name || 'N/A'}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          {isPast ? (
                            <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" /> Overdue</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:bg-emerald-950/30">
                              <CheckCircle className="w-3 h-3 mr-1" /> Active
                            </Badge>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleAdminDelete(a.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{a.description}</p>
                      {a.filePath && (
  <div className="mb-3 p-3 rounded-lg border bg-muted/30">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <FileText className="w-4 h-4 shrink-0" />
        <span className="text-sm truncate">
          {a.fileName || 'Assignment Attachment'}
        </span>
      </div>

      <Button
        size="sm"
        variant="outline"
        asChild
      >
        <a
          href={`http://localhost:3001/uploads/${a.filePath.split('\\').pop()}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          View File
        </a>
      </Button>
    </div>
  </div>
)}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {a.teacher?.user?.name || 'N/A'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(a.deadline), 'MMM d, yyyy h:mm a')}
                          {!isPast && daysLeft <= 3 && (
                            <span className="text-amber-600 font-medium ml-1">({daysLeft}d left)</span>
                          )}
                        </span>
                        <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {a.maxMarks} marks</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                          <Upload className="w-3 h-3" /> {subCount} submitted
                        </span>
                        <span className="text-muted-foreground">
                          Submissions: {subCount > 0 ? `${Math.round((subCount / 6) * 100)}%` : '0%'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // Teacher & Student Views (shared rendering)
  // =========================================================================
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Assignments</h2>
        <div className="flex items-center gap-2">
          {role === 'teacher' && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-700 hover:bg-emerald-800"><Plus className="w-4 h-4 mr-2" /> Create Assignment</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Create Assignment</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2"><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
                  <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
                  <div className="space-y-2">
                    <Label>Subject *</Label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Deadline *</Label>
                      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <Calendar className="w-4 h-4 mr-2" />
                            {deadline ? format(deadline, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={deadline}
                            onSelect={(d) => { setDeadline(d); setCalendarOpen(false); }}
                            disabled={(d) => d < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Input type="time" value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Max Marks</Label>
                    <Input type="number" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Attachment (optional)</Label>
                    <div className="flex items-center gap-2">
                      <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
                    </div>
                  </div>
                  <Button type="submit" disabled={creating} className="w-full bg-emerald-700 hover:bg-emerald-800">{creating ? 'Creating...' : 'Create Assignment'}</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
          <Button variant="ghost" size="icon" onClick={loadData}><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Grading Dialog */}
      <Dialog open={gradeOpen} onOpenChange={setGradeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Grade Submission</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Marks Obtained</Label><Input type="number" value={gradeMarks} onChange={(e) => setGradeMarks(e.target.value)} /></div>
            <div className="space-y-2"><Label>Feedback</Label><Textarea value={gradeFeedback} onChange={(e) => setGradeFeedback(e.target.value)} rows={3} /></div>
            <Button onClick={handleGrade} disabled={grading} className="w-full bg-emerald-700 hover:bg-emerald-800">{grading ? 'Saving...' : 'Save Grade'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assignment List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Card key={i}><CardContent className="p-6"><Skeleton className="h-40 rounded" /></CardContent></Card>)}
        </div>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileUp className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-2">No assignments yet</p>
            {role === 'teacher' && (
              <Button onClick={() => setCreateOpen(true)} className="mt-2 bg-emerald-700 hover:bg-emerald-800">
                <Plus className="w-4 h-4 mr-2" /> Create your first assignment
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.map((a, idx) => {
            const status = getAssignmentStatus(a);
            const isPast = deadlinePassed(a.deadline);
            const daysLeft = Math.ceil((new Date(a.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

            return (
              <motion.div key={a.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <Card className={`hover:shadow-md transition-shadow ${status?.type === 'overdue' ? 'border-red-200' : status?.type === 'pending' && daysLeft <= 2 ? 'border-amber-200' : ''}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold truncate">{a.title}</h3>
                        <p className="text-sm text-muted-foreground">{a.subject?.name || 'N/A'}</p>
                      </div>
                      {renderStatusBadge(status)}
                      {role !== 'student' && (
                        <Badge variant="outline">{a._count?.submissions || 0} submitted</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{a.description}</p>
                    {a.filePath && (
  <div className="mb-3 p-3 rounded-lg border bg-muted/30">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <FileText className="w-4 h-4 shrink-0" />
        <span className="text-sm truncate">
          {a.fileName || 'Assignment Attachment'}
        </span>
      </div>

      <Button
        size="sm"
        variant="outline"
        asChild
      >
        <a
          href={`http://localhost:3001/uploads/${a.filePath.split('\\').pop()}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          View File
        </a>
      </Button>
    </div>
  </div>
)}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(a.deadline), 'MMM d, yyyy h:mm a')}
                        {role === 'student' && !isPast && daysLeft <= 3 && (
                          <span className="text-amber-600 font-medium ml-1">({daysLeft}d left)</span>
                        )}
                      </span>
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {a.maxMarks} marks</span>
                    </div>

                    {/* Student: Submission section */}
                    {role === 'student' && status?.type === 'pending' && !isPast && (
                      <div className="mt-3 p-3 rounded-lg bg-muted/50 space-y-2">
                        <Label className="text-xs">Submit your work</Label>
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <Input
                              type="file"
                              onChange={(e) => setSubmitFiles((prev) => ({ ...prev, [a.id]: e.target.files?.[0] || null }))}
                              className="text-xs"
                            />
                            {submitFiles[a.id] && (
                              <p className="text-xs text-emerald-600 mt-1 truncate">{submitFiles[a.id]!.name}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleSubmit(a.id)}
                            disabled={submitting === a.id || !submitFiles[a.id]}
                            className="bg-emerald-700 hover:bg-emerald-800 shrink-0"
                          >
                            <Send className="w-3 h-3 mr-1" />
                            {submitting === a.id ? 'Uploading...' : 'Submit'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Student: Submission details */}
                    {role === 'student' && status?.sub && (
                      <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span className="font-medium text-emerald-700">
                            {status.sub.status === 'graded' ? 'Graded' : 'Submitted'}
                          </span>
                        </div>
                        <p className="text-muted-foreground">Submitted: {format(new Date(status.sub.submittedAt), 'MMM d, yyyy h:mm a')}</p>
                        {status.sub.marksObtained !== null && (
                          <p className="font-medium">Marks: <span className={status.sub.marksObtained / a.maxMarks >= 0.7 ? 'text-emerald-600' : 'text-amber-600'}>
                            {status.sub.marksObtained}/{a.maxMarks}
                          </span></p>
                        )}
                        {status.sub.feedback && <p className="text-muted-foreground">Feedback: {status.sub.feedback}</p>}
                      </div>
                    )}

                    {/* Teacher: Submissions button */}
                    {role === 'teacher' && (
                      <div className="flex gap-2 mt-3">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => setViewAssignment(a)} className="gap-1">
                              <Eye className="w-3 h-3" /> Submissions ({a._count?.submissions || 0})
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader><DialogTitle>{a.title} - Submissions</DialogTitle></DialogHeader>
                            {viewAssignment?.submissions?.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-8 text-center">
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                  <Upload className="w-6 h-6 text-muted-foreground" />
                                </div>
                                <p className="text-muted-foreground">No submissions yet</p>
                              </div>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Submitted</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Marks</TableHead>
                                    <TableHead>Action</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {viewAssignment?.submissions?.map((sub) => (
                                    <TableRow key={sub.id}>
                                      <TableCell>
                                        <div>
                                          <p className="font-medium">{sub.student?.user?.name || 'N/A'}</p>
                                          <p className="text-xs text-muted-foreground">{sub.student?.rollNumber}</p>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                          <div className="flex items-center gap-2">
                                            <span>
                                              {format(new Date(sub.submittedAt), 'MMM d, h:mm a')}
                                            </span>

                                            {sub.filePath && (
                                              <>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  asChild
                                                >
                                                  <a
                                                    href={`http://localhost:3001/uploads/${sub.filePath.split('\\').pop()}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                  >
                                                    View
                                                  </a>
                                                </Button>

                                                
                                              </>
                                            )}
                                          </div>
                                        </TableCell>
                                      <TableCell><Badge className={statusColor(sub.status)}>{sub.status}</Badge></TableCell>
                                      <TableCell>{sub.marksObtained !== null ? `${sub.marksObtained}/${a.maxMarks}` : '-'}</TableCell>
                                      <TableCell>
                                        <Button size="sm" variant="outline" onClick={() => openGrade(sub.id, sub.marksObtained, sub.feedback)}>
                                          Grade
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
