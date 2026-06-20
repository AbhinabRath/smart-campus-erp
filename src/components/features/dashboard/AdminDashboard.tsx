// =============================================================================
// Smart Campus ERP - Admin Dashboard (Enhanced with Charts & Activity Feed)
// =============================================================================
// Displays administrative overview: total users with sparkline trends,
// departments, attendance stats, recent activity feed with timeline,
// department performance comparisons, and data visualization charts.
// =============================================================================

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Building2, BookOpen, ClipboardCheck, TrendingUp, Activity, ArrowRight,
  Clock, FileText, Plane, Bell,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api';
import { format, formatDistanceToNow } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell,
  LineChart, Line, Legend,
} from 'recharts';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';

interface AdminData {
  userStats: { totalStudents: number; totalTeachers: number; totalAdmins: number; totalUsers: number };
  departments: Array<{ id: string; name: string; code: string; _count: { students: number; teachers: number; subjects: number } }>;
  totalSubjects: number;
 attendanceTrendData: Array<{
  day: string;
  present: number;
  absent: number;
}>;
departmentPerformance: Array<{
  department: string;
  avgAttendance: number;
  avgMarks: number;
}>;
  recentActivity: {
    attendanceSessions: Array<{
      id: string; startedAt: string; isActive: boolean; createdAt: string;
      teacher: { user: { name: string } }; subject: { name: string }; _count: { records: number };
    }>;
    notices: Array<{ id: string; title: string; priority: string; createdAt: string }>;
  };
  pendingLeaves: number;
}

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

// Chart color palette (emerald-themed)
const CHART_COLORS = [
  'oklch(0.47 0.16 155)',
  'oklch(0.6 0.15 160)',
  'oklch(0.55 0.12 50)',
  'oklch(0.65 0.18 80)',
  'oklch(0.5 0.2 30)',
];

const barChartConfig: ChartConfig = {
  students: { label: 'Students', color: 'oklch(0.47 0.16 155)' },
  teachers: { label: 'Teachers', color: 'oklch(0.6 0.15 160)' },
};

const pieChartConfig: ChartConfig = {
  students: { label: 'Students', color: 'oklch(0.47 0.16 155)' },
  teachers: { label: 'Teachers', color: 'oklch(0.6 0.15 160)' },
  admins: { label: 'Admins', color: 'oklch(0.55 0.12 50)' },
};

const lineChartConfig: ChartConfig = {
  present: { label: 'Attendance %', color: 'oklch(0.47 0.16 155)' },
  absent: { label: 'Absence %', color: 'oklch(0.5 0.2 30)' },
};
const deptAttendanceConfig: ChartConfig = {
  avgAttendance: { label: 'Avg Attendance %', color: 'oklch(0.47 0.16 155)' },
};

const deptMarksConfig: ChartConfig = {
  avgMarks: { label: 'Avg Marks %', color: 'oklch(0.6 0.15 160)' },
};

