// =============================================================================
// Smart Campus ERP - Recommendation Manager Component (Enhanced)
// =============================================================================
// Student-only component to view and manage personalized recommendations.
// Features: priority color coding, dismiss animation, mark all read with count
// badge, category icons for each recommendation type, dark mode support.
// =============================================================================

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, RefreshCw, Eye, Sparkles, AlertTriangle, BookOpen, Briefcase, ClipboardCheck, X, CheckCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { format, formatDistanceToNow } from 'date-fns';

interface Recommendation {
  id: string; type: string; title: string; description: string; actionUrl: string | null;
  priority: string; isRead: boolean; createdAt: string;
}

// Visual configuration for each recommendation type with dark mode
const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; darkBg: string; label: string }> = {
  attendance: { icon: ClipboardCheck, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50', darkBg: 'dark:bg-emerald-900/20', label: 'Attendance' },
  academic: { icon: BookOpen, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50', darkBg: 'dark:bg-sky-900/20', label: 'Academic' },
  assignment: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50', darkBg: 'dark:bg-amber-900/20', label: 'Assignment' },
  career: { icon: Briefcase, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50', darkBg: 'dark:bg-violet-900/20', label: 'Career' },
};

const PRIORITY_STYLES: Record<string, { badge: string; border: string; glow: string }> = {
  high: {
    badge: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    border: 'border-l-red-500 dark:border-l-red-400',
    glow: 'shadow-[0_0_8px_rgba(239,68,68,0.15)]',
  },
  medium: {
    badge: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    border: 'border-l-amber-500 dark:border-l-amber-400',
    glow: '',
  },
  low: {
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    border: 'border-l-emerald-500 dark:border-l-emerald-400',
    glow: '',
  },
};

export default function RecommendationManager() {
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Load recommendations from backend
  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/recommendations');
      const recData = res.data.data?.recommendations || res.data.data || [];
      setRecommendations(Array.isArray(recData) ? recData : []);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadRecommendations(); }, [loadRecommendations]);

  // Generate new recommendations using the rule-based engine
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/recommendations/generate');
      const count = res.data.data?.count || 0;
      toast({ title: 'Success', description: `${count} new recommendations generated` });
      loadRecommendations();
    } catch {
      toast({ title: 'Error', description: 'Failed to generate recommendations', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };
const handleClear = async () => {
  try {
    await api.delete('/recommendations/clear');

    toast({
      title: 'Success',
      description: 'Recommendations cleared'
    });

    loadRecommendations();
  } catch {
    toast({
      title: 'Error',
      description: 'Failed to clear recommendations',
      variant: 'destructive'
    });
  }
};
  // Mark a recommendation as read
  const markAsRead = async (id: string) => {
    try {
      await api.put(`/recommendations/${id}/read`);
      setRecommendations((prev) => prev.map((r) => r.id === id ? { ...r, isRead: true } : r));
    } catch { /* ignore */ }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    const unreadRecs = recommendations.filter((r) => !r.isRead);
    for (const rec of unreadRecs) {
      try {
        await api.put(`/recommendations/${rec.id}/read`);
      } catch { /* ignore */ }
    }
    setRecommendations((prev) => prev.map((r) => ({ ...r, isRead: true })));
    toast({ title: 'Done', description: 'All recommendations marked as read' });
  };

  // Dismiss recommendation (slide out animation)
  const dismissRec = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setRecommendations((prev) => prev.filter((r) => r.id !== id));
      setDismissed((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  };

  const unread = recommendations.filter((r) => !r.isRead);
  const read = recommendations.filter((r) => r.isRead);

  // Filter by type
  const filteredUnread = filter === 'all' ? unread : unread.filter((r) => r.type === filter);
  const filteredRead = filter === 'all' ? read : read.filter((r) => r.type === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Study Assistant</h2>
          <div className="mt-2">
  <Badge variant="outline">
    Rule-Based AI
  </Badge>
</div>
          <p className="text-muted-foreground">Rule-based academic guidance generated from academic performance data</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
  variant="outline"
  size="sm"
  onClick={handleClear}
>
  <RefreshCw className="w-4 h-4 mr-2" />
  Clear
</Button>
          {unread.length > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-1.5">
              <CheckCheck className="w-4 h-4" />
              Mark All Read
              <Badge className="bg-emerald-600 text-white text-[10px] h-4 px-1.5">{unread.length}</Badge>
            </Button>
          )}
          <Button onClick={handleGenerate} disabled={generating} className="bg-emerald-700 hover:bg-emerald-800 shadow-sm hover:shadow-md transition-shadow" size="sm">
            {generating ? 'Generating...' : <><Sparkles className="w-4 h-4 mr-2" /> Generate</>}
          </Button>
        </div>
      </div>

      {/* Type Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-emerald-700' : ''}
        >
          All ({recommendations.length})
        </Button>
        {Object.entries(TYPE_CONFIG).map(([type, config]) => {
          const count = recommendations.filter((r) => r.type === type).length;
          if (count === 0) return null;
          const Icon = config.icon;
          return (
            <Button
              key={type}
              variant={filter === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(type)}
              className={filter === type ? 'bg-emerald-700' : ''}
            >
              <Icon className="w-3 h-3 mr-1" />
              {config.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6"><div className="h-24 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No recommendations yet</p>
            <p className="text-sm mt-1">Click &quot;Generate&quot; to get personalized suggestions based on your performance</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Unread Recommendations */}
          <AnimatePresence>
            {filteredUnread.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  New Suggestions
                  <span className="inline-flex items-center justify-center h-5 px-1.5 text-xs font-bold bg-emerald-600 text-white rounded-full">
                    {filteredUnread.length}
                  </span>
                </h3>
                {filteredUnread.map((rec, idx) => {
                  const config = TYPE_CONFIG[rec.type] || TYPE_CONFIG.academic;
                  const Icon = config.icon;
                  const pStyle = PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES.medium;
                  const isDismissed = dismissed.has(rec.id);

                  return (
                    <motion.div
                      key={rec.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={isDismissed ? { opacity: 0, x: 100, height: 0 } : { opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 100, height: 0 }}
                      transition={{ delay: idx * 0.05, duration: 0.3 }}
                    >
                      <Card className={`hover:shadow-md transition-all border-l-4 ${pStyle.border} ${pStyle.glow} group ${config.darkBg}`}>
                        <CardContent className="p-5">
                          <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-lg ${config.bg} ${config.darkBg} flex items-center justify-center shrink-0`}>
                              <Icon className={`w-5 h-5 ${config.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h4 className="font-semibold">{rec.title}</h4>
                                <Badge className={`text-xs ${pStyle.badge}`}>
                                  {rec.priority}
                                </Badge>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {config.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{rec.description}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {formatDistanceToNow(new Date(rec.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => markAsRead(rec.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-8"
                                title="Mark as read"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => dismissRec(rec.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 hover:bg-destructive/10 hover:text-destructive"
                                title="Dismiss"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>

          {/* Read Recommendations */}
          {filteredRead.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-muted-foreground">Previous Suggestions</h3>
              {filteredRead.map((rec, idx) => {
                const config = TYPE_CONFIG[rec.type] || TYPE_CONFIG.academic;
                const Icon = config.icon;
                const pStyle = PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES.medium;
                return (
                  <motion.div
                    key={rec.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <Card className="opacity-60 hover:opacity-100 transition-opacity border-l-4 border-l-muted">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-lg ${config.bg} ${config.darkBg} flex items-center justify-center shrink-0`}>
                            <Icon className={`w-5 h-5 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h4 className="font-medium">{rec.title}</h4>
                              <Badge className={`text-xs ${pStyle.badge}`}>
                                {rec.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{rec.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(rec.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
