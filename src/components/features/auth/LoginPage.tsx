// =============================================================================
// Smart Campus ERP - Login Page Component (Enhanced)
// =============================================================================
// Two-column layout with animated left info panel and right login form.
// Features: animated particles, shimmer branding, validation states, remember me,
// grid background pattern, focus ring animations, role demo buttons with icons.
// =============================================================================

'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Mail, Lock, Loader2, AlertCircle,
  BookOpen, ClipboardCheck, BarChart3, Users, Shield, Sparkles,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api';

// Floating particles for background animation — enhanced with glow
function FloatingParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 6 + 2,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 10,
      glow: i % 5 === 0, // every 5th particle glows
    })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute rounded-full ${p.glow ? 'bg-emerald-300/20 shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'bg-white/10'}`}
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{
            y: [0, -30, 0, 20, 0],
            x: [0, 15, -10, 5, 0],
            opacity: [0.3, 0.7, 0.4, 0.8, 0.3],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// Geometric shapes for background decoration — enhanced with glow
function GeometricShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute top-[10%] right-[10%] w-24 h-24 border border-white/15 rounded-xl shadow-[0_0_16px_rgba(52,211,153,0.08)]"
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute bottom-[20%] left-[10%] w-16 h-16 border border-white/15 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.06)]"
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute top-[60%] right-[25%] w-20 h-20 border border-white/15 rotate-45"
        animate={{ rotate: [45, 135, 225, 315, 405] }}
        transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute top-[30%] left-[20%] w-12 h-12 border border-white/15 rounded-lg"
        animate={{ rotate: 360, scale: [1, 1.2, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

const features = [
  { icon: ClipboardCheck, label: 'Smart Attendance', desc: 'QR-based attendance tracking' },
  { icon: BarChart3, label: 'Real-time Analytics', desc: 'Data-driven insights' },
  { icon: Users, label: 'Role Management', desc: 'Admin, Teacher, Student portals' },
  { icon: BookOpen, label: 'Academic Tools', desc: 'Marks, assignments & materials' },
  { icon: Shield, label: 'Secure Platform', desc: 'Enterprise-grade security' },
  { icon: Sparkles, label: 'AI Recommendations', desc: 'Personalized learning paths' },
];

// Role demo config with distinct colors/icons
const roleDemos = [
  { label: 'Admin', email: 'admin@campus.edu', password: 'admin123', icon: Shield, color: 'from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700' },
  { label: 'Teacher', email: 'sarah.j@campus.edu', password: 'teacher123', icon: BookOpen, color: 'from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700' },
  { label: 'Student', email: 'alice.w@campus.edu', password: 'student123', icon: GraduationCap, color: 'from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [focused, setFocused] = useState({ email: false, password: false });
  const login = useAppStore((s) => s.login);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
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

  const quickLogin = async (quickEmail: string, quickPassword: string) => {
    setEmail(quickEmail);
    setPassword(quickPassword);
    setTouched({ email: true, password: true });
    setError('');
    setLoading(true);
    try {
      const loginRes = await api.post('/auth/login', { email: quickEmail, password: quickPassword });
      const sessionToken = loginRes.data?.data?.sessionToken;
      const meRes = await api.get('/auth/me');
      login(meRes.data.data, sessionToken);
    } catch {
      setError('Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Info & Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-900">
        <FloatingParticles />
        <GeometricShapes />

        {/* Grid background pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Shimmer overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_3s_ease-in-out_infinite]"
            style={{
              backgroundSize: '200% 100%',
              animation: 'shimmer 3s ease-in-out infinite',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 py-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Logo & Title */}
            <div className="flex items-center gap-4 mb-8">
              <motion.div
                className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.3)]"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <GraduationCap className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Smart Campus ERP</h1>
                <p className="text-emerald-200 text-sm">Academic Management Platform</p>
              </div>
            </div>

            {/* Tagline */}
            <p className="text-emerald-100 text-lg mb-10 max-w-md leading-relaxed">
              Empowering education with intelligent tools for attendance, analytics, and personalized learning experiences.
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4 mb-10">
              {features.map((feat, i) => (
                <motion.div
                  key={feat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  whileHover={{ scale: 1.03, y: -2 }}
                  className="flex items-start gap-3 bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10 transition-shadow hover:shadow-[0_0_12px_rgba(52,211,153,0.15)]"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <feat.icon className="w-4 h-4 text-emerald-200" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{feat.label}</p>
                    <p className="text-xs text-emerald-200/70">{feat.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Testimonial */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10 max-w-md"
            >
              <p className="text-emerald-100 text-sm italic mb-3">
                &ldquo;Smart Campus ERP has transformed how we manage our institution. Real-time insights and streamlined workflows have saved us countless hours.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/40 flex items-center justify-center text-xs font-bold text-white">
                  DR
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Dr. Rebecca Thompson</p>
                  <p className="text-xs text-emerald-200/60">Dean of Academic Affairs</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 relative">
        {/* Subtle background pattern for right panel */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile-only logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden justify-center">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <GraduationCap className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Smart Campus ERP</h1>
              <p className="text-xs text-muted-foreground">Academic Management Platform</p>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-card rounded-2xl shadow-lg border border-border p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
              <p className="text-muted-foreground text-sm mt-1">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg text-sm"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${focused.email ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@campus.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => { setTouched((t) => ({ ...t, email: true })); setFocused((f) => ({ ...f, email: false })); }}
                    onFocus={() => setFocused((f) => ({ ...f, email: true }))}
                    className={`pl-10 transition-all duration-200 ${
                      focused.email ? 'ring-2 ring-emerald-500/20 border-emerald-500' : ''
                    } ${
                      touched.email && !focused.email
                        ? isEmailValid
                          ? 'border-emerald-500 focus-visible:ring-emerald-500/30'
                          : 'border-destructive focus-visible:ring-destructive/30'
                        : ''
                    }`}
                    required
                    disabled={loading}
                  />
                  {touched.email && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isEmailValid ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <AlertCircle className="w-4 h-4 text-destructive" />
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
                {touched.email && !isEmailValid && email.length > 0 && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-destructive">
                    Please enter a valid email address
                  </motion.p>
                )}
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${focused.password ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => { setTouched((t) => ({ ...t, password: true })); setFocused((f) => ({ ...f, password: false })); }}
                    onFocus={() => setFocused((f) => ({ ...f, password: true }))}
                    className={`pl-10 transition-all duration-200 ${
                      focused.password ? 'ring-2 ring-emerald-500/20 border-emerald-500' : ''
                    } ${
                      touched.password && !focused.password
                        ? isPasswordValid
                          ? 'border-emerald-500 focus-visible:ring-emerald-500/30'
                          : 'border-destructive focus-visible:ring-destructive/30'
                        : ''
                    }`}
                    required
                    disabled={loading}
                  />
                  {touched.password && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isPasswordValid ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <AlertCircle className="w-4 h-4 text-destructive" />
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
                {touched.password && !isPasswordValid && password.length > 0 && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-destructive">
                    Password must be at least 6 characters
                  </motion.p>
                )}
              </div>

              {/* Remember me with tooltip */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  disabled={loading}
                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer flex items-center gap-1.5">
                        Remember me for 30 days
                        <Info className="w-3 h-3 text-muted-foreground/50" />
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Your session will stay active for 30 days on this device
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white h-11 shadow-md hover:shadow-lg transition-shadow"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Smart Campus ERP &copy; {new Date().getFullYear()} &middot; Academic Management Platform
          </p>
        </motion.div>
      </div>

      {/* Shimmer keyframes */}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
