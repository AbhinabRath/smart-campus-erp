// =============================================================================
// Smart Campus ERP - User Manager Component (Admin Only)
// =============================================================================
// CRUD operations for user management. Admin can create, edit, deactivate users
// with role filtering. Uses /api/users endpoints.
// =============================================================================

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, RefreshCw, Trash2, Edit, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { format } from 'date-fns';

interface UserItem {
  id: string; email: string; name: string; role: string; avatar: string | null; isActive: boolean;
  student?: { rollNumber: string; semester: number; department: { name: string } } | null;
  teacher?: { employeeId: string; designation: string; department: { name: string } } | null;
  createdAt: string;
}

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-amber-100 text-amber-800',
  teacher: 'bg-emerald-100 text-emerald-800',
  student: 'bg-sky-100 text-sky-800',
};

export default function UserManager() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('all');

  // Create form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // Create user
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      await api.post('/users', { name, email, password, role });
      toast({ title: 'Success', description: 'User created' });
      setCreateOpen(false);
      setName(''); setEmail(''); setPassword('');
      loadUsers();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast({ title: 'Error', description: axiosErr.response?.data?.message || 'Failed to create user', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  // Deactivate user
  const deactivateUser = async (id: string) => {
    try {
      await api.delete(`/users/${id}`);
      toast({ title: 'Deactivated', description: 'User has been deactivated' });
      loadUsers();
    } catch {
      toast({ title: 'Error', description: 'Failed to deactivate user', variant: 'destructive' });
    }
  };

  const filtered = filterRole === 'all' ? users : users.filter((u) => u.role === filterRole);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-700 hover:bg-emerald-800"><Plus className="w-4 h-4 mr-2" /> Add User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={creating} className="w-full bg-emerald-700 hover:bg-emerald-800">{creating ? 'Creating...' : 'Create User'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{users.filter((u) => u.role === 'student').length}</p><p className="text-xs text-muted-foreground">Students</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{users.filter((u) => u.role === 'teacher').length}</p><p className="text-xs text-muted-foreground">Teachers</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{users.filter((u) => u.role === 'admin').length}</p><p className="text-xs text-muted-foreground">Admins</p></CardContent></Card>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="teacher">Teacher</SelectItem>
            <SelectItem value="student">Student</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={loadUsers}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      {/* User Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="animate-pulse space-y-2 p-6">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-muted rounded" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-sm">{user.email}</TableCell>
                    <TableCell><Badge className={ROLE_STYLES[user.role]}>{user.role}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {user.student && `${user.student.rollNumber} · Sem ${user.student.semester} · ${user.student.department?.name}`}
                      {user.teacher && `${user.teacher.employeeId} · ${user.teacher.designation} · ${user.teacher.department?.name}`}
                      {user.role === 'admin' && 'System Administrator'}
                    </TableCell>
                    <TableCell><Badge variant={user.isActive ? 'default' : 'secondary'}>{user.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell>
                      {user.isActive && (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deactivateUser(user.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </TableCell>
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
