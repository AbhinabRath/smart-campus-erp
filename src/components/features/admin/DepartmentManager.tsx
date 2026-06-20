// =============================================================================
// Smart Campus ERP - Department Manager Component (Admin Only)
// =============================================================================
// CRUD operations for department management. Admin can create and view departments
// with association info (students, teachers, subjects count).
// =============================================================================

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Building2, Plus, RefreshCw, Users, BookOpen, GraduationCap, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { format } from 'date-fns';

interface Department {
  id: string; name: string; code: string; createdAt: string;
  _count: { students: number; teachers: number; subjects: number };
}

export default function DepartmentManager() {
  const { toast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [creating, setCreating] = useState(false);

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/departments');
      setDepartments(res.data.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadDepartments(); }, [loadDepartments]);

  // Create department
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) {
      toast({ title: 'Error', description: 'Please fill name and code', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      await api.post('/departments', { name, code: code.toUpperCase() });
      toast({ title: 'Success', description: 'Department created' });
      setName(''); setCode('');
      loadDepartments();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast({ title: 'Error', description: axiosErr.response?.data?.message || 'Failed to create department', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };
const deleteDepartment = async (id: string) => {
  if (!confirm('Delete this department?')) return;

  try {
    await api.delete(`/departments/${id}`);

    toast({
      title: 'Success',
      description: 'Department deleted'
    });

    loadDepartments();
  } catch (err: unknown) {
    const axiosErr = err as {
      response?: { data?: { message?: string } };
    };

    toast({
      title: 'Error',
      description:
        axiosErr.response?.data?.message ||
        'Failed to delete department',
      variant: 'destructive',
    });
  }
};
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Department Management</h2>

      {/* Create Form */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Plus className="w-5 h-5" /> Add Department</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Name</Label>
                <Input placeholder="Computer Science" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-1 w-32">
                <Label className="text-xs">Code</Label>
                <Input placeholder="CS" value={code} onChange={(e) => setCode(e.target.value)} required maxLength={5} />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={creating} className="bg-emerald-700 hover:bg-emerald-800">
                  {creating ? 'Creating...' : 'Add'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Department List */}
      <div className="flex justify-end">
        <Button variant="ghost" size="icon" onClick={loadDepartments}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-32 bg-muted rounded" /></CardContent></Card>)}
        </div>
      ) : departments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No departments yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept, idx) => (
            <motion.div key={dept.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{dept.name}</h3>
                      <Badge variant="outline" className="mt-1">{dept.code}</Badge>
                    </div>
                    <div className="flex gap-2">
  <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
    <Building2 className="w-5 h-5 text-emerald-600" />
  </div>

  <Button
    size="icon"
    variant="ghost"
    className="text-red-500 hover:text-red-600"
    onClick={() => deleteDepartment(dept.id)}
  >
    <Trash2 className="w-4 h-4" />
  </Button>
</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-muted/50 rounded p-2">
                      <GraduationCap className="w-4 h-4 mx-auto text-sky-600" />
                      <p className="text-sm font-bold">{dept._count?.students || 0}</p>
                      <p className="text-[10px] text-muted-foreground">Students</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <Users className="w-4 h-4 mx-auto text-emerald-600" />
                      <p className="text-sm font-bold">{dept._count?.teachers || 0}</p>
                      <p className="text-[10px] text-muted-foreground">Teachers</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <BookOpen className="w-4 h-4 mx-auto text-amber-600" />
                      <p className="text-sm font-bold">{dept._count?.subjects || 0}</p>
                      <p className="text-[10px] text-muted-foreground">Subjects</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">Created {format(new Date(dept.createdAt), 'MMM d, yyyy')}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
