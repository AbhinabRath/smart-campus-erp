// =============================================================================
// Smart Campus ERP - Study Material Manager Component (Enhanced)
// =============================================================================
// Role-based study material management with:
// - File type icons (PDF, DOC, PPT, etc.) with color coding and distinct icons
// - Grid/list view toggle
// - File size display
// - "Recently Added" section with time badge
// =============================================================================

'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen, Upload, Download, Search, FileText, RefreshCw,
  LayoutGrid, List, Clock, File, FileImage, FileSpreadsheet, FileCode, Film, Archive,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api';
import { format, formatDistanceToNow, differenceInHours, differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Subject { id: string; name: string; code: string; }
interface Material {
  id: string; title: string; description: string | null; fileName: string; fileType: string; fileSize: number; downloads: number;
  subject: { name: string; code: string; id?: string }; teacher: { user: { name: string } };
  createdAt: string;
}

// File type config with distinct icons and colors
const FILE_TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; darkColor: string }> = {
  pdf: { icon: FileText, color: 'bg-red-100 text-red-700', darkColor: 'dark:bg-red-900/30 dark:text-red-400' },
  ppt: { icon: File, color: 'bg-orange-100 text-orange-700', darkColor: 'dark:bg-orange-900/30 dark:text-orange-400' },
  pptx: { icon: File, color: 'bg-orange-100 text-orange-700', darkColor: 'dark:bg-orange-900/30 dark:text-orange-400' },
  doc: { icon: FileText, color: 'bg-blue-100 text-blue-700', darkColor: 'dark:bg-blue-900/30 dark:text-blue-400' },
  docx: { icon: FileText, color: 'bg-blue-100 text-blue-700', darkColor: 'dark:bg-blue-900/30 dark:text-blue-400' },
  xls: { icon: FileSpreadsheet, color: 'bg-emerald-100 text-emerald-700', darkColor: 'dark:bg-emerald-900/30 dark:text-emerald-400' },
  xlsx: { icon: FileSpreadsheet, color: 'bg-emerald-100 text-emerald-700', darkColor: 'dark:bg-emerald-900/30 dark:text-emerald-400' },
  jpg: { icon: FileImage, color: 'bg-purple-100 text-purple-700', darkColor: 'dark:bg-purple-900/30 dark:text-purple-400' },
  png: { icon: FileImage, color: 'bg-purple-100 text-purple-700', darkColor: 'dark:bg-purple-900/30 dark:text-purple-400' },
  zip: { icon: Archive, color: 'bg-yellow-100 text-yellow-700', darkColor: 'dark:bg-yellow-900/30 dark:text-yellow-400' },
  mp4: { icon: Film, color: 'bg-pink-100 text-pink-700', darkColor: 'dark:bg-pink-900/30 dark:text-pink-400' },
  js: { icon: FileCode, color: 'bg-amber-100 text-amber-700', darkColor: 'dark:bg-amber-900/30 dark:text-amber-400' },
  py: { icon: FileCode, color: 'bg-sky-100 text-sky-700', darkColor: 'dark:bg-sky-900/30 dark:text-sky-400' },
};

const DEFAULT_FILE_CONFIG = { icon: File, color: 'bg-gray-100 text-gray-700', darkColor: 'dark:bg-gray-800/30 dark:text-gray-400' };

// Get time badge for recently added
function getTimeBadge(createdAt: string): string | null {
  const hours = differenceInHours(new Date(), new Date(createdAt));
  if (hours < 24) return `${hours}h ago`;
  const days = differenceInDays(new Date(), new Date(createdAt));
  if (days < 7) return `${days}d ago`;
  return null;
}