// Mini Sparkline component
function MiniSparkline({
  data,
  dataKey,
  color = 'oklch(0.47 0.16 155)',
  width = 80,
  height = 32,
}: {
  data: Array<Record<string, unknown>>;
  dataKey: string;
  color?: string;
  width?: number;
  height?: number;
}) {
  const values = data.map((d) => Number(d[dataKey]) || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Trend indicator component
function TrendIndicator({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
      {isPositive ? '+' : ''}{value}%
    </span>
  );
}

// Activity timeline item
function ActivityItem({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  time,
  badge,
  badgeVariant,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  time: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive';
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg relative group hover:bg-muted/70 transition-colors">
      {/* Timeline connector */}
      <div className="absolute left-[26px] top-[52px] bottom-[-12px] w-px bg-border" />
      <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0 mt-0.5 z-10`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
        <p className="text-[11px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {time}
        </p>
      </div>
      {badge && (
        <Badge variant={badgeVariant || 'secondary'} className="text-xs shrink-0 mt-0.5">
          {badge}
        </Badge>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { setView } = useAppStore();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
  try {
    const res = await api.get('/dashboard/admin');
    setData(res.data.data);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  loadDashboard();
}, []);
useEffect(() => {
  const refreshDashboard = () => {
    loadDashboard();
  };

  window.addEventListener('users-updated', refreshDashboard);

  return () => {
    window.removeEventListener('users-updated', refreshDashboard);
  };
}, []);

  // Prepare chart data from API data
  const deptChartData = useMemo(() => {
    if (!data) return [];
    return data.departments.map((dept) => ({
      department: dept.code,
      students: dept._count.students,
      teachers: dept._count.teachers,
    }));
  }, [data]);

  const roleChartData = useMemo(() => {
    if (!data) return [];
    return [
      { role: 'Students', value: data.userStats.totalStudents, fill: 'oklch(0.47 0.16 155)' },
      { role: 'Teachers', value: data.userStats.totalTeachers, fill: 'oklch(0.6 0.15 160)' },
      { role: 'Admins', value: data.userStats.totalAdmins, fill: 'oklch(0.55 0.12 50)' },
    ];
  }, [data]);

  // Simulated department performance data for comparison charts
  const deptPerformanceData = useMemo(() => {
  if (!data) return [];
  return data.departmentPerformance ?? [];
   }, [data]);

  // Build combined activity timeline
  const activityTimeline = useMemo(() => {
    if (!data) return [];
    const activities: Array<{
      id: string;
      type: 'attendance' | 'notice' | 'leave';
      icon: React.ElementType;
      iconBg: string;
      iconColor: string;
      title: string;
      subtitle: string;
      time: string;
      timestamp: Date;
      badge?: string;
      badgeVariant?: 'default' | 'secondary' | 'destructive';
    }> = [];

    data.recentActivity.attendanceSessions.forEach((session) => {
      activities.push({
        id: session.id,
        type: 'attendance',
        icon: ClipboardCheck,
        iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        title: `${session.teacher.user.name} — ${session.subject.name}`,
        subtitle: `${session._count.records} students marked present`,
        time: formatDistanceToNow(new Date(session.startedAt), { addSuffix: true }),
        timestamp: new Date(session.startedAt),
        badge: session.isActive ? 'Live' : 'Done',
        badgeVariant: session.isActive ? 'default' : 'secondary',
      });
    });

    data.recentActivity.notices.forEach((notice) => {
      activities.push({
        id: notice.id,
        type: 'notice',
        icon: Bell,
        iconBg: 'bg-amber-100 dark:bg-amber-900/30',
        iconColor: 'text-amber-600 dark:text-amber-400',
        title: notice.title,
        subtitle: 'New notice published',
        time: formatDistanceToNow(new Date(notice.createdAt), { addSuffix: true }),
        timestamp: new Date(notice.createdAt),
        badge: notice.priority,
        badgeVariant: notice.priority === 'urgent' ? 'destructive' : notice.priority === 'high' ? 'default' : 'secondary',
      });
    });

    // Add pending leave activity
    if (data.pendingLeaves > 0) {
      activities.push({
        id: 'pending-leaves',
        type: 'leave',
        icon: Plane,
        iconBg: 'bg-sky-100 dark:bg-sky-900/30',
        iconColor: 'text-sky-600 dark:text-sky-400',
        title: `${data.pendingLeaves} pending leave requests`,
        subtitle: 'Awaiting approval from admin',
        time: 'Action required',
        timestamp: new Date(),
        badge: `${data.pendingLeaves} pending`,
        badgeVariant: 'default',
      });
    }

    // Sort by timestamp descending
    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
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
  const attendanceTrendData = data.attendanceTrendData ?? [];
console.log("ATTENDANCE TREND DATA", attendanceTrendData);
  const statCards = [
    {
      label: 'Total Users',
      value: data.userStats.totalUsers,
      icon: Users,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      sparkKey: 'users',
    },
    {
      label: 'Students',
      value: data.userStats.totalStudents,
      icon: Users,
      color: 'text-sky-600',
      bg: 'bg-sky-50 dark:bg-sky-950/30',
      sparkKey: 'students',
    },
    {
      label: 'Departments',
      value: data.departments.length,
      icon: Building2,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      sparkKey: 'departments',
    },
    {
      label: 'Subjects',
      value: data.totalSubjects,
      icon: BookOpen,
      color: 'text-violet-600',
      bg: 'bg-violet-50 dark:bg-violet-950/30',
      sparkKey: 'subjects',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards with Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <motion.div key={stat.label} {...fadeUp} transition={{ delay: idx * 0.1 }}>
            <Card className="hover:shadow-md transition-shadow overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart - Students per Department */}
        <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Students by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={barChartConfig} className="h-[250px] w-full">
                <BarChart data={deptChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="department" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="students" fill="var(--color-students)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="teachers" fill="var(--color-teachers)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pie Chart - User Role Distribution */}
        <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">User Role Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={pieChartConfig} className="h-[250px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="role" />} />
                  <Pie
                    data={roleChartData}
                    dataKey="value"
                    nameKey="role"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={50}
                    paddingAngle={4}
                  >
                    {roleChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend content={<ChartLegendContent nameKey="role" />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Line Chart - Attendance Trends */}
        <motion.div {...fadeUp} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Attendance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={lineChartConfig} className="h-[250px] w-full">
                <LineChart data={attendanceTrendData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                 <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} domain={[0, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line type="monotone" dataKey="present" stroke="var(--color-present)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="absent" stroke="var(--color-absent)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} strokeDasharray="5 5" />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Department Performance Overview */}
      <motion.div {...fadeUp} transition={{ delay: 0.45 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Department Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Avg Attendance by Department */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Average Attendance by Department</h4>
                <ChartContainer config={deptAttendanceConfig} className="h-[200px] w-full">
                  <BarChart data={deptPerformanceData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis type="category" dataKey="department" tickLine={false} axisLine={false} fontSize={12} width={50} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="avgAttendance" fill="var(--color-avgAttendance)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>

              {/* Avg Marks by Department */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Average Marks by Department</h4>
                <ChartContainer config={deptMarksConfig} className="h-[200px] w-full">
                  <BarChart data={deptPerformanceData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis type="category" dataKey="department" tickLine={false} axisLine={false} fontSize={12} width={50} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="avgMarks" fill="var(--color-avgMarks)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Departments Overview */}
        <motion.div {...fadeUp} transition={{ delay: 0.5 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Departments</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setView('departments')} className="gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.departments.map((dept) => (
                <div key={dept.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{dept.name}</p>
                    <p className="text-xs text-muted-foreground">{dept.code} Department</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">{dept._count.students} students</Badge>
                    <Badge variant="outline" className="text-xs">{dept._count.subjects} subjects</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity Feed - Enhanced Timeline */}
        <motion.div {...fadeUp} transition={{ delay: 0.6 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                Recent Activity
              </CardTitle>
              <Badge variant="outline" className="text-xs">{activityTimeline.length} events</Badge>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
              {activityTimeline.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No recent activity</p>
              ) : (
                activityTimeline.map((activity) => (
                  <ActivityItem
                    key={activity.id}
                    icon={activity.icon}
                    iconBg={activity.iconBg}
                    iconColor={activity.iconColor}
                    title={activity.title}
                    subtitle={activity.subtitle}
                    time={activity.time}
                    badge={activity.badge}
                    badgeVariant={activity.badgeVariant}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div {...fadeUp} transition={{ delay: 0.7 }}>
        <Card>
          <CardHeader><CardTitle className="text-lg font-semibold">Quick Actions</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Manage Users', view: 'users' as const, icon: Users, color: 'text-emerald-600' },
                { label: 'View Attendance', view: 'attendance' as const, icon: ClipboardCheck, color: 'text-sky-600' },
                { label: 'Analytics', view: 'analytics' as const, icon: TrendingUp, color: 'text-amber-600' },
                { label: 'Post Notice', view: 'notices' as const, icon: Activity, color: 'text-violet-600' },
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
