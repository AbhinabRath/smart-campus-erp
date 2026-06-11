// =============================================================================
// Smart Campus ERP - Subject Manager Component (Admin Only)
// =============================================================================
// CRUD operations for subject management. Admin can create subjects with
// department and semester assignment. View subjects with association info.
// =============================================================================

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Plus, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

interface Subject {
  id: string; name: string; code: string; semester: number; credits: number; type: string;
  department: { name: string; code: string };
  _count?: { marks: number; assignments: number; attendanceSessions: number };
}

interface Department { id: string; name: string; code: string; }

const TYPE_STYLES: Record<string, string> = {
  theory: 'bg-emerald-100 text-emerald-800',
  lab: 'bg-sky-100 text-sky-800',
  project: 'bg-violet-100 text-violet-800',
};

export default function SubjectManager() {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [semester, setSemester] = useState('3');
  const [credits, setCredits] = useState('3');
  const [type, setType] = useState('theory');
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, deptRes] = await Promise.all([api.get('/subjects'), api.get('/departments')]);
      setSubjects(subRes.data.data || []);
      setDepartments(deptRes.data.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Create subject
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !selectedDept) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      await api.post('/subjects', {
        name, code: code.toUpperCase(), departmentId: selectedDept,
        semester: parseInt(semester), credits: parseInt(credits), type,
      });
      toast({ title: 'Success', description: 'Subject created' });
      setName(''); setCode('');
      loadSubjects();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast({ title: 'Error', description: axiosErr.response?.data?.message || 'Failed to create subject', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  // Helper for loadSubjects (same as loadData but we just reuse)
  const loadSubjects = loadData;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Subject Management</h2>

      {/* Create Form */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Plus className="w-5 h-5" /> Add Subject</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1"><Label className="text-xs">Name</Label><Input placeholder="Database Management Systems" value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div className="space-y-1"><Label className="text-xs">Code</Label><Input placeholder="CS301" value={code} onChange={(e) => setCode(e.target.value)} required maxLength={10} /></div>
              <div className="space-y-1">
                <Label className="text-xs">Department</Label>
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Semester</Label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5,6,7,8].map((s) => <SelectItem key={s} value={s.toString()}>Semester {s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Credits</Label><Input type="number" value={credits} onChange={(e) => setCredits(e.target.value)} /></div>
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="theory">Theory</SelectItem>
                    <SelectItem value="lab">Lab</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end sm:col-span-2 md:col-span-3">
                <Button type="submit" disabled={creating} className="bg-emerald-700 hover:bg-emerald-800">
                  {creating ? 'Creating...' : 'Add Subject'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Subject Table */}
      <div className="flex justify-end">
        <Button variant="ghost" size="icon" onClick={loadData}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="animate-pulse space-y-2 p-6">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-muted rounded" />)}</div>
          ) : subjects.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No subjects yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-mono font-medium">{sub.code}</TableCell>
                    <TableCell>{sub.name}</TableCell>
                    <TableCell><Badge variant="outline">{sub.department?.name || 'N/A'}</Badge></TableCell>
                    <TableCell>Sem {sub.semester}</TableCell>
                    <TableCell>{sub.credits}</TableCell>
                    <TableCell><Badge className={TYPE_STYLES[sub.type] || TYPE_STYLES.theory}>{sub.type}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
