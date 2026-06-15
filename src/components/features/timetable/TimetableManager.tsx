// =============================================================================
// Smart Campus ERP - Timetable Manager Component (Enhanced)
// =============================================================================
// Role-based timetable management:
// - Admin: Create/edit timetable entries with bulk creation
// - Teacher/Student: View timetable as grid (days × periods)
// Features: time slot labels, alternating day bg, color-coded subjects,
// current period indicator, compact list toggle, dark mode support.
// =============================================================================

'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Plus, RefreshCw, LayoutGrid, List, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Subject { id: string; name: string; code: string; }
interface Department { id: string; name: string; code: string; }
interface Teacher { id: string; user: { name: string }; employeeId: string; }
interface TimetableEntry {
  id: string; dayOfWeek: number; periodNumber: number; roomNumber: string; startTime: string; endTime: string;
  subject: { name: string; code: string };
  teacher: { user: { name: string }; employeeId: string };
  department: { id?: string; name: string; code: string };
  departmentId: string;
  semester: number; section: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
const PERIOD_TIMES = ['09:00', '09:50', '10:40', '11:30', '12:20', '13:40', '14:30', '15:20'];
const PERIOD_END_TIMES = ['09:50', '10:40', '11:30', '12:20', '13:10', '14:30', '15:20', '16:10'];

const DAY_COLORS = [
  'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
  'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800',
  'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
  'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800',
  'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800',
  'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800',
];

// Subject color mapping for consistent coloring
const SUBJECT_COLORS = [
  { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700' },
  { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-300 dark:border-sky-700' },
  { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700' },
  { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-300 dark:border-violet-700' },
  { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-300 dark:border-rose-700' },
  { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-300 dark:border-teal-700' },
  { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700' },
  { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-300 dark:border-pink-700' },
];

function useSubjectColorMap(entries: TimetableEntry[]) {
  return useMemo(() => {
    const map = new Map<string, number>();
    let idx = 0;
    entries.forEach((e) => {
      const key = e.subject?.name || '';
      if (key && !map.has(key)) {
        map.set(key, idx % SUBJECT_COLORS.length);
        idx++;
      }
    });
    return map;
  }, [entries]);
}

// Get current period number based on time
function getCurrentPeriod(entries: TimetableEntry[]): number | null {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const entry of entries) {
    const [sh, sm] = entry.startTime.split(':').map(Number);
    const [eh, em] = entry.endTime.split(':').map(Number);

    const start = sh * 60 + sm;
    const end = eh * 60 + em;

    if (currentMinutes >= start && currentMinutes < end) {
      return entry.periodNumber;
    }
  }

  return null;
}

// Get current day of week (1=Monday, 6=Saturday)
function getCurrentDayOfWeek(): number {
  const day = new Date().getDay();
  return day === 0 ? -1 : day; // Sunday = -1 (not in timetable)
}

export default function TimetableManager() {
  const { currentUser } = useAppStore();
  const role = currentUser?.role || 'student';
  const { toast } = useToast();

  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter state
  const [filterDept, setFilterDept] = useState('');
  const [filterSemester, setFilterSemester] = useState('3');
  const [filterSection, setFilterSection] = useState('A');

  // Create form state
  const [newEntry, setNewEntry] = useState({
    dayOfWeek: '1', periodNumber: '1', subjectId: '', teacherId: '', roomNumber: '',
  });
  const [creating, setCreating] = useState(false);

  const currentPeriod = getCurrentPeriod(entries);
  const currentDay = getCurrentDayOfWeek();

  const subjectColorMap = useSubjectColorMap(entries);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ttRes, deptRes, subRes] = await Promise.all([
        api.get('/timetables'),
        api.get('/departments'),
        api.get('/subjects'),
      ]);
      const ttData = ttRes.data.data;
      setEntries(Array.isArray(ttData) ? ttData : (ttData?.timetables || []));
      console.log("first timetable entry:", ttData?.timetables?.[0] || ttData?.[0]);
      setDepartments(deptRes.data.data || []);
      console.log("departments response:", deptRes.data);
console.log("departments data:", deptRes.data.data);
      setSubjects(subRes.data.data || []);

      // Load teachers for admin
      if (role === 'admin') {
        const usersRes = await api.get('/users', { params: { role: 'teacher' } });
        const teacherUsers = (usersRes.data.data || []).filter((u: { teacher: unknown }) => u.teacher);
        setTeachers(teacherUsers.map((u: { teacher: { id: string; employeeId: string }; id: string; name: string }) => ({
          id: u.teacher.id, user: { name: u.name }, employeeId: u.teacher.employeeId,
        })));
      }

      // Set default filter from student profile
      if (role === 'student' && currentUser?.student) {
        setFilterDept(currentUser.student.departmentId);
        setFilterSemester(currentUser.student.semester.toString());
        setFilterSection(currentUser.student.section);
      } else if ((deptRes.data.data || []).length > 0 && !filterDept) {
          setFilterDept(deptRes.data.data[0].id);
          }
    } catch { /* ignore */ }
    setLoading(false);
  }, [role, currentUser]);

  useEffect(() => { loadData(); }, [loadData]);

  // Admin: Create timetable entry
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filterDept || !newEntry.subjectId || !newEntry.teacherId) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const periodIdx = parseInt(newEntry.periodNumber) - 1;
      await api.post('/timetables', {
        departmentId: filterDept,
        semester: parseInt(filterSemester),
        section: filterSection,
        dayOfWeek: parseInt(newEntry.dayOfWeek),
        periodNumber: parseInt(newEntry.periodNumber),
        subjectId: newEntry.subjectId,
        teacherId: newEntry.teacherId,
        roomNumber: newEntry.roomNumber,
        startTime: PERIOD_TIMES[periodIdx] || '09:00',
        endTime: PERIOD_END_TIMES[periodIdx] || '09:50',
      });
      toast({ title: 'Success', description: 'Timetable entry created' });
      loadData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast({ title: 'Error', description: axiosErr.response?.data?.message || 'Failed to create entry', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };
console.log('filterDept:', filterDept);
console.log('filterSemester:', filterSemester);
console.log('filterSection:', filterSection);
console.log('entries count:', entries.length);
  // Filter timetable entries
 const filtered = entries.filter((e) => {
  return e.departmentId === filterDept &&
         e.semester === parseInt(filterSemester) &&
         e.section === filterSection;
});
console.log("filterDept:", filterDept);
console.log("first entry department:", entries[0]?.departmentId);
console.log("departments loaded:", departments.length);
console.log("filtered count:", filtered.length);
  // Dynamic periods from DB
const periods = [...new Set(
  filtered.map((e) => e.periodNumber)
)].sort((a, b) => a - b);

// Build grid dynamically
const grid: (TimetableEntry | null)[][] = DAYS.map((_, dayIdx) =>
  periods.map((period) =>
    filtered.find(
      (e) =>
        e.dayOfWeek === dayIdx + 1 &&
        e.periodNumber === period
    ) || null
  )
);

const periodInfo = periods.map((period) => {
  const entry = filtered.find(
    (e) => e.periodNumber === period
  );

  return {
    period,
    startTime: entry?.startTime ?? '--:--',
    endTime: entry?.endTime ?? '--:--',
  };
});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Timetable</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className={`h-8 rounded-none ${viewMode === 'grid' ? 'bg-emerald-700 hover:bg-emerald-800' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className={`h-8 rounded-none ${viewMode === 'list' ? 'bg-emerald-700 hover:bg-emerald-800' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterSemester} onValueChange={setFilterSemester}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>{[1,2,3,4,5,6,7,8].map((s) => <SelectItem key={s} value={s.toString()}>Sem {s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterSection} onValueChange={setFilterSection}>
          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>{['A','B','C'].map((s) => <SelectItem key={s} value={s}>Sec {s}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={loadData}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      {/* Admin: Create entry */}
      {role === 'admin' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Plus className="w-5 h-5" /> Add Entry</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Day</Label>
                  <Select value={newEntry.dayOfWeek} onValueChange={(v) => setNewEntry((p) => ({ ...p, dayOfWeek: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={(i + 1).toString()}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Period</Label>
                  <Select value={newEntry.periodNumber} onValueChange={(v) => setNewEntry((p) => ({ ...p, periodNumber: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PERIODS.map((p) => <SelectItem key={p} value={p.toString()}>P{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Subject</Label>
                  <Select value={newEntry.subjectId} onValueChange={(v) => setNewEntry((p) => ({ ...p, subjectId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                    <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.code}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Teacher</Label>
                  <Select value={newEntry.teacherId} onValueChange={(v) => setNewEntry((p) => ({ ...p, teacherId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Teacher" /></SelectTrigger>
                    <SelectContent>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.user.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Room</Label>
                  <Input value={newEntry.roomNumber} onChange={(e) => setNewEntry((p) => ({ ...p, roomNumber: e.target.value }))} placeholder="Room 301" />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={creating} className="bg-emerald-700 hover:bg-emerald-800 w-full">
                    {creating ? '...' : 'Add'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Timetable Grid View */}
      {viewMode === 'grid' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
            <CardContent className="p-4 overflow-x-auto">
              {loading ? (
                <div className="animate-pulse space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-muted rounded" />)}</div>
              ) : (
                <table className="w-full border-collapse min-w-[900px]">
                  <thead>
                    <tr>
                      <th className="p-2 text-left text-sm font-medium text-muted-foreground border-b w-20">Day</th>
                     {periodInfo.map((p) => (
                        <th key={p.period} className="p-2 text-center border-b">
                         <div className="text-xs font-medium text-foreground">P{p.period}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {p.startTime}
                          </div>
                          {currentPeriod === p.period && (
                            <div className="flex justify-center mt-0.5">
                              <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" /> NOW
                              </span>
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((day, dayIdx) => {
                      const isToday = currentDay === dayIdx + 1;
                      return (
                        <tr key={day} className={isToday ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : (dayIdx % 2 === 1 ? 'bg-muted/20' : '')}>
                          <td className={`p-2 font-medium text-sm border-b border-r ${DAY_COLORS[dayIdx]} rounded-l-lg`}>
                            <span>{day.slice(0, 3)}</span>
                            {isToday && (
                              <Badge className="ml-1 text-[9px] h-4 bg-emerald-600 text-white">Today</Badge>
                            )}
                          </td>
                          {grid[dayIdx].map((entry, periodIdx) => {
                            const isCurrentCell = isToday && currentPeriod === periodIdx + 1;
                            const subjectColorIdx = entry ? (subjectColorMap.get(entry.subject?.name || '') ?? 0) : 0;
                            const color = SUBJECT_COLORS[subjectColorIdx];
                            return (
                              <td key={periodIdx} className="p-1 border-b border-r last:border-r-0">
                                {entry ? (
                                  <div className={`rounded-lg p-2 shadow-sm text-center border ${color.bg} ${color.border} ${isCurrentCell ? 'ring-2 ring-emerald-500 ring-offset-1 animate-pulse' : ''}`}>
                                    <p className={`text-xs font-medium ${color.text}`}>{entry.subject?.name || 'N/A'}</p>
                                    <p className="text-[10px] text-muted-foreground">{entry.teacher?.user?.name || ''}</p>
                                    <Badge variant="outline" className="text-[10px] mt-1">{entry.roomNumber}</Badge>
                                  </div>
                                ) : (
                                  <div className={`h-12 rounded bg-muted/20 dark:bg-muted/10 ${isCurrentCell ? 'ring-1 ring-emerald-300 dark:ring-emerald-700' : ''}`} />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Compact List View */}
      {viewMode === 'list' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
            <CardContent className="p-4">
              {loading ? (
                <div className="animate-pulse space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-muted rounded" />)}</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No timetable entries found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {DAYS.map((day, dayIdx) => {
                    const dayEntries = filtered
                      .filter((e) => e.dayOfWeek === dayIdx + 1)
                      .sort((a, b) => a.periodNumber - b.periodNumber);
                    if (dayEntries.length === 0) return null;
                    const isToday = currentDay === dayIdx + 1;
                    return (
                      <div key={day}>
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isToday ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                          {day}
                          {isToday && <Badge className="text-[9px] h-4 bg-emerald-600 text-white">Today</Badge>}
                        </h3>
                        <div className="space-y-1">
                          {dayEntries.map((entry) => {
                            const isCurrentPeriod = isToday && currentPeriod === entry.periodNumber;
                            const subjectColorIdx = subjectColorMap.get(entry.subject?.name || '') ?? 0;
                            const color = SUBJECT_COLORS[subjectColorIdx];
                            return (
                              <motion.div
                                key={entry.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`flex items-center gap-3 p-2 rounded-lg border ${color.border} ${color.bg} ${isCurrentPeriod ? 'ring-2 ring-emerald-500' : ''}`}
                              >
                                <div className="w-16 text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {entry.startTime}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className={`text-sm font-medium ${color.text}`}>{entry.subject?.name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">{entry.teacher?.user?.name}</span>
                                <Badge variant="outline" className="text-[10px] shrink-0">{entry.roomNumber}</Badge>
                                {isCurrentPeriod && (
                                  <Badge className="text-[9px] bg-emerald-600 text-white shrink-0 flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                                    NOW
                                  </Badge>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
