// =============================================================================
// Smart Campus ERP - Marks Manager Component (Enhanced)
// =============================================================================
// Role-based marks management:
// - Teacher: Upload marks with student dropdown, subject & exam type selectors,
//   view/edit/delete marks table
// - Student: View marks with subject-wise bar chart, marks table
// - Admin: Full overview with department/subject filters, stat cards, table,
//   subject-wise average bar chart, CSV export
// =============================================================================

'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, RefreshCw, BarChart3, Trash2, Edit3, Download, Users, TrendingUp, Award, ArrowUpDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Subject { id: string; name: string; code: string; departmentId?: string; department?: { name: string; code: string }; }
interface Student { id: string; user: { name: string }; rollNumber: string; }
interface Department { id: string; name: string; code: string; }
interface Mark {
  id: string; marksObtained: number; totalMarks: number; examType: string; remarks: string | null;
  student: { user: { name: string }; rollNumber: string };
  subject: { id?: string; name: string; code: string };
}

const EXAM_TYPES = ['internal1', 'internal2', 'assignment', 'lab', 'semester'];
const EXAM_LABELS: Record<string, string> = {
  internal1: 'Internal 1',
  internal2: 'Internal 2',
  assignment: 'Assignment',
  lab: 'Lab',
  semester: 'Semester',
};

