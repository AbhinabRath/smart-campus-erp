// =============================================================================
// Smart Campus ERP - Teacher Dashboard (Enhanced with Charts & Schedule)
// =============================================================================
// Shows teacher-specific overview: attendance trend chart, today's schedule,
// assignment submission progress bars, and quick actions.
// =============================================================================

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardCheck, FileUp, FileText, TrendingUp, Clock, ArrowRight, BookOpen, Bell, Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api';
import { format } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';

// Teacher dashboard data shape - matches the backend response
interface TeacherData {
  teacher: {
    name: string;
    employeeId: string;
    designation: string;
    department: { name: string; code: string };
  };
  activeSessions: Array<{
    id: string;
    startedAt: string;
    duration: number;
    qrDataUrl?: string;
    subject: { name: string; code: string };
    _count: { records: number };
  }>;
  assignments: Array<{
    id: string;
    title: string;
    deadline: string;
    subject: { name: string; code: string };
    _count: { submissions: number };
  }>;
  materials: Array<{
    id: string;
    title: string;
    fileType: string;
    createdAt: string;
  }>;
  marksCount: number;
  notices: Array<{
    id: string;
    title: string;
    priority: string;
    createdAt: string;
  }>;
  totalStudents: number;
  attendanceTrendData: Array<{
  day: string;
  present: number;
  absent: number;
}>;
  todaySchedule: Array<{
  id: string;
  periodNumber: number;
  roomNumber: string;
  startTime: string;
  endTime: string;
  subject: {
    name: string;
    code: string;
  };
  department: {
  code: string;
  name: string;
};

semester: number;
section: string;
}>;
}

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const attendanceChartConfig: ChartConfig = {
  present: { label: 'Present', color: 'oklch(0.47 0.16 155)' },
  absent: { label: 'Absent', color: 'oklch(0.5 0.2 30)' },
};





