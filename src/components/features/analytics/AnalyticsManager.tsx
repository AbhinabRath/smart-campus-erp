// =============================================================================
// Smart Campus ERP - Analytics Manager Component (Enhanced)
// =============================================================================
// Displays analytics with Recharts visualizations:
// - Summary stat cards (total sessions, avg attendance, etc.)
// - Attendance charts with bySubject breakdown
// - Marks distribution chart
// - Assignment completion chart
// - Department filter for admin/teacher
// - Student progress tab for student role
// =============================================================================

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, RefreshCw, Users, BookOpen, FileText, ClipboardCheck,
  TrendingUp, Target, Award, Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';

// Chart colors matching emerald theme
const CHART_COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#f59e0b', '#ef4444', '#8b5cf6'];
const DISTRIBUTION_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#059669', '#047857'];

// Backend response types
interface AttendanceAnalytics {
  totalSessions: number;
  totalRecords: number;
  avgAttendancePerSession: number;
  bySubject: Array<{
    subjectId: string;
    name: string;
    code: string;
    sessions: number;
    totalRecords: number;
    avgAttendance: number;
  }>;
}

interface MarksAnalytics {
  totalEntries: number;
  average: number;
  passRate: number;
  distribution: Array<{ label: string; count: number }>;
}

interface AssignmentAnalytics {
  totalAssignments: number;
  overallCompletionRate: number;
  assignments: Array<{
    assignmentId: string;
    title: string;
    subject: string;
    totalStudents: number;
    submissions: number;
    completionRate: number;
  }>;
}

interface StudentProgress {
  student: { id: string; rollNumber: string; semester: number; section: string };
  attendance: { totalSessions: number; attended: number; percentage: number };
  marks: {
    overallPercentage: number;
    byExamType: Record<string, { total: number; count: number; obtained: number; averagePercentage: number }>;
    records: Array<{
      id: string; marksObtained: number; totalMarks: number; examType: string;
      subject: { name: string; code: string };
    }>;
  };
}

interface Department { id: string; name: string; code: string; }