export default function MaterialManager() {
  const { currentUser } = useAppStore();
  const role = currentUser?.role || 'student';
  const { toast } = useToast();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Upload form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [matRes, subRes] = await Promise.all([api.get('/materials'), api.get('/subjects')]);
      setMaterials(matRes.data.data || []);
      setSubjects(subRes.data.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Teacher: Upload material
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !selectedSubject || !file) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('subjectId', selectedSubject);
      formData.append('file', file);
      await api.post('/materials', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast({ title: 'Success', description: 'Material uploaded' });
      setTitle(''); setDescription(''); setFile(null);
      loadData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast({ title: 'Error', description: axiosErr.response?.data?.message || 'Failed to upload', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  // Download material
  const downloadMaterial = (id: string, fileName: string) => {
    const url = `/api/materials/${id}/download?XTransformPort=3001`;
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const filtered = materials.filter((m) => {
    const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase()) || (m.subject?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesSubject = filterSubject === 'all' || m.subject?.id === filterSubject;
    return matchesSearch && matchesSubject;
  });

  // Recently added (last 7 days)
  const recentlyAdded = useMemo(() => {
    return materials.filter((m) => differenceInDays(new Date(), new Date(m.createdAt)) < 7)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [materials]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Study Materials</h2>
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

      {/* Recently Added Section */}
      {recentlyAdded.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Recently Added
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentlyAdded.slice(0, 5).map((m) => {
              const ftConfig = FILE_TYPE_CONFIG[m.fileType] || DEFAULT_FILE_CONFIG;
              const FileIcon = ftConfig.icon;
              const timeBadge = getTimeBadge(m.createdAt);
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="shrink-0 w-48"
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full" onClick={() => downloadMaterial(m.id, m.fileName)}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ftConfig.color} ${ftConfig.darkColor}`}>
                          <FileIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{m.title}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{m.subject?.name || 'N/A'}</p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="outline" className="text-[10px] uppercase">{m.fileType}</Badge>
                        {timeBadge && (
                          <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <Clock className="w-2.5 h-2.5 mr-0.5" /> {timeBadge}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Teacher Upload Form */}
      {role === 'teacher' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Upload className="w-5 h-5" /> Upload Material</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
                <div className="space-y-2"><Label>File</Label><Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} required accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.zip" /></div>
                <div className="flex items-end">
                  <Button type="submit" disabled={uploading} className="bg-emerald-700 hover:bg-emerald-800 shadow-sm hover:shadow-md transition-shadow">
                    {uploading ? 'Uploading...' : <><Upload className="w-4 h-4 mr-2" /> Upload</>}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search materials..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={loadData}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      {/* Materials Grid View */}
      {viewMode === 'grid' && (
        loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-32 bg-muted rounded" /></CardContent></Card>)}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No study materials found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((m, idx) => {
              const ftConfig = FILE_TYPE_CONFIG[m.fileType] || DEFAULT_FILE_CONFIG;
              const FileIcon = ftConfig.icon;
              return (
                <motion.div key={m.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                  <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 group">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${ftConfig.color} ${ftConfig.darkColor}`}>
                          <FileIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{m.title}</h3>
                          <p className="text-xs text-muted-foreground">{m.subject?.name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{m.teacher?.user?.name || 'Unknown'}</p>
                        </div>
                      </div>
                      {m.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{m.description}</p>}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs uppercase">{m.fileType}</Badge>
                          <Badge variant="outline" className="text-xs">{formatSize(m.fileSize)}</Badge>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => downloadMaterial(m.id, m.fileName)} className="gap-1 hover:text-emerald-600">
                          <Download className="w-3 h-3" /> {m.downloads}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(m.createdAt), 'MMM d, yyyy')}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )
      )}

      {/* Materials List View */}
      {viewMode === 'list' && (
        loading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded" />)}</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No study materials found</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filtered.map((m, idx) => {
                  const ftConfig = FILE_TYPE_CONFIG[m.fileType] || DEFAULT_FILE_CONFIG;
                  const FileIcon = ftConfig.icon;
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => downloadMaterial(m.id, m.fileName)}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${ftConfig.color} ${ftConfig.darkColor}`}>
                        <FileIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{m.title}</p>
                        <p className="text-xs text-muted-foreground">{m.subject?.name || 'N/A'} · {m.teacher?.user?.name || 'Unknown'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] uppercase">{m.fileType}</Badge>
                        <span className="text-xs text-muted-foreground">{formatSize(m.fileSize)}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Download className="w-3 h-3" /> {m.downloads}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
