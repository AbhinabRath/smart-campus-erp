// =============================================================================
// Smart Campus ERP - Attendance Manager Component
// =============================================================================
// Role-based attendance management:
// - Teacher: Create sessions, display QR code, end sessions, view reports
// - Student: Enter QR code to mark attendance, view history & percentage
// - Admin: View attendance reports and analytics
// =============================================================================

'use client';
import { Progress } from '@/components/ui/progress';
import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck, QrCode, Play, StopCircle, RefreshCw, CheckCircle, XCircle, Users, Download, BarChart3, Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
function CircularProgress({ value, size = 140, strokeWidth = 10 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 75 ? '#10b981' : value >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted/30"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{value}%</span>
        <span className="text-xs text-muted-foreground">Attendance</span>
      </div>
    </div>
  );
}
interface Subject { id: string; name: string; code: string; }
interface Department { id: string; name: string; code: string; }
interface Session {
  id: string; qrCode: string; isActive: boolean; duration: number; startedAt: string; endedAt: string | null;
  subject: { name: string; code: string }; teacher: { user: { name: string } };
  department: { id?: string; name: string }; semester: number; section: string; _count: { records: number };
  qrDataUrl?: string;
}
interface Record { id: string; markedAt: string; session: { subject: { name: string }; startedAt: string; }; }

