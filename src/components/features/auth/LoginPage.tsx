// =============================================================================
// Smart Campus ERP - Login Page Component
// =============================================================================

'use client';

import React, { type FormEvent, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  BarChart3,
  ClipboardCheck,
  Shield,
  Sparkles,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api';

const features = [
  { icon: ClipboardCheck, label: 'Smart Attendance' },
  { icon: BarChart3, label: 'Real-time Analytics' },
  { icon: Shield, label: 'Secure Platform' },
  { icon: Sparkles, label: 'Academic Excellence' },
];

function NoticeTicker({ notices }: { notices: Array<{ id: string; title: string; content?: string }> }) {
  return (
    <div className="relative bg-slate-950/95 text-slate-100">
      <div className="
absolute
bottom-0
left-0
h-[3px]
w-full
bg-gradient-to-r
from-emerald-400
via-cyan-400
via-purple-500
to-pink-500
" />
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 text-sm text-slate-100 sm:px-6">
        <div className="flex shrink-0 items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/15 px-3 py-1.5 font-semibold uppercase tracking-[0.25em] text-emerald-200">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          NOTICE BOARD
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div className="notice-marquee flex items-center gap-6 whitespace-nowrap">
            {notices.length > 0
              ? [...notices.slice(0, 6), ...notices.slice(0, 6)].map((notice, index) => (
                  <span
                    key={`${notice.id}-${index}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/75 px-3 py-1.5 text-slate-200/90"
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    {notice.title}
                  </span>
                ))
              : (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/75 px-3 py-1.5 text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  No active notices
                </span>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [branding, setBranding] = useState<any>(null);
  const [publicNotices, setPublicNotices] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [focused, setFocused] = useState({ email: false, password: false });
  const login = useAppStore((s) => s.login);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = password.length >= 6;

  useEffect(() => {
    api.get('/branding')
      .then((res) => setBranding(res.data.data))
      .catch(() => {});

    api.get('/notices/public')
      .then((res) => setPublicNotices(res.data.data || []))
      .catch(() => setPublicNotices([]));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!isEmailValid || !isPasswordValid) return;
    setError('');
    setLoading(true);

    try {
      const loginRes = await api.post('/auth/login', { email, password });
      const sessionToken = loginRes.data?.data?.sessionToken;
      const meRes = await api.get('/auth/me');
      login(meRes.data.data, sessionToken);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-950 text-white">
      {branding?.loginBackground && (
        <img
          src={`http://localhost:3001${branding.loginBackground}`}
          alt="Campus background"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      <div className="absolute inset-0 bg-slate-950/45" />

<div className="absolute left-[-200px] top-[20%] h-[500px] w-[500px] rounded-full bg-cyan-500/20 blur-[180px]" />

<div className="absolute right-[-200px] bottom-[10%] h-[500px] w-[500px] rounded-full bg-purple-500/20 blur-[180px]" />

<div className="absolute left-[40%] top-[10%] h-[250px] w-[250px] rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),transparent_20%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.14),transparent_22%)] pointer-events-none" />

      <div className="relative z-10 flex h-screen w-full flex-col">
        <NoticeTicker notices={publicNotices} />

        <main className="flex flex-1 flex-col items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex w-full max-w-5xl flex-col items-center gap-0">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
             className="
relative
w-full
max-w-[520px]
rounded-[36px]
border
border-cyan-400/40
bg-slate-950/30
backdrop-blur-3xl
overflow-hidden
shadow-[0_0_80px_rgba(34,211,238,0.25)]
"
            >
              <div className="relative z-10 px-6 py-2">
                <div
className="
absolute
left-1/2
top-[120px]
-translate-x-1/2
w-[450px]
h-[180px]
bg-white/10
blur-[120px]
pointer-events-none
"
/>
              <div
  className="
  absolute
  inset-0
  bg-gradient-to-br
  from-cyan-500/10
  via-transparent
  to-purple-500/10
  pointer-events-none
  "
/>

<div className="
absolute
inset-0
rounded-[36px]
border
border-cyan-400/20
shadow-[0_0_40px_rgba(34,211,238,0.15)]
pointer-events-none
" />
              <div className="text-center">
              <div
className="
mx-auto
mb-1
flex
h-14
w-14
items-center
justify-center
rounded-[24px]
bg-gradient-to-br
from-cyan-500/20
to-emerald-500/20
border
border-cyan-400/30
shadow-[0_0_50px_rgba(34,211,238,0.3)]
"
>
                <GraduationCap className="h-7 w-7" />
              </div>
              <h1
className="
text-4xl
font-bold
tracking-tight
text-white
drop-shadow-[0_0_18px_rgba(255,255,255,0.35)]
sm:text-[52px]
"
>Smart Campus ERP</h1>
              <p className="mt-2 text-sm text-emerald-300">Academic Management Platform</p>
              <div className="mx-auto mt-6 h-px w-24 rounded-full bg-gradient-to-r from-emerald-400/80 via-white/40 to-sky-400/70" />
              <p className="mt-3 text-xl font-medium text-slate-100">Welcome back</p>
              <p className="mt-2 text-sm text-slate-400">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <AnimatePresence>
                {error ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <div className="space-y-3">
                <Label htmlFor="email" className="text-sm text-slate-200">Email Address</Label>
                <div className="relative">
                  <Mail className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ${focused.email ? 'text-emerald-300' : ''}`} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@campus.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocused((prev) => ({ ...prev, email: true }))}
                    onBlur={() => { setTouched((prev) => ({ ...prev, email: true })); setFocused((prev) => ({ ...prev, email: false })); }}
                    className={`w-full rounded-2xl border px-4 py-4 pl-12 text-sm text-white transition-all duration-200 ${focused.email ? 'border-emerald-400 bg-slate-900/90 ring-2 ring-emerald-500/20' : 'border-slate-500/30 bg-slate-950/40 '} ${touched.email && !isEmailValid ? 'border-destructive ring-1 ring-destructive/30' : ''}`}
                    disabled={loading}
                    required
                  />
                </div>
                {touched.email && !isEmailValid && email.length > 0 && (
                  <p className="text-xs text-destructive">Please enter a valid email address</p>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm text-slate-200">Password</Label>
                <div className="relative">
                  <Lock className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ${focused.password ? 'text-emerald-300' : ''}`} />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    placeholder="••••••••"
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused((prev) => ({ ...prev, password: true }))}
                    onBlur={() => { setTouched((prev) => ({ ...prev, password: true })); setFocused((prev) => ({ ...prev, password: false })); }}
                    className={`w-full rounded-2xl border px-4 py-4 pl-12 text-sm text-white transition-all duration-200 ${focused.password ? 'border-emerald-400 bg-slate-900/90 ring-2 ring-emerald-500/20' : 'border-slate-500/30 bg-slate-950/40 backdrop-blur-md'} ${touched.password && !isPasswordValid ? 'border-destructive ring-1 ring-destructive/30' : ''}`}
                    disabled={loading}
                    required
                  />
                  <button
  type="button"
  onClick={() => setShowPassword(!showPassword)}
  className="
    absolute
    right-4
    top-1/2
    -translate-y-1/2
    text-slate-400
    hover:text-emerald-300
    transition-colors
  "
>
  {showPassword ? (
    <EyeOff className="h-4 w-4" />
  ) : (
    <Eye className="h-4 w-4" />
  )}
</button>
                </div>
                {touched.password && !isPasswordValid && password.length > 0 && (
                  <p className="text-xs text-destructive">Password must be at least 6 characters</p>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    disabled={loading}
                    className="data-[state=checked]:border-emerald-400 data-[state=checked]:bg-emerald-400"
                  />
                  <Label htmlFor="remember" className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                    Remember me for 30 days
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/5 text-slate-300 transition hover:bg-white/10">
                            <Info className="h-3 w-3" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Your session will stay active for 30 days on this device
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                </div>
              </div>

              <Button
                type="submit"
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-6 py-4 text-base font-semibold text-white shadow-2xl shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>
            </form>

<p className="mt-4 text-center text-xs text-slate-400">
                Smart Campus ERP · {new Date().getFullYear()} · Academic Management Platform
              </p>
              </div>
            </motion.div>

            <div
className="
w-full
max-w-[900px]
mt-4
z-0
"
>
              <div
className="
grid
w-full
md:grid-cols-4
overflow-hidden
rounded-[28px]
border
border-white/10
bg-slate-950/45
backdrop-blur-xl
shadow-[0_0_40px_rgba(34,211,238,0.12)]
pointer-events-none
"
>
                {features.map((feature) => (
                  <div
key={feature.label}
className="
flex
items-center
gap-3
px-5
py-5
border-r
border-white/10
last:border-r-0
"
>
                    <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-900/70 text-emerald-300 shadow-[0_10px_30px_rgba(16,185,129,0.12)]">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-white">{feature.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

     {/* <style jsx global>{`
        @keyframes notice-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .notice-marquee {
          animation: notice-marquee 35s linear infinite;
        }
      `}</style>*/}
    </div>
  );
}

