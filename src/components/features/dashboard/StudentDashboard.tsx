// =============================================================================
// Smart Campus ERP - Student Dashboard (Enhanced with GPA & AI Study Assistant)
// =============================================================================
// Displays student-specific overview: circular attendance indicator,
// subject-wise marks bar chart, upcoming deadline cards with countdown,
// GPA calculator card, AI study assistant card, and visually prominent recommendations.
// =============================================================================

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardCheck, FileText, FileUp, Bell, Lightbulb, Calendar, TrendingUp, ArrowRight, Clock, AlertTriangle,
  BookOpen, GraduationCap, Target, Zap, Award, Brain,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api';
import { format, differenceInHours, differenceInDays } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

interface StudentData {
  student: { name: string; rollNumber: string; semester: number; section: string; department: { name: string; code: string } };
  attendance: { percentage: number; totalSessions: number; attended: number; subjectAttendance: Array<{
  subject: string;
  attended: number;
  total: number;
  percentage: number;
  classesNeeded: number;
}>; };
  marks: {
    percentage: number;
    totalSubjects: number;
    recentMarks: Array<{
      id: string;
      examType: string;
      marksObtained: number;
      totalMarks: number;
      subject: { name: string; code: string };
    }>;
  };
  assignments: Array<{
    id: string; title: string; deadline: string; maxMarks: number;
    subject: { name: string };
  }>;
  notices: Array<{
    id: string; title: string; priority: string; isPinned: boolean; createdAt: string; targetRole: string;
  }>;
  
}

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const marksChartConfig: ChartConfig = {
  marks: { label: 'Marks %', color: 'oklch(0.47 0.16 155)' },
};

// Circular Progress Indicator for Attendance
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