export default function TeacherDashboard() {
  const { setView } = useAppStore();
  const [data, setData] = useState<TeacherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/teacher')
     .then((res) => {
  console.log('ATTENDANCE DATA:', res.data.data.attendanceTrendData);
  setData(res.data.data);
})
      .catch((err) => console.error('Teacher dashboard error:', err))
      .finally(() => setLoading(false));
  }, []);

  // Loading skeleton while data is being fetched
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-20 bg-muted rounded" /></CardContent></Card>
        ))}
      </div>
    );
  }

  // Error state when data fails to load
  if (!data) return <p className="text-muted-foreground">Failed to load dashboard data.</p>;
  
  const todaySchedule = data.todaySchedule ?? [];

  // Stat cards data derived from the backend response
  const statCards = [
    { label: 'Active Sessions', value: data.activeSessions.length, icon: ClipboardCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { label: 'Total Students', value: data.totalStudents, icon: BookOpen, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-950/30' },
    { label: 'Assignments', value: data.assignments.length, icon: FileUp, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    { label: 'Marks Entries', value: data.marksCount, icon: FileText, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome message with teacher info */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Welcome, {data.teacher.name}</h2>
        <p className="text-muted-foreground">{data.teacher.designation} &middot; {data.teacher.department.name}</p>
      </div>

      {/* Stats Cards - Quick overview of key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <motion.div key={stat.label} {...fadeUp} transition={{ delay: idx * 0.1 }}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
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

      {/* Attendance Chart + Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend Chart */}
        <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Weekly Attendance</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setView('analytics')} className="gap-1">
                Analytics <ArrowRight className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <ChartContainer config={attendanceChartConfig} className="h-[250px] w-full">
                <LineChart data={data?.attendanceTrendData ?? []} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line type="monotone" dataKey="present" stroke="var(--color-present)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="absent" stroke="var(--color-absent)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} strokeDasharray="5 5" />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Today's Schedule */}
        <motion.div {...fadeUp} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Today&apos;s Schedule
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setView('timetable')} className="gap-1">
                Timetable <ArrowRight className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {todaySchedule.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">No classes scheduled today</p>
              ) : (
                todaySchedule.map((slot) => (
  <div
    key={slot.id}
    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
  >
    <div className="w-20 text-center shrink-0">
      <p className="text-xs font-semibold text-primary">
        {slot.startTime}
      </p>
      <p className="text-[10px] text-muted-foreground">
        {slot.endTime}
      </p>
    </div>

    <div className="w-px h-10 bg-border shrink-0" />

    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium truncate">
         {slot.department.code} • Sem {slot.semester} • Sec {slot.section}
      </p>
      <p className="text-xs text-muted-foreground">
        {slot.roomNumber}
      </p>
    </div>

    <Badge variant="outline" className="text-xs shrink-0">
      P{slot.periodNumber}
    </Badge>
  </div>
))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Assignment Submission Progress + Active Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assignment Submission Progress */}
        <motion.div {...fadeUp} transition={{ delay: 0.5 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Assignment Submissions</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setView('assignments')} className="gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 max-h-80 overflow-y-auto custom-scrollbar">
              {data.assignments.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">No assignments created yet</p>
              ) : (
                data.assignments.map((assignment) => {
                  const submissionRate = data.totalStudents > 0
                    ? Math.round((assignment._count.submissions / data.totalStudents) * 100)
                    : 0;
                  const isPastDeadline = new Date(assignment.deadline) < new Date();
                  return (
                    <div key={assignment.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{assignment.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {assignment.subject.name} &middot; Due {format(new Date(assignment.deadline), 'MMM d')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-sm font-semibold">{assignment._count.submissions}/{data.totalStudents}</span>
                          <Badge variant={isPastDeadline ? 'destructive' : 'secondary'} className="text-[10px]">
                            {isPastDeadline ? 'Closed' : 'Open'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={submissionRate} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-10 text-right">{submissionRate}%</span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Attendance Sessions */}
        <motion.div {...fadeUp} transition={{ delay: 0.6 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Active Sessions</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setView('attendance')} className="gap-1">
                Manage <ArrowRight className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {data.activeSessions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 bg-muted rounded-xl flex items-center justify-center">
                    <ClipboardCheck className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">No active sessions</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setView('attendance')}
                  >
                    Start a Session
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.activeSessions.map((session) => (
                    <div key={session.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                        <ClipboardCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{session.subject.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Started {format(new Date(session.startedAt), 'h:mm a')} &middot; {session._count.records} present
                        </p>
                      </div>
                      <Badge className="bg-emerald-600 shrink-0">Live</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Notices + Materials */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Notices */}
        <motion.div {...fadeUp} transition={{ delay: 0.7 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Recent Notices</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setView('notices')} className="gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {data.notices.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">No notices</p>
              ) : (
                <div className="space-y-3">
                  {data.notices.map((notice) => (
                    <div key={notice.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center shrink-0">
                        <Bell className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{notice.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(notice.createdAt), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <Badge
                        variant={notice.priority === 'urgent' ? 'destructive' : 'outline'}
                        className="text-xs shrink-0"
                      >
                        {notice.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Materials */}
        <motion.div {...fadeUp} transition={{ delay: 0.8 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Recent Materials</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setView('materials')} className="gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {data.materials.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">No materials uploaded yet</p>
              ) : (
                <div className="space-y-3">
                  {data.materials.map((material) => (
                    <div key={material.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{material.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {material.fileType.toUpperCase()} &middot; {format(new Date(material.createdAt), 'MMM d')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions - Shortcuts to common tasks */}
      <motion.div {...fadeUp} transition={{ delay: 0.9 }}>
        <Card>
          <CardHeader><CardTitle className="text-lg font-semibold">Quick Actions</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Take Attendance', view: 'attendance' as const, icon: ClipboardCheck, color: 'text-emerald-600' },
                { label: 'Upload Marks', view: 'marks' as const, icon: FileText, color: 'text-sky-600' },
                { label: 'Create Assignment', view: 'assignments' as const, icon: FileUp, color: 'text-amber-600' },
                { label: 'View Analytics', view: 'analytics' as const, icon: TrendingUp, color: 'text-violet-600' },
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