export default function AttendanceManager() {
  const { currentUser } = useAppStore();
  const role = currentUser?.role || 'student';
  const { toast } = useToast();

  // Teacher state
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('3');
  const [selectedSection, setSelectedSection] = useState('A');
  const [creating, setCreating] = useState(false);
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Student state
  const [qrInput, setQrInput] = useState('');
  const [marking, setMarking] = useState(false);
  const [myRecords, setMyRecords] = useState<Record[]>([]);
 const [attendancePercent, setAttendancePercent] = useState<any>({
  overallPercentage: 0,
  totalSessions: 0,
  attendedSessions: 0,
  subjectBreakdown: [],
});
  // Admin state
  const [adminFilterDept, setAdminFilterDept] = useState('all');
  const [adminFilterSemester, setAdminFilterSemester] = useState('all');
  const [adminLoading, setAdminLoading] = useState(true);
  const [prcRollNumber, setPrcRollNumber] = useState('');
  const [prcSubject, setPrcSubject] = useState('');
  const [prcDate, setPrcDate] = useState('');
  const [prcReason, setPrcReason] = useState('');
  // Load dropdown data for teachers
  const loadTeacherData = useCallback(async () => {
    try {
      const [subRes, deptRes, sessRes] = await Promise.all([
        api.get('/subjects'),
        api.get('/departments'),
        api.get('/attendance/sessions'),
      ]);
      setSubjects(subRes.data.data || []);
      setDepartments(deptRes.data.data || []);
      const allSessions = sessRes.data.data || [];
      setSessions(allSessions);
      const active = allSessions.find((s: Session) => s.isActive);
      if (active) setActiveSession(active);
    } catch { /* ignore */ }
  }, []);

  // Load student data
  const loadStudentData = useCallback(async () => {
    try {
      const [histRes, pctRes] = await Promise.all([
        api.get('/attendance/my-attendance'),
        api.get('/attendance/percentage'),
      ]);
      setMyRecords(histRes.data.data || []);
     setAttendancePercent(
  pctRes.data.data || {
    overallPercentage: 0,
    totalSessions: 0,
    attendedSessions: 0,
    subjectBreakdown: [],
  }
);
    } catch { /* ignore */ }
  }, []);

  // Admin: load data with loading state
  const loadAdminData = useCallback(async () => {
    setAdminLoading(true);
    try {
      const [sessRes, deptRes, subRes] = await Promise.all([
  api.get('/attendance/sessions'),
  api.get('/departments'),
  api.get('/subjects'),
]);
      const allSessions = sessRes.data.data || [];
      setSessions(allSessions);
      setDepartments(deptRes.data.data || []);
      setSubjects(subRes.data.data || []);
    } catch { /* ignore */ }
    setAdminLoading(false);
  }, []);

  useEffect(() => {
    if (role === 'teacher') loadTeacherData();
    if (role === 'admin') loadAdminData();
    if (role === 'student') loadStudentData();
  }, [role, loadTeacherData, loadStudentData, loadAdminData]);

  // Teacher: Create attendance session
  const createSession = async () => {
    if (!selectedSubject || !selectedDept) {
      toast({ title: 'Error', description: 'Please select subject and department', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const res = await api.post('/attendance/sessions', {
        subjectId: selectedSubject,
        departmentId: selectedDept,
        semester: parseInt(selectedSemester),
        section: selectedSection,
      });
      const newSession = res.data.data;
      setActiveSession(newSession);
      setSessions((prev) => [newSession, ...prev]);
      toast({ title: 'Session Created', description: 'Attendance session is now active' });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast({ title: 'Error', description: axiosErr.response?.data?.message || 'Failed to create session', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  // Teacher: End attendance session
  const endSession = async (sessionId: string) => {
    try {
      await api.post(`/attendance/sessions/${sessionId}/end`);
      setActiveSession(null);
      setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, isActive: false } : s));
      toast({ title: 'Session Ended', description: 'Attendance session has been closed' });
    } catch {
      toast({ title: 'Error', description: 'Failed to end session', variant: 'destructive' });
    }
  };

  // Export CSV helper
  const exportSessionsCSV = (sessionsData: Session[], filename: string) => {
    if (sessionsData.length === 0) {
      toast({ title: 'No Data', description: 'No sessions to export', variant: 'destructive' });
      return;
    }
    const headers = ['Subject', 'Teacher', 'Department', 'Semester', 'Section', 'Started', 'Present Count', 'Status'];
    const rows = sessionsData.map((s) => [
      s.subject?.name || 'N/A',
      s.teacher?.user?.name || 'N/A',
      s.department?.name || 'N/A',
      s.semester?.toString() || '',
      s.section || '',
      s.startedAt ? format(new Date(s.startedAt), 'MMM d, yyyy h:mm a') : '',
      (s._count?.records || 0).toString(),
      s.isActive ? 'Live' : 'Ended',
    ]);
    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'CSV file downloaded successfully' });
  };

  // Student: Mark attendance via QR code
  const markAttendance = async () => {
    if (!qrInput.trim()) return;
    setMarking(true);
    try {
      await api.post('/attendance/mark', { qrCode: qrInput.trim() });
      toast({ title: 'Success', description: 'Attendance marked successfully!' });
      setQrInput('');
      loadStudentData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast({ title: 'Error', description: axiosErr.response?.data?.message || 'Failed to mark attendance', variant: 'destructive' });
    } finally {
      setMarking(false);
    }
  };
const applyPRC = async () => {
  try {

    const res = await api.post(
      '/attendance/prc',
      {
        rollNumber: prcRollNumber,
        subjectId: prcSubject,
        date: prcDate,
        reason: prcReason
      }
    );

    const confirmApply = window.confirm(
      `Apply Corrected Present to ${res.data.data.studentName}?`
    );

    if (!confirmApply) return;

    await api.post(
      '/attendance/prc/confirm',
      res.data.data
    );

    toast({
      title: 'Success',
      description: 'PRC Applied Successfully'
    });

  } catch (err:any) {

    toast({
      title: 'Error',
      description:
        err.response?.data?.message ||
        'Failed to apply PRC',
      variant: 'destructive'
    });

  }
};
  // =========================================================================
  // Teacher View
  // =========================================================================
  if (role === 'teacher') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Attendance Management</h2>
          <div className="flex items-center gap-2">
            <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="h-8 text-xs w-[150px]" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Session */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Play className="w-5 h-5 text-emerald-600" /> Create Session</CardTitle></CardHeader>
              <CardContent className="space-y-4">
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
                  <Label>Department</Label>
                  <Select value={selectedDept} onValueChange={setSelectedDept}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} ({d.code})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Semester</Label>
                    <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6,7,8].map((s) => <SelectItem key={s} value={s.toString()}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Section</Label>
                    <Select value={selectedSection} onValueChange={setSelectedSection}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['A','B','C'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={createSession} disabled={creating || !!activeSession} className="w-full bg-emerald-700 hover:bg-emerald-800">
                  {creating ? 'Creating...' : activeSession ? 'Session Active' : 'Create Session'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Active Session / QR Code */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><QrCode className="w-5 h-5 text-emerald-600" /> Active Session</CardTitle></CardHeader>
              <CardContent>
                {activeSession ? (
                  <div className="space-y-4 text-center">
                    <Badge className="bg-emerald-600 mb-2 flex items-center gap-1.5 mx-auto w-fit">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                      </span>
                      Live
                    </Badge>
                    <p className="font-medium">{activeSession.subject?.name || 'Session'}</p>
                    <p className="text-sm text-muted-foreground">
                      Started {format(new Date(activeSession.startedAt), 'h:mm a')}
                    </p>
                    {activeSession.qrDataUrl && (
                      <div className="flex justify-center">
                        <div className="relative p-4 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl bg-white">
                          {/* Corner markers */}
                          <div className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-500 rounded-tl" />
                          <div className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-500 rounded-tr" />
                          <div className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-500 rounded-bl" />
                          <div className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-500 rounded-br" />
                          <img src={activeSession.qrDataUrl} alt="QR Code" className="w-44 h-44 rounded-lg" />
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">QR Token: {activeSession.qrCode}</p>
                    <Button variant="destructive" onClick={() => endSession(activeSession.id)} className="w-full">
                      <StopCircle className="w-4 h-4 mr-2" /> End Session
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <QrCode className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No active session</p>
                    <p className="text-sm">Create a session to generate a QR code</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Session History */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-600" /> Session History</CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => exportSessionsCSV(sessions, 'attendance-sessions.csv')} title="Export CSV">
                  <Download className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={loadTeacherData}><RefreshCw className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto custom-scrollbar">
              {sessions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No sessions yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Sem/Sec</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Present</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.subject?.name || 'N/A'}</TableCell>
                        <TableCell>{s.semester}/{s.section}</TableCell>
                        <TableCell>{format(new Date(s.startedAt), 'MMM d, h:mm a')}</TableCell>
                        <TableCell>{s._count?.records || 0}</TableCell>
                        <TableCell>
                          <Badge variant={s.isActive ? 'default' : 'secondary'} className={s.isActive ? 'bg-emerald-600 flex items-center gap-1.5' : ''}>
                            {s.isActive && (
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                              </span>
                            )}
                            {s.isActive ? 'Live' : 'Ended'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {s.isActive && (
                            <Button size="sm" variant="outline" onClick={() => endSession(s.id)}>End</Button>
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
    );
  }

  // =========================================================================
  // Student View
  // =========================================================================
  if (role === 'student') {
    console.log("ATTENDANCE DATA:", attendancePercent);
    const attendanceColor =
  attendancePercent.overallPercentage >= 75
    ? 'text-emerald-600'
    : attendancePercent.overallPercentage >= 50
    ? 'text-amber-600'
    : 'text-red-600';
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">My Attendance</h2>

        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Attendance Overview</CardTitle>
              
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-6">
             <CircularProgress value={attendancePercent.overallPercentage} />
                <div className="flex-1 space-y-4 w-full">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Current Attendance</span>
                      <span className={attendanceColor}>{attendancePercent.overallPercentage}%</span>
                    </div>
                    <Progress value={attendancePercent.overallPercentage} className="h-3" />
                  </div>
                 <div className="space-y-2">
  {attendancePercent.subjectBreakdown
    ?.filter((s: any) => s.percentage < 75)
    .map((s:any, index:number) => (
      <div
        key={`${s.subjectId}-${index}`}
        className="text-xs rounded-md p-2 bg-amber-500/10 border border-amber-500/20"
      >
  
        <span className="font-medium">{s.subjectName}</span>
        <br />
      

Attendance: {s.percentage}% • Need to attend{" "}
<span className="font-bold text-amber-500">
  {Math.ceil(
    (0.75 * s.totalSessions - s.attendedSessions) / 0.25
  )}
</span>{" "}
more classes to reach 75% attendance
      </div>
    ))}

  {attendancePercent.subjectBreakdown?.length > 0 &&
    attendancePercent.subjectBreakdown.every(
      (s: any) => s.percentage >= 75
    ) && (
      <p className="text-xs text-emerald-500">
        ✅ All subjects meet the 75% attendance requirement
      </p>
    )}
</div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{attendancePercent.attendedSessions}</p>
                      <p className="text-xs text-muted-foreground">Attended</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-amber-600">{attendancePercent.totalSessions - attendancePercent.attendedSessions}</p>
                      <p className="text-xs text-muted-foreground">Missed</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card> 

        {/* QR Code Input */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><QrCode className="w-5 h-5 text-emerald-600" /> Mark Attendance</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  placeholder="Enter QR code token..."
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && markAttendance()}
                  className="flex-1"
                />
                <Button onClick={markAttendance} disabled={marking || !qrInput.trim()} className="bg-emerald-700 hover:bg-emerald-800">
                  {marking ? 'Marking...' : <><CheckCircle className="w-4 h-4 mr-2" /> Mark</>}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Enter the QR code token provided by your teacher to mark attendance</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Attendance History */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-600" /> Attendance History</CardTitle>
              <Button variant="ghost" size="icon" onClick={loadStudentData}><RefreshCw className="w-4 h-4" /></Button>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto custom-scrollbar">
              {myRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No attendance records yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myRecords.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.session?.subject?.name || 'N/A'}</TableCell>
                        <TableCell>{format(new Date(r.markedAt), 'MMM d, h:mm a')}</TableCell>
                        <TableCell><Badge className="bg-emerald-600">Present</Badge></TableCell>
                      </TableRow>
                    ))}
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

  // Admin filter logic
  const adminFilteredSessions = sessions.filter((s) => {
    if (adminFilterDept !== 'all' && s.department?.id !== adminFilterDept) return false;
    if (adminFilterSemester !== 'all' && s.semester?.toString() !== adminFilterSemester) return false;
    return true;
  });

  // Admin stats
  const totalSessions = adminFilteredSessions.length;
  const activeSessions = adminFilteredSessions.filter((s) => s.isActive).length;
  const totalPresent = adminFilteredSessions.reduce((sum, s) => sum + (s._count?.records || 0), 0);
  const avgAttendance = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 10) / 10 : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Attendance Overview</h2>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-sky-500 to-blue-400" />
            <CardContent className="p-5 text-center">
              <p className="text-sm text-muted-foreground">Total Sessions</p>
              <p className="text-3xl font-bold">{totalSessions}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
            <CardContent className="p-5 text-center">
              <p className="text-sm text-muted-foreground">Active Sessions</p>
              <p className="text-3xl font-bold text-emerald-600">{activeSessions}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-400" />
            <CardContent className="p-5 text-center">
              <p className="text-sm text-muted-foreground">Avg Attendance</p>
              <p className="text-3xl font-bold text-amber-600">{avgAttendance}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={adminFilterDept} onValueChange={setAdminFilterDept}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={adminFilterSemester} onValueChange={setAdminFilterSemester}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Semester" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Semesters</SelectItem>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => <SelectItem key={s} value={s.toString()}>Semester {s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
{/* Apply PRC */}
<Card>
  <CardHeader>
    <CardTitle>Apply Corrected Present (PRC)</CardTitle>
  </CardHeader>

  <CardContent className="space-y-4">

    <Input
      placeholder="Student Roll Number"
      value={prcRollNumber}
      onChange={(e) => setPrcRollNumber(e.target.value)}
    />

    <Select
      value={prcSubject}
      onValueChange={setPrcSubject}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select Subject" />
      </SelectTrigger>

      <SelectContent>
        {subjects.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    <Input
      type="date"
      value={prcDate}
      onChange={(e) => setPrcDate(e.target.value)}
    />

    <Input
      placeholder="Reason"
      value={prcReason}
      onChange={(e) => setPrcReason(e.target.value)}
    />

    <Button
      onClick={applyPRC}
      className="w-full"
    >
      Apply PRC
    </Button>

  </CardContent>
</Card>
      {/* Sessions Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Attendance Sessions</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => exportSessionsCSV(adminFilteredSessions, 'admin-attendance-sessions.csv')} title="Export CSV">
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={loadAdminData}><RefreshCw className="w-4 h-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto custom-scrollbar">
            {adminLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-4 bg-muted rounded animate-pulse w-32" />
                    <div className="h-4 bg-muted rounded animate-pulse w-24" />
                    <div className="h-4 bg-muted rounded animate-pulse w-20" />
                    <div className="h-4 bg-muted rounded animate-pulse w-16" />
                    <div className="h-4 bg-muted rounded animate-pulse w-28" />
                    <div className="h-4 bg-muted rounded animate-pulse w-12" />
                    <div className="h-4 bg-muted rounded animate-pulse w-16" />
                  </div>
                ))}
              </div>
            ) : adminFilteredSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No attendance sessions found</p>
                <p className="text-sm mt-1">Try adjusting the filters or wait for sessions to be created</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Present</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminFilteredSessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.subject?.name || 'N/A'}</TableCell>
                      <TableCell>{s.teacher?.user?.name || 'N/A'}</TableCell>
                      <TableCell>{s.department?.name || 'N/A'}</TableCell>
                      <TableCell>{s.semester} / {s.section}</TableCell>
                      <TableCell>{format(new Date(s.startedAt), 'MMM d, h:mm a')}</TableCell>
                      <TableCell>{s._count?.records || 0}</TableCell>
                      <TableCell>
                        <Badge variant={s.isActive ? 'default' : 'secondary'} className={s.isActive ? 'bg-emerald-600 flex items-center gap-1.5' : ''}>
                          {s.isActive && (
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                            </span>
                          )}
                          {s.isActive ? 'Live' : 'Ended'}
                        </Badge>
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
  );
}