// Stat card component
function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="relative overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground truncate">{label}</p>
              {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Empty state component
function EmptyState({ icon: Icon, message, action }: {
  icon: React.ElementType; message: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground mb-2">{message}</p>
      {action}
    </div>
  );
}

export default function AnalyticsManager() {
  const { currentUser } = useAppStore();
  const role = currentUser?.role || 'student';

  const [attendanceData, setAttendanceData] = useState<AttendanceAnalytics | null>(null);
  const [marksData, setMarksData] = useState<MarksAnalytics | null>(null);
  const [assignmentData, setAssignmentData] = useState<AssignmentAnalytics | null>(null);
  const [studentProgress, setStudentProgress] = useState<StudentProgress | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState('all');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(role === 'student' ? 'progress' : 'attendance');
  const hasLoaded = useRef(false);
  const { toast } = useToast();

  // Fetch analytics data from backend API
  const loadData = async (deptId?: string) => {
    setLoading(true);
    try {
      const deptQuery = deptId && deptId !== 'all' ? `?departmentId=${deptId}` : '';

      const [attRes, marksRes, assignRes] = await Promise.all([
        api.get(`/analytics/attendance${deptQuery}`).catch(() => ({ data: { data: null } })),
        api.get(`/analytics/marks${deptQuery}`).catch(() => ({ data: { data: null } })),
        api.get(`/analytics/assignments${deptQuery}`).catch(() => ({ data: { data: null } })),
      ]);

      setAttendanceData(attRes.data.data || null);
      setMarksData(marksRes.data.data || null);
      setAssignmentData(assignRes.data.data || null);

      // Load student progress if student role
      if (role === 'student' && currentUser?.id) {
        try {
          const progRes = await api.get(`/analytics/students/${currentUser.id}/progress`);
          setStudentProgress(progRes.data.data || null);
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  // Load departments for filter
  useEffect(() => {
    if (role === 'admin' || role === 'teacher') {
      api.get('/departments').then((res) => setDepartments(res.data.data || [])).catch(() => {});
    }
  }, [role]);

  // Load data on mount (once)
  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    void (async () => {
      await loadData();
    })();
  }, []);

  const handleDeptFilter = (deptId: string) => {
    setSelectedDept(deptId);
    loadData(deptId);
  };

  // Export analytics report to CSV based on active tab
  const exportReport = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (activeTab === 'attendance' && attendanceData) {
      headers = ['Subject', 'Code', 'Sessions', 'Total Records', 'Avg Attendance'];
      rows = attendanceData.bySubject.map((s) => [
        s.name,
        s.code,
        s.sessions,
        s.totalRecords,
        `${s.avgAttendance.toFixed(1)}%`,
      ]);
    } else if (activeTab === 'marks' && marksData) {
      headers = ['Metric', 'Value'];
      rows = [
        ['Total Entries', marksData.totalEntries || 0],
        ['Average', `${marksData.average.toFixed(1)}%`],
        ['Pass Rate', `${marksData.passRate.toFixed(1)}%`],
        ...(marksData.distribution || []).map((d) => [d.label, d.count]),
      ];
    } else if (activeTab === 'assignments' && assignmentData) {
      headers = ['Assignment', 'Subject', 'Total Students', 'Submissions', 'Completion Rate'];
      rows = assignmentData.assignments.map((a) => [
        a.title,
        a.subject,
        a.totalStudents,
        a.submissions,
        `${a.completionRate.toFixed(1)}%`,
      ]);
    } else if (activeTab === 'progress' && studentProgress) {
      const { attendance: att, marks: mk } = studentProgress;
      headers = ['Student', 'Roll Number', 'Semester', 'Section', 'Attendance %', 'Attended', 'Total Sessions', 'Overall Marks %', 'Subject', 'Exam Type', 'Marks', 'Total Marks', 'Percentage'];
      rows = (mk.records || []).map((r) => [
        studentProgress.student.rollNumber,
        studentProgress.student.rollNumber,
        studentProgress.student.semester,
        studentProgress.student.section,
        `${att.percentage.toFixed(1)}%`,
        att.attended,
        att.totalSessions,
        `${mk.overallPercentage.toFixed(1)}%`,
        r.subject?.name || 'N/A',
        r.examType,
        r.marksObtained,
        r.totalMarks,
        `${((r.marksObtained / r.totalMarks) * 100).toFixed(1)}%`,
      ]);
    }

    if (headers.length === 0 || rows.length === 0) {
      toast({ title: 'No Data', description: 'No data available to export for this tab', variant: 'destructive' });
      return;
    }

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${rows.length} records exported successfully` });
  };

  // =====================================================================
  // Attendance Tab
  // =====================================================================
  const renderAttendanceTab = () => {
    if (!attendanceData) {
      return <EmptyState icon={ClipboardCheck} message="No attendance data available yet. Attendance analytics will appear once sessions are created." />;
    }

    const chartData = attendanceData.bySubject.map((s) => ({
      name: s.name,
      avgAttendance: Math.round(s.avgAttendance * 10) / 10,
      sessions: s.sessions,
      totalRecords: s.totalRecords,
    }));

    return (
      <div className="space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={ClipboardCheck} label="Total Sessions" value={attendanceData.totalSessions} color="bg-emerald-600" />
          <StatCard icon={Users} label="Total Records" value={attendanceData.totalRecords} color="bg-teal-600" />
          <StatCard icon={TrendingUp} label="Avg per Session" value={attendanceData.avgAttendancePerSession.toFixed(1)} color="bg-cyan-600" />
          <StatCard icon={BookOpen} label="Subjects" value={attendanceData.bySubject.length} color="bg-green-600" />
        </div>

        {/* Bar chart */}
        {chartData.length > 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Attendance by Subject</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 'auto']} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid var(--border)' }}
                      formatter={(value: number, name: string) => {
                        if (name === 'avgAttendance') return [`${value} avg`, 'Avg Attendance'];
                        return [value, name];
                      }}
                    />
                    <Bar dataKey="avgAttendance" fill="#059669" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <EmptyState icon={BookOpen} message="No subject-level attendance data yet." />
        )}
      </div>
    );
  };

  // =====================================================================
  // Marks Tab
  // =====================================================================
  const renderMarksTab = () => {
    if (!marksData) {
      return <EmptyState icon={FileText} message="No marks data available yet. Marks analytics will appear once grades are recorded." />;
    }

    return (
      <div className="space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard icon={FileText} label="Total Entries" value={marksData.totalEntries || 0} color="bg-emerald-600" />
          <StatCard icon={Target} label="Average" value={`${marksData.average.toFixed(1)}%`} color="bg-teal-600" />
          <StatCard icon={Award} label="Pass Rate" value={`${marksData.passRate.toFixed(1)}%`} color="bg-cyan-600" />
        </div>

        {/* Distribution chart */}
        {marksData.distribution && marksData.distribution.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Marks Distribution</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={marksData.distribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)' }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {marksData.distribution.map((_, index) => (
                          <Cell key={index} fill={DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Target className="w-5 h-5" /> Pass/Fail Ratio</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Pass', value: Math.round((marksData.passRate / 100) * (marksData.totalEntries || 0)) },
                          { name: 'Fail', value: Math.round(((100 - marksData.passRate) / 100) * (marksData.totalEntries || 0)) },
                        ]}
                        cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        ) : (
          <EmptyState icon={BarChart3} message="No marks distribution data available." />
        )}
      </div>
    );
  };

  // =====================================================================
  // Assignments Tab
  // =====================================================================
  const renderAssignmentTab = () => {
    if (!assignmentData) {
      return <EmptyState icon={FileText} message="No assignment data available yet. Analytics will appear once assignments are created." />;
    }

    const chartData = assignmentData.assignments.map((a) => ({
      name: a.title.length > 20 ? a.title.slice(0, 20) + '...' : a.title,
      completionRate: Math.round(a.completionRate),
      submissions: a.submissions,
      totalStudents: a.totalStudents,
    }));

    return (
      <div className="space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard icon={FileText} label="Total Assignments" value={assignmentData.totalAssignments} color="bg-emerald-600" />
          <StatCard icon={Target} label="Avg Completion" value={`${assignmentData.overallCompletionRate.toFixed(1)}%`} color="bg-teal-600" />
          <StatCard icon={TrendingUp} label="Submissions" value={assignmentData.assignments.reduce((s, a) => s + a.submissions, 0)} color="bg-cyan-600" />
        </div>

        {chartData.length > 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Completion Rate by Assignment</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)' }} formatter={(value: number) => [`${value}%`, 'Completion Rate']} />
                    <Bar dataKey="completionRate" fill="#059669" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.completionRate >= 70 ? '#10b981' : entry.completionRate >= 40 ? '#f59e0b' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <EmptyState icon={BarChart3} message="No assignments created yet." />
        )}
      </div>
    );
  };

  // =====================================================================
  // Student Progress Tab (student only)
  // =====================================================================
  const renderProgressTab = () => {
    if (!studentProgress) {
      return <EmptyState icon={TrendingUp} message="No progress data available yet. Your progress will appear once you have attendance and marks records." />;
    }

    const { attendance, marks } = studentProgress;

    // Build chart data from marks records
    const marksBySubject = (marks.records || []).reduce<Record<string, { name: string; percentage: number }>>((acc, m) => {
      const key = m.subject?.code || m.subject?.name || 'Unknown';
      if (!acc[key] || m.marksObtained / m.totalMarks > acc[key].percentage / 100) {
        acc[key] = {
          name: m.subject?.name || 'Unknown',
          percentage: Math.round((m.marksObtained / m.totalMarks) * 100),
        };
      }
      return acc;
    }, {});

    const subjectChart = Object.values(marksBySubject);

    // Exam type chart data
    const examTypeData = Object.entries(marks.byExamType || {}).map(([type, data]) => ({
      name: type.replace(/(\d)/, ' $1'),
      average: Math.round(data.averagePercentage * 10) / 10,
    }));

    return (
      <div className="space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={ClipboardCheck} label="Attendance %" value={`${attendance.percentage.toFixed(1)}%`} sub={`${attendance.attended}/${attendance.totalSessions} sessions`} color="bg-emerald-600" />
          <StatCard icon={Target} label="Overall Marks" value={`${marks.overallPercentage.toFixed(1)}%`} color="bg-teal-600" />
          <StatCard icon={BookOpen} label="Semester" value={studentProgress.student.semester} sub={`Section ${studentProgress.student.section}`} color="bg-cyan-600" />
          <StatCard icon={Award} label="Exam Types" value={Object.keys(marks.byExamType || {}).length} color="bg-green-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Subject-wise marks */}
          {subjectChart.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Subject-wise Performance</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={subjectChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)' }} formatter={(value: number) => [`${value}%`, 'Score']} />
                      <Bar dataKey="percentage" radius={[6, 6, 0, 0]}>
                        {subjectChart.map((entry, index) => (
                          <Cell key={index} fill={entry.percentage >= 70 ? '#10b981' : entry.percentage >= 40 ? '#f59e0b' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Exam type comparison */}
          {examTypeData.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Performance by Exam Type</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={examTypeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)' }} formatter={(value: number) => [`${value}%`, 'Average']} />
                      <Line type="monotone" dataKey="average" stroke="#059669" strokeWidth={3} dot={{ r: 6, fill: '#059669' }} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {subjectChart.length === 0 && examTypeData.length === 0 && (
          <EmptyState icon={BarChart3} message="No marks data to chart yet." />
        )}
      </div>
    );
  };

  // =====================================================================
  // Loading skeletons
  // =====================================================================
  const renderSkeletons = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
      <Skeleton className="h-[400px] rounded-lg" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
        <div className="flex items-center gap-3">
          {/* Department filter for admin/teacher */}
          {(role === 'admin' || role === 'teacher') && departments.length > 0 && (
            <Select value={selectedDept} onValueChange={handleDeptFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={exportReport} className="gap-1.5">
            <Download className="w-4 h-4" /> Export Report
          </Button>
          <Button variant="ghost" size="icon" onClick={() => loadData(selectedDept)}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="marks">Marks</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          {role === 'student' && <TabsTrigger value="progress">My Progress</TabsTrigger>}
        </TabsList>

        <TabsContent value="attendance">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {loading ? renderSkeletons() : renderAttendanceTab()}
          </motion.div>
        </TabsContent>

        <TabsContent value="marks">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {loading ? renderSkeletons() : renderMarksTab()}
          </motion.div>
        </TabsContent>

        <TabsContent value="assignments">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {loading ? renderSkeletons() : renderAssignmentTab()}
          </motion.div>
        </TabsContent>

        {role === 'student' && (
          <TabsContent value="progress">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {loading ? renderSkeletons() : renderProgressTab()}
            </motion.div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