// Countdown display for deadline
function DeadlineCountdown({ deadline }: { deadline: string }) {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const hoursLeft = differenceInHours(deadlineDate, now);
  const daysLeft = differenceInDays(deadlineDate, now);
  const isOverdue = hoursLeft < 0;
  const isUrgent = !isOverdue && hoursLeft < 48;

  return (
    <div className={`flex items-center gap-1 text-xs font-medium ${isOverdue ? 'text-destructive' : isUrgent ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
      {isOverdue ? (
        <>
          <AlertTriangle className="w-3 h-3" />
          Overdue
        </>
      ) : daysLeft > 0 ? (
        <>
          <Clock className="w-3 h-3" />
          {daysLeft}d {hoursLeft % 24}h left
        </>
      ) : (
        <>
          <Clock className="w-3 h-3" />
          {hoursLeft}h left
        </>
      )}
    </div>
  );
}

// Simplified 10-point GPA scale converter
function marksToGPA(percentage: number): number {
  if (percentage >= 90) return 10;
  if (percentage >= 80) return 9;
  if (percentage >= 70) return 8;
  if (percentage >= 60) return 7;
  if (percentage >= 50) return 6;
  if (percentage >= 45) return 5;
  if (percentage >= 40) return 4;
  return 0;
}

function gradeLabel(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 45) return 'D';
  if (percentage >= 40) return 'E';
  return 'F';
}

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A+': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'A': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'B+': return 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400';
    case 'B': return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400';
    case 'C': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    case 'D': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    case 'E': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'F': return 'bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-300';
    default: return 'bg-muted text-muted-foreground';
  }
}



export default function StudentDashboard() {
  const { setView } = useAppStore();
  const [data, setData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/student').then((res) => setData(res.data.data)).finally(() => setLoading(false));
  }, []);

  // Simulated subject-wise marks data for the bar chart
  const marksChartData = useMemo(() => {
  if (!data?.marks?.recentMarks) return [];

  return data.marks.recentMarks.map((m) => ({
    subject:
      m.subject?.name?.length > 8
        ? m.subject.name.substring(0, 8) + '.'
        : m.subject?.name || 'Unknown',

    marks: Math.round(
      (m.marksObtained / m.totalMarks) * 100
    ),
  }));
}, [data]);

  // GPA Calculation
  const gpaData = useMemo(() => {
    if (!data) return { gpa: 0, grades: { 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0, 'F': 0 }, totalCourses: 0 };

    const recentMarks = data.marks.recentMarks || [];
   if (recentMarks.length === 0) {
  return {
    gpa: 0,
    grades: {
      'A+': 0,
      'A': 0,
      'B+': 0,
      'B': 0,
      'C': 0,
      'D': 0,
      'E': 0,
      'F': 0,
    },
    totalCourses: 0,
  };
}

    const totalGPA = recentMarks.reduce((sum, m) => {
      const pct = (m.marksObtained / m.totalMarks) * 100;
      return sum + marksToGPA(pct);
    }, 0);

    const grades: Record<string, number> = { 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0, 'F': 0 };
    recentMarks.forEach((m) => {
      const pct = (m.marksObtained / m.totalMarks) * 100;
      const g = gradeLabel(pct);
      if (g in grades) grades[g]++;
    });

    return {
      gpa: Number((totalGPA / recentMarks.length).toFixed(2)),
      grades,
      totalCourses: recentMarks.length,
    };
  }, [data]);
  // AI study assistant tips based on attendance, marks, and assignments
const studyTips = useMemo(() => {
  if (!data) return [];

const tips: Array<{
  category: string;
  tip: string;
  priority: 'high' | 'medium' | 'low';
}> = [];

  // Attendance based
  if (data.attendance.percentage < 75) {
    tips.push({
      category: 'Attendance Alert',
      tip: `Your attendance is ${data.attendance.percentage}%. Attend more classes to reach the required 75%.`,
      priority: 'high',
    });
  }

  // Marks based
  if (data.marks.percentage < 60) {
    tips.push({
      category: 'Academic Performance',
      tip: 'Your average marks are below 60%. Spend more time on revision and practice.',
      priority: 'high',
    });
  }

  // Assignment based
  if (data.assignments.length > 0) {
    tips.push({
      category: 'Pending Assignments',
      tip: `You have ${data.assignments.length} pending assignments. Complete them before the deadline.`,
      priority: 'medium',
    });
  }
  // Weakest subject based
  if (data.marks.recentMarks?.length > 0) {
  const weakestSubject = data.marks.recentMarks.reduce(
    (lowest, current) => {
      const lowestPct =
        (lowest.marksObtained / lowest.totalMarks) * 100;

      const currentPct =
        (current.marksObtained / current.totalMarks) * 100;

      return currentPct < lowestPct
        ? current
        : lowest;
    }
  );

  const weakestPercentage = Math.round(
    (weakestSubject.marksObtained /
      weakestSubject.totalMarks) *
      100
  );

  tips.push({
    category: 'Weakest Subject',
    tip: `Your lowest scoring subject is ${weakestSubject.subject?.name || 'Unknown'} (${weakestPercentage}%). Spend extra study time on this subject this week.`,
    priority:
      weakestPercentage < 60
        ? 'high'
        : 'medium',
  });
}

  // Excellent student
  if (
    data.attendance.percentage >= 75 &&
    data.marks.percentage >= 75 &&
    data.assignments.length === 0
  ) {
    tips.push({
      category: 'Excellent Progress',
      tip: 'Great job. Maintain your performance and continue consistent study habits.',
      priority: 'low',
    });
  }

  return tips;
}, [data]);
  // Semester progress (assuming 8 semesters, student is in semester X)
  const semesterProgress = useMemo(() => {
    if (!data) return 0;
    return Math.round((data.student.semester / 8) * 100);
  }, [data]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-20 bg-muted rounded" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (!data) return <p className="text-muted-foreground">Failed to load dashboard data.</p>;
console.log('SUBJECT ATTENDANCE', data.attendance.subjectAttendance);
  const pendingAssignments = data.assignments;
  const attendanceColor = data.attendance.percentage >= 75 ? 'text-emerald-600' : data.attendance.percentage >= 50 ? 'text-amber-600' : 'text-red-600';

  const statCards = [
    { label: 'Attendance', value: `${data.attendance.percentage}%`, icon: ClipboardCheck, color: attendanceColor, bg: 'bg-emerald-50 dark:bg-emerald-950/30', sub: `${data.attendance.attended}/${data.attendance.totalSessions} sessions` },
    { label: 'Marks Average', value: `${data.marks.percentage}%`, icon: FileText, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-950/30', sub: `${data.marks.totalSubjects} subjects` },
    { label: 'Pending Work', value: pendingAssignments.length, icon: FileUp, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', sub: 'assignments due' },
    
  ];

  return (
    <div className="space-y-6">
      {/* Welcome message */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Welcome, {data.student.name}</h2>
        <p className="text-muted-foreground">
          {data.student.rollNumber} &middot; Semester {data.student.semester} &middot; {data.student.department.name}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <motion.div key={stat.label} {...fadeUp} transition={{ delay: idx * 0.1 }}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Attendance Circle + Marks Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Circular Attendance + Progress */}
        <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Attendance Overview</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setView('attendance')} className="gap-1">
                Details <ArrowRight className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <CircularProgress value={data.attendance.percentage} />
                <div className="flex-1 space-y-4 w-full">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Current Attendance</span>
                      <span className={attendanceColor}>{data.attendance.percentage}%</span>
                    </div>
                    <Progress value={data.attendance.percentage} className="h-3" />
                  </div>
                  <div className="space-y-2">
  {data.attendance.subjectAttendance
    ?.filter((s) => s.percentage < 75)
    .map((s) => (
      <div
        key={s.subject}
        className="text-xs rounded-md p-2 bg-amber-500/10 border border-amber-500/20"
      >
        <span className="font-medium">{s.subject}</span>
        <br />
        Attendance: {s.percentage}% • Need to attend{' '}
        <span className="font-bold text-amber-500">
          {s.classesNeeded}
        </span>{' '}
        more classes to reach 75%
      </div>
    ))}

  {data.attendance.subjectAttendance?.every(
    (s) => s.percentage >= 75
  ) && (
    <p className="text-xs text-emerald-500">
      ✅ All subjects meet the 75% attendance requirement
    </p>
  )}
</div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{data.attendance.attended}</p>
                      <p className="text-xs text-muted-foreground">Attended</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-amber-600">{data.attendance.totalSessions - data.attendance.attended}</p>
                      <p className="text-xs text-muted-foreground">Missed</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Subject-wise Marks Bar Chart */}
        <motion.div {...fadeUp} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Subject-wise Marks</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setView('marks')} className="gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <ChartContainer config={marksChartConfig} className="h-[280px] w-full">
                <BarChart data={marksChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="subject" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} domain={[0, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="marks" fill="var(--color-marks)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* GPA Calculator + AI Study Assistant Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GPA Calculator Card */}
        <motion.div {...fadeUp} transition={{ delay: 0.45 }}>
          <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/50 to-background dark:from-emerald-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" />
                GPA Calculator
              </CardTitle>
              <Badge variant="outline" className="text-xs border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400">
                10-point scale
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* GPA Score Display */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <svg width={80} height={80} className="-rotate-90">
                      <circle
                        cx={40}
                        cy={40}
                        r={32}
                        stroke="currentColor"
                        strokeWidth={8}
                        fill="none"
                        className="text-muted/20"
                      />
                      <motion.circle
                        cx={40}
                        cy={40}
                        r={32}
                        stroke="#10b981"
                        strokeWidth={8}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 32}
                        initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 32 * (1 - gpaData.gpa / 10) }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{gpaData.totalCourses > 0 ? gpaData.gpa : 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Cumulative GPA</p>
                    <p className="text-xs text-muted-foreground">Based on {gpaData.totalCourses} courses</p>
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${gradeColor(gradeLabel(gpaData.gpa * 10))}`}>
                        <GraduationCap className="w-3 h-3" />
                     {gpaData.totalCourses > 0
  ? `${gradeLabel(gpaData.gpa * 10)} Average`
  : 'No Marks'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grade Distribution */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Grade Distribution</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(gpaData.grades).map(([grade, count]) => (
                      count > 0 && (
                        <span
                          key={grade}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${gradeColor(grade)}`}
                        >
                          {grade}
                          <span className="opacity-70">×{count}</span>
                        </span>
                      )
                    ))}
                  </div>
                </div>

                {/* Semester Progress */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                      Semester Progress
                    </span>
                    <span className="text-muted-foreground">
                      Sem {data.student.semester}/8
                    </span>
                  </div>
                  <Progress value={semesterProgress} className="h-2.5" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {semesterProgress}% of program completed &middot; {8 - data.student.semester} semesters remaining
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Study Assistant Card */}
        <motion.div {...fadeUp} transition={{ delay: 0.5 }}>
          <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/50 to-background dark:from-amber-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-600" />
                AI Study Assistant
              </CardTitle>
              <Badge variant="outline" className="text-xs border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400">
                Rule-Based AI
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {studyTips.map((tip, index) => (
  <motion.div
    key={index}
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.3 }}
    className="p-3 rounded-lg border bg-muted/30"
  >
    <div className="flex items-center gap-2 mb-2">
      <Badge
        variant={
          tip.priority === 'high'
            ? 'destructive'
            : 'secondary'
        }
      >
        {tip.priority}
      </Badge>

      <span className="text-sm font-semibold">
        {tip.category}
      </span>
    </div>

    <p className="text-sm text-muted-foreground">
      {tip.tip}
    </p>
  </motion.div>
))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Deadline Cards + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines with Countdown */}
        <motion.div {...fadeUp} transition={{ delay: 0.55 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Upcoming Deadlines</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setView('assignments')} className="gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
              {pendingAssignments.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No pending assignments 🎉</p>
              ) : (
                pendingAssignments.slice(0, 5).map((a) => {
                  const isOverdue = new Date(a.deadline) < new Date();
                  const isUrgent = !isOverdue && differenceInHours(new Date(a.deadline), new Date()) < 48;
                  return (
                    <div
                      key={a.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        isOverdue ? 'bg-destructive/5 border-destructive/20' :
                        isUrgent ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' :
                        'bg-muted/50 border-transparent'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        isOverdue ? 'bg-destructive/10' : isUrgent ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-muted'
                      }`}>
                        <Calendar className={`w-5 h-5 ${
                          isOverdue ? 'text-destructive' : isUrgent ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.title}</p>
                        <p className="text-xs text-muted-foreground">{a.subject.name} &middot; Max {a.maxMarks} marks</p>
                        <DeadlineCountdown deadline={a.deadline} />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Notices */}
      <motion.div {...fadeUp} transition={{ delay: 0.7 }}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Recent Notices</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setView('notices')} className="gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
            {data.notices.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No notices</p>
            ) : (
              data.notices.slice(0, 5).map((notice) => (
                <div key={notice.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{notice.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(notice.createdAt), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <Badge
                    variant={notice.priority === 'urgent' ? 'destructive' : notice.priority === 'high' ? 'default' : 'secondary'}
                    className="text-xs shrink-0"
                  >
                    {notice.priority}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div {...fadeUp} transition={{ delay: 0.8 }}>
        <Card>
          <CardHeader><CardTitle className="text-lg font-semibold">Quick Actions</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Mark Attendance', view: 'attendance' as const, icon: ClipboardCheck, color: 'text-emerald-600' },
                { label: 'View Marks', view: 'marks' as const, icon: FileText, color: 'text-sky-600' },
                { label: 'Assignments', view: 'assignments' as const, icon: Calendar, color: 'text-amber-600' },
                
              ].map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2"
                  onClick={() => setView(action.view)}
                >
                  <action.icon className={`w-6 h-6 ${action.color}`} />
                  <span className="text-xs">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