// Grade helper
function getGrade(pct: number): { grade: string; color: string; bg: string } {
  if (pct >= 90) return { grade: 'A+', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950/50' };
  if (pct >= 80) return { grade: 'A', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' };
  if (pct >= 70) return { grade: 'B', color: 'text-sky-700 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/30' };
  if (pct >= 60) return { grade: 'C', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' };
  if (pct >= 50) return { grade: 'D', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30' };
  return { grade: 'F', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30' };
}

export default function MarksManager() {
  const { currentUser } = useAppStore();
  const role = currentUser?.role || 'student';
  const { toast } = useToast();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [loading, setLoading] = useState(true);

  // Teacher form state
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [examType, setExamType] = useState('internal1');
  const [marksObtained, setMarksObtained] = useState('');
  const [totalMarks, setTotalMarks] = useState('100');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit state
  const [editingMarkId, setEditingMarkId] = useState<string | null>(null);
  const [editMarks, setEditMarks] = useState('');
  const [editTotal, setEditTotal] = useState('');
  const [editRemarks, setEditRemarks] = useState('');

  // Student view subject filter
  const [filterSubject, setFilterSubject] = useState('all');

  // Admin view state
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminMarks, setAdminMarks] = useState<Mark[]>([]);
  const [adminSubjects, setAdminSubjects] = useState<Subject[]>([]);
  const [adminDepts, setAdminDepts] = useState<Department[]>([]);
  const [adminFilterDept, setAdminFilterDept] = useState('all');
  const [adminFilterSubject, setAdminFilterSubject] = useState('all');
  const [adminSortField, setAdminSortField] = useState<'name' | 'marks' | 'pct'>('name');
  const [adminSortDir, setAdminSortDir] = useState<'asc' | 'desc'>('asc');

  const loadSubjects = useCallback(async () => {
    try {
      const res = await api.get('/subjects');
      setSubjects(res.data.data || []);
    } catch { /* ignore */ }
  }, []);

  const loadStudents = useCallback(async () => {
    if (role !== 'teacher' && role !== 'admin') return;
    try {
      const res = await api.get('/users?role=student');
      const users = res.data.data || [];
      const studentList = users.map((u: { id: string; name: string; student?: { id: string; rollNumber: string } | null }) => ({
        id: u.student?.id || u.id,
        user: { name: u.name },
        rollNumber: u.student?.rollNumber || 'N/A',
      }));
      setStudents(studentList);
    } catch { /* ignore */ }
  }, [role]);

  const loadMarks = useCallback(async () => {
    setLoading(true);
    try {
      if (role === 'student') {
        const res = await api.get('/marks/my-marks');
        const data = res.data.data;
        const marksList = Array.isArray(data) ? data : (data?.marks || []);
        setMarks(marksList);
      } else if (selectedSubject) {
        const res = await api.get(`/marks/subject/${selectedSubject}`);
        setMarks(res.data.data || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [role, selectedSubject]);

  // Admin data loading
  const loadAdminData = useCallback(async () => {
    setAdminLoading(true);
    try {
      const [subRes, deptRes] = await Promise.all([
        api.get('/subjects'),
        api.get('/departments'),
      ]);
      const allSubjects: Subject[] = subRes.data.data || [];
      const allDepts: Department[] = deptRes.data.data || [];
      setAdminSubjects(allSubjects);
      setAdminDepts(allDepts);

      const subjectById = new Map(allSubjects.map((s) => [s.id, s]));
      const allMarksRes = await api.get('/marks/all-subjects');
      const allMarks: Mark[] = (allMarksRes.data.data || []).map((m: Mark) => {
        const s = subjectById.get(m.subject?.id || '');
        return {
          ...m,
          subject: { ...m.subject, id: s?.id || m.subject?.id, name: s?.name || m.subject?.name, code: s?.code || m.subject?.code },
        };
      });
      setAdminMarks(allMarks);
    } catch { /* ignore */ }
    setAdminLoading(false);
  }, []);

  // Reload admin marks when subject filter changes
  const loadAdminMarksForSubject = useCallback(async (subjectId: string) => {
    if (subjectId === 'all') {
      loadAdminData();
      return;
    }
    setAdminLoading(true);
    try {
      const res = await api.get(`/marks/subject/${subjectId}`);
      const subjectInfo = adminSubjects.find((s) => s.id === subjectId);
      const subjectMarks: Mark[] = (res.data.data || []).map((m: Mark) => ({
        ...m,
        subject: { ...m.subject, id: subjectId, name: subjectInfo?.name || m.subject?.name || 'N/A', code: subjectInfo?.code || m.subject?.code || '' },
      }));
      setAdminMarks(subjectMarks);
    } catch { /* ignore */ }
    setAdminLoading(false);
  }, [adminSubjects, loadAdminData]);

  useEffect(() => { loadSubjects(); }, [loadSubjects]);
  useEffect(() => { loadStudents(); }, [loadStudents]);
  useEffect(() => { if (role === 'student') loadMarks(); }, [role, loadMarks]);
  useEffect(() => { if (selectedSubject && role === 'teacher') loadMarks(); }, [selectedSubject, role, loadMarks]);
  useEffect(() => { if (role === 'admin') loadAdminData(); }, [role, loadAdminData]);

  // Teacher: Upload marks
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject || !selectedStudent || !marksObtained) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/marks', {
        studentId: selectedStudent,
        subjectId: selectedSubject,
        examType,
        marksObtained: parseFloat(marksObtained),
        totalMarks: parseFloat(totalMarks),
        remarks: remarks || undefined,
      });
      toast({ title: 'Success', description: 'Marks uploaded successfully' });
      setMarksObtained(''); setRemarks('');
      loadMarks();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast({ title: 'Error', description: axiosErr.response?.data?.message || 'Failed to upload marks', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Update marks
  const handleUpdate = async (markId: string) => {
    try {
      await api.put(`/marks/${markId}`, {
        marksObtained: parseFloat(editMarks),
        totalMarks: parseFloat(editTotal),
        remarks: editRemarks || undefined,
      });
      toast({ title: 'Success', description: 'Marks updated' });
      setEditingMarkId(null);
      loadMarks();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast({ title: 'Error', description: axiosErr.response?.data?.message || 'Failed to update marks', variant: 'destructive' });
    }
  };

  // Delete marks
  const deleteMark = async (id: string) => {
    try {
      await api.delete(`/marks/${id}`);
      setMarks((prev) => prev.filter((m) => m.id !== id));
      toast({ title: 'Deleted', description: 'Marks entry removed' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete marks', variant: 'destructive' });
    }
  };

  // Export marks to CSV (teacher/student)
  const exportToCSV = () => {
    if (marks.length === 0) {
      toast({ title: 'No Data', description: 'No marks data to export', variant: 'destructive' });
      return;
    }
    const headers = ['Student Name', 'Roll Number', 'Subject', 'Exam Type', 'Marks Obtained', 'Total Marks', 'Percentage'];
    const rows = marks.map((m) => [
      m.student?.user?.name || 'N/A',
      m.student?.rollNumber || 'N/A',
      m.subject?.name || 'N/A',
      EXAM_LABELS[m.examType] || m.examType,
      m.marksObtained,
      m.totalMarks,
      `${((m.marksObtained / m.totalMarks) * 100).toFixed(1)}%`,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marks-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${marks.length} marks records exported successfully` });
  };

  // Admin: Export marks to CSV
  const exportAdminCSV = () => {
    const dataToExport = filteredAdminMarks;
    if (dataToExport.length === 0) {
      toast({ title: 'No Data', description: 'No marks data to export', variant: 'destructive' });
      return;
    }
    const headers = ['Student Name', 'Roll Number', 'Subject', 'Exam Type', 'Marks Obtained', 'Total Marks', 'Percentage', 'Grade'];
    const rows = dataToExport.map((m) => {
      const pct = Math.round((m.marksObtained / m.totalMarks) * 100);
      return [
        m.student?.user?.name || 'N/A',
        m.student?.rollNumber || 'N/A',
        m.subject?.name || 'N/A',
        EXAM_LABELS[m.examType] || m.examType,
        m.marksObtained,
        m.totalMarks,
        `${pct}%`,
        getGrade(pct).grade,
      ];
    });
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-marks-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${dataToExport.length} marks records exported successfully` });
  };

  // Start editing
  const startEdit = (m: Mark) => {
    setEditingMarkId(m.id);
    setEditMarks(m.marksObtained.toString());
    setEditTotal(m.totalMarks.toString());
    setEditRemarks(m.remarks || '');
  };

  // =========================================================================
  // Teacher View
  // =========================================================================
  if (role === 'teacher') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Marks Management</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Marks Form */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Plus className="w-5 h-5" /> Upload Marks</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Student</Label>
                    <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                      <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {students.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.user.name} ({s.rollNumber})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Exam Type</Label>
                    <Select value={examType} onValueChange={setExamType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EXAM_TYPES.map((t) => <SelectItem key={t} value={t}>{EXAM_LABELS[t]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Marks Obtained</Label>
                      <Input type="number" min="0" value={marksObtained} onChange={(e) => setMarksObtained(e.target.value)} placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <Label>Total Marks</Label>
                      <Input type="number" min="1" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Remarks (optional)</Label>
                    <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional remarks" />
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full bg-emerald-700 hover:bg-emerald-800">
                    {submitting ? 'Uploading...' : <><Plus className="w-4 h-4 mr-2" /> Upload Marks</>}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Marks Table */}
          <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Marks Records</CardTitle>
                <div className="flex items-center gap-2">
                  {selectedSubject && (
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-1.5">
                      <Download className="w-4 h-4" /> Export
                    </Button>
                    <Button variant="ghost" size="icon" onClick={loadMarks}><RefreshCw className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="max-h-[500px] overflow-y-auto custom-scrollbar">
                {loading ? (
                  <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
                ) : !selectedSubject ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">Select a subject to view marks</p>
                  </div>
                ) : marks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No marks recorded for this subject yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Use the form to upload marks</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Roll No</TableHead>
                        <TableHead>Exam</TableHead>
                        <TableHead>Marks</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {marks.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.student?.user?.name || 'N/A'}</TableCell>
                          <TableCell className="text-muted-foreground">{m.student?.rollNumber || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {EXAM_LABELS[m.examType] || m.examType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {editingMarkId === m.id ? (
                              <div className="flex items-center gap-1">
                                <Input type="number" value={editMarks} onChange={(e) => setEditMarks(e.target.value)} className="w-16 h-8 text-sm" />
                                <span className="text-muted-foreground">/</span>
                                <Input type="number" value={editTotal} onChange={(e) => setEditTotal(e.target.value)} className="w-16 h-8 text-sm" />
                              </div>
                            ) : (
                              <span className="font-medium">
                                {m.marksObtained}/{m.totalMarks}
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({Math.round((m.marksObtained / m.totalMarks) * 100)}%)
                                </span>
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingMarkId === m.id ? (
                              <Input value={editRemarks} onChange={(e) => setEditRemarks(e.target.value)} className="h-8 text-sm w-28" placeholder="Remarks" />
                            ) : (
                              <span className="text-sm text-muted-foreground">{m.remarks || '-'}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingMarkId === m.id ? (
                              <div className="flex gap-1">
                                <Button size="sm" className="h-7 bg-emerald-700 text-xs" onClick={() => handleUpdate(m.id)}>Save</Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingMarkId(null)}>Cancel</Button>
                              </div>
                            ) : (
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-7" onClick={() => startEdit(m)}>
                                  <Edit3 className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => deleteMark(m.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Student View
  // =========================================================================
  if (role === 'student') {
    const safeMarks = Array.isArray(marks) ? marks : [];
    const chartData = safeMarks.reduce((acc, m) => {
      const name = m.subject?.name || 'Unknown';
      const existing = acc.find((a) => a.name === name);
      if (existing) {
        existing.percentage = Math.round(((existing.total + m.marksObtained) / (existing.maxTotal + m.totalMarks)) * 100);
        existing.total += m.marksObtained;
        existing.maxTotal += m.totalMarks;
      } else {
        acc.push({ name, percentage: Math.round((m.marksObtained / m.totalMarks) * 100), total: m.marksObtained, maxTotal: m.totalMarks });
      }
      return acc;
    }, [] as { name: string; percentage: number; total: number; maxTotal: number }[]);

    const filteredMarks = filterSubject === 'all' ? safeMarks : safeMarks.filter((m) => m.subject?.id === filterSubject);

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">My Marks</h2>

        {chartData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Performance Overview</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)' }} formatter={(value: number) => [`${value}%`, 'Score']} />
                    <Bar dataKey="percentage" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.percentage >= 70 ? '#10b981' : entry.percentage >= 40 ? '#f59e0b' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Marks Details</CardTitle>
              <div className="flex gap-2">
                <Select value={filterSubject} onValueChange={setFilterSubject}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter subject" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-1.5">
                    <Download className="w-4 h-4" /> Export
                  </Button>
                  <Button variant="ghost" size="icon" onClick={loadMarks}><RefreshCw className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
              ) : filteredMarks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No marks recorded yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Your grades will appear here once teachers upload marks</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Exam Type</TableHead>
                      <TableHead>Marks</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMarks.map((m) => {
                      const pct = Math.round((m.marksObtained / m.totalMarks) * 100);
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.subject?.name || 'N/A'}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{EXAM_LABELS[m.examType] || m.examType}</Badge></TableCell>
                          <TableCell>{m.marksObtained}/{m.totalMarks}</TableCell>
                          <TableCell>
                            <span className={`font-medium ${pct >= 70 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                              {pct}%
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{m.remarks || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // =========================================================================
  // Admin View
  // =========================================================================

  // Filter subjects by department
const filteredAdminSubjects = useMemo(() => (
  adminFilterDept === 'all'
    ? adminSubjects
    : adminSubjects.filter((s) => s.departmentId === adminFilterDept)
), [adminSubjects, adminFilterDept]);

// Subject -> Department lookup
const subjectDepartmentMap = useMemo(() => {

  const map = new Map<string, string>();

adminSubjects.forEach((subject) => {
  if (subject.departmentId) {
    map.set(subject.id, subject.departmentId);
  }
});

return map;

}, [adminSubjects]);

// Filter marks
const filteredAdminMarks = useMemo(() => (
  adminMarks.filter((m) => {

    const deptMatch =
      adminFilterDept === 'all' ||
      subjectDepartmentMap.get(m.subject?.id ?? '') === adminFilterDept;

    const subMatch =
      adminFilterSubject === 'all' ||
      m.subject?.id === adminFilterSubject;

    return deptMatch && subMatch;

  })
), [
  adminMarks,
  adminFilterDept,
  adminFilterSubject,
  subjectDepartmentMap
]);

// Sort
const sortedAdminMarks = useMemo(() => (
  [...filteredAdminMarks].sort((a, b) => {

    const dir = adminSortDir === 'asc' ? 1 : -1;

    if (adminSortField === 'name')
      return dir * (a.student?.user?.name || '').localeCompare(b.student?.user?.name || '');

    if (adminSortField === 'marks')
      return dir * (a.marksObtained - b.marksObtained);

    const pctA =
      a.totalMarks > 0
        ? (a.marksObtained / a.totalMarks) * 100
        : 0;

    const pctB =
      b.totalMarks > 0
        ? (b.marksObtained / b.totalMarks) * 100
        : 0;

    return dir * (pctA - pctB);

  })
), [
  filteredAdminMarks,
  adminSortDir,
  adminSortField
]);

const totalEntries = filteredAdminMarks.length;

const avgScore = useMemo(() => (

  totalEntries > 0

    ? Math.round(

        filteredAdminMarks.reduce(

          (sum, m) =>

            sum +

            (m.totalMarks > 0

              ? (m.marksObtained / m.totalMarks) * 100

              : 0),

          0

        ) / totalEntries

      )

    : 0

), [
  filteredAdminMarks,
  totalEntries
]);

const passCount = useMemo(() => (

  filteredAdminMarks.filter(

    (m) =>

      m.totalMarks > 0 &&

      (m.marksObtained / m.totalMarks) * 100 >= 40

  ).length

), [filteredAdminMarks]);

const passRate =
  totalEntries > 0
    ? Math.round((passCount / totalEntries) * 100)
    : 0;

const topScorer = useMemo(() => (

  filteredAdminMarks.length > 0

    ? filteredAdminMarks.reduce((best, m) => {

        const pct =
          m.totalMarks > 0
            ? (m.marksObtained / m.totalMarks) * 100
            : 0;

        const bestPct =
          best.totalMarks > 0
            ? (best.marksObtained / best.totalMarks) * 100
            : 0;

        return pct > bestPct ? m : best;

      })

    : null

), [filteredAdminMarks]);

const subjectAvgData = useMemo(() => (

  filteredAdminMarks.length > 0

    ? Object.entries(

        filteredAdminMarks.reduce((acc, m) => {

          const key = m.subject?.name || 'Unknown';

          if (!acc[key]) {
            acc[key] = {
              total: 0,
              count: 0
            };
          }

          acc[key].total +=
            m.totalMarks > 0
              ? (m.marksObtained / m.totalMarks) * 100
              : 0;

          acc[key].count++;

          return acc;

        }, {} as Record<string, {
          total: number;
          count: number;
        }>)

      ).map(([name, { total, count }]) => ({

        name:
          name.length > 15
            ? name.slice(0, 15) + '…'
            : name,

        average: Math.round(total / count),

      }))

    : []

), [filteredAdminMarks]);

  const toggleSort = (field: 'name' | 'marks' | 'pct') => {
    if (adminSortField === field) {
      setAdminSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setAdminSortField(field);
      setAdminSortDir('asc');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Marks Overview</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportAdminCSV} className="gap-1.5">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
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
                <Select
                  value={adminFilterSubject}
                  onValueChange={(v) => {
                    setAdminFilterSubject(v);
                    loadAdminMarksForSubject(v);
                  }}
                >
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
      {adminLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalEntries}</p>
                  <p className="text-xs text-muted-foreground">Total Entries</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-950/50 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6 text-sky-700 dark:text-sky-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{avgScore}%</p>
                  <p className="text-xs text-muted-foreground">Average Score</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6 text-amber-700 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{passRate}%</p>
                  <p className="text-xs text-muted-foreground">Pass Rate</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6 text-purple-700 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold truncate max-w-[100px]">
                    {topScorer ? topScorer.student?.user?.name?.split(' ')[0] || 'N/A' : 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground">Top Scorer</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Subject-wise Average Chart */}
      {subjectAvgData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Subject-wise Average</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subjectAvgData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)' }} formatter={(value: number) => [`${value}%`, 'Average']} />
                  <Bar dataKey="average" radius={[6, 6, 0, 0]}>
                    {subjectAvgData.map((entry, index) => (
                      <Cell key={index} fill={entry.average >= 70 ? '#10b981' : entry.average >= 40 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Marks Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5" /> Marks Records</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto custom-scrollbar">
            {adminLoading ? (
              <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
            ) : sortedAdminMarks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No marks records found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {adminFilterDept !== 'all' || adminFilterSubject !== 'all'
                    ? 'Try adjusting the filters above'
                    : 'Marks will appear here once teachers upload them'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('name')}>
                      <span className="flex items-center gap-1">Student Name <ArrowUpDown className="w-3 h-3" /></span>
                    </TableHead>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Exam Type</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('marks')}>
                      <span className="flex items-center gap-1">Marks <ArrowUpDown className="w-3 h-3" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('pct')}>
                      <span className="flex items-center gap-1">% <ArrowUpDown className="w-3 h-3" /></span>
                    </TableHead>
                    <TableHead>Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAdminMarks.map((m) => {
                    const pct = m.totalMarks > 0 ? Math.round((m.marksObtained / m.totalMarks) * 100) : 0;
                    const grade = getGrade(pct);
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.student?.user?.name || 'N/A'}</TableCell>
                        <TableCell className="text-muted-foreground">{m.student?.rollNumber || '-'}</TableCell>
                        <TableCell>{m.subject?.name || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{EXAM_LABELS[m.examType] || m.examType}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{m.marksObtained}/{m.totalMarks}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${pct >= 70 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                            {pct}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold ${grade.color} ${grade.bg}`}>
                            {grade.grade}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
