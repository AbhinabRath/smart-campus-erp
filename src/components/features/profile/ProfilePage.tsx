// =============================================================================
// Smart Campus ERP - Profile Page Component (Enhanced)
// =============================================================================
// Displays user profile info, allows editing name/avatar, and password change.
// Features: gradient banner, avatar upload UI, form field focus animations,
// role-specific details, emerald accent theme.
// =============================================================================

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User, Mail, Shield, Save, KeyRound, Eye, EyeOff, Camera,
  BookOpen, Hash, Building2, GraduationCap, Briefcase, Upload,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { currentUser, login } = useAppStore();
  const { toast } = useToast();

  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editAvatar, setEditAvatar] = useState(currentUser?.avatar || '');
  const [guardianName, setGuardianName] = useState(
  currentUser?.student?.guardianName || ''
);

const [guardianPhone, setGuardianPhone] = useState(
  currentUser?.student?.guardianPhone || ''
);

const [researchArea, setResearchArea] = useState(
  currentUser?.teacher?.researchArea || ''
);

const [qualification, setQualification] = useState(
  currentUser?.teacher?.qualification || ''
);

const [officeRoom, setOfficeRoom] = useState(
  currentUser?.teacher?.officeRoom || ''
);

const [phoneNumber, setPhoneNumber] = useState(
  currentUser?.teacher?.phoneNumber || ''
);
const [bio, setBio] = useState(
  currentUser?.teacher?.bio || currentUser?.student?.bio || ''
);
  const [saving, setSaving] = useState(false);
  const [avatarHover, setAvatarHover] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Focus states for form animations
  const [focusedField, setFocusedField] = useState<string | null>(null);

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 lg:col-span-2 rounded-lg" />
        </div>
      </div>
    );
  }

  const role = currentUser.role;
  const initials = currentUser.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  // Save profile info
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
     if (!editName.trim()) {
  toast({
    title: 'Error',
    description: 'Name cannot be empty',
    variant: 'destructive'
  });
  return;
}

if (guardianPhone && !/^\d{10}$/.test(guardianPhone)) {
  toast({
    title: 'Error',
    description: 'Guardian phone must be exactly 10 digits',
    variant: 'destructive'
  });
  return;
}

if (phoneNumber && !/^\d{10}$/.test(phoneNumber)) {
  toast({
    title: 'Error',
    description: 'Phone number must be exactly 10 digits',
    variant: 'destructive'
  });
  return;
}

setSaving(true);
    try {
      await api.put(`/users/${currentUser.id}`, {
  name: editName,
  avatar: editAvatar || undefined,

  guardianName,
  guardianPhone,

  researchArea,
  qualification,
  officeRoom,
  phoneNumber,

  bio,
});
      login({ ...currentUser, name: editName, avatar: editAvatar || null });
      toast({ title: 'Success', description: 'Profile updated successfully' });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast({ title: 'Error', description: axiosErr.response?.data?.message || 'Failed to update profile', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: 'Error', description: 'Please fill all password fields', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'New password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'New passwords do not match', variant: 'destructive' });
      return;
    }
    setChangingPassword(true);
    try {
      await api.put(`/users/${currentUser.id}/password`, {
        currentPassword,
        newPassword,
      });
      toast({ title: 'Success', description: 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast({ title: 'Error', description: axiosErr.response?.data?.message || 'Failed to change password', variant: 'destructive' });
    } finally {
      setChangingPassword(false);
    }
  };

  // Handle avatar file selection (UI only - just updates preview)
const handleAvatarUpload = async (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const file = e.target.files?.[0];

  if (!file) return;

  try {
    const formData = new FormData();

    formData.append('avatar', file);

    const res = await api.post(
      '/users/avatar',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    const avatarPath =
      res.data.data.avatar;

    setEditAvatar(avatarPath);

    login({
      ...currentUser,
      avatar: avatarPath,
    });

    toast({
      title: 'Success',
      description: 'Avatar uploaded',
    });
  } catch {
    toast({
      title: 'Error',
      description: 'Avatar upload failed',
      variant: 'destructive',
    });
  }
};
const handleRemoveAvatar = async () => {
  try {
    await api.delete('/users/avatar');

    setEditAvatar('');

    login({
      ...currentUser!,
      avatar: null
    });

    toast({
      title: 'Success',
      description: 'Avatar removed'
    });
  } catch {
    toast({
      title: 'Error',
      description: 'Failed to remove avatar',
      variant: 'destructive'
    });
  }
};
  const roleColor = role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : role === 'teacher' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400';
  const roleIcon = role === 'admin' ? Shield : role === 'teacher' ? GraduationCap : BookOpen;

  // Input focus class helper
  const focusClass = (fieldId: string) =>
    `transition-all duration-200 ${focusedField === fieldId ? 'ring-2 ring-emerald-500/20 border-emerald-500' : ''}`;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">My Profile</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1">
          <Card className="overflow-hidden">
            {/* Gradient banner */}
            <div className="h-28 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 relative">
              <div className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
                  backgroundSize: '24px 24px',
                }}
              />
            </div>
            <CardContent className="p-6 -mt-14">
              <div className="flex flex-col items-center text-center">
                {/* Avatar with upload overlay */}
                <div
                  className="relative group"
                  onMouseEnter={() => setAvatarHover(true)}
                  onMouseLeave={() => setAvatarHover(false)}
                >
                  <Avatar className="w-24 h-24 border-4 border-background shadow-lg ring-2 ring-emerald-500/20">
                    {(currentUser.avatar || editAvatar) ? <AvatarImage
  src={
    editAvatar
      ? (
          editAvatar.startsWith('/uploads')
            ? `http://localhost:3001${editAvatar}`
            : editAvatar
        )
      : currentUser.avatar
        ? (
            currentUser.avatar.startsWith('/uploads')
              ? `http://localhost:3001${currentUser.avatar}`
              : currentUser.avatar
          )
        : undefined
  }
/> : null}
                    <AvatarFallback className="text-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{initials}</AvatarFallback>
                  </Avatar>
                  {avatarHover && (
                    <motion.label
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full cursor-pointer"
                    >
                      <Upload className="w-6 h-6 text-white" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    </motion.label>
                  )}
                </div>
                <h3 className="mt-4 text-lg font-bold">{currentUser.name}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Mail className="w-3 h-3" /> {currentUser.email}
                </p>
                <Badge className={`mt-3 capitalize ${roleColor}`}>
                  {React.createElement(roleIcon, { className: 'w-3 h-3 mr-1' })}
                  {role}
                </Badge>
              </div>

              <Separator className="my-4" />

              {/* Role-specific info */}
              <div className="space-y-3">
                {role === 'student' && currentUser.student && (
                  <>
                    <div className="flex items-center gap-3 text-sm">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Roll No:</span>
                      <span className="font-medium">{currentUser.student.rollNumber}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Semester:</span>
                      <span className="font-medium">{currentUser.student.semester}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Section:</span>
                      <span className="font-medium">{currentUser.student.section}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Department:</span>
                      <span className="font-medium">{currentUser.student.department?.name || 'N/A'}</span>
                    </div>
                  </>
                )}
                {role === 'teacher' && currentUser.teacher && (
                  <>
                    <div className="flex items-center gap-3 text-sm">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Employee ID:</span>
                      <span className="font-medium">{currentUser.teacher.employeeId}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Designation:</span>
                      <span className="font-medium">{currentUser.teacher.designation}</span>
                    </div>
                    {currentUser.teacher.specialization && (
                      <div className="flex items-center gap-3 text-sm">
                        <GraduationCap className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Specialization:</span>
                        <span className="font-medium">{currentUser.teacher.specialization}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-sm">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Department:</span>
                      <span className="font-medium">{currentUser.teacher.department?.name || 'N/A'}</span>
                    </div>
                  </>
                )}
                {role === 'admin' && (
                  <div className="flex items-center gap-3 text-sm">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Full administrative access</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Edit Profile & Change Password */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 space-y-6">
          {/* Edit Profile */}
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="w-5 h-5" /> Edit Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                      className={focusClass('name')}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={currentUser.email} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avatar">Avatar URL</Label>
                  <Input
                    id="avatar"
                    value={editAvatar}
                    onChange={(e) => setEditAvatar(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    onFocus={() => setFocusedField('avatar')}
                    onBlur={() => setFocusedField(null)}
                    className={focusClass('avatar')}
                  />
                  <p className="text-xs text-muted-foreground">Paste a direct URL to an image for your avatar, or click the avatar above to upload</p>
                </div>
                {role === 'student' && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label>Guardian Name</Label>
      <Input
        value={guardianName}
        onChange={(e) => setGuardianName(e.target.value)}
      />
    </div>

    <div className="space-y-2">
      <Label>Guardian Phone</Label>
     <Input
  value={guardianPhone}
  maxLength={10}
  onChange={(e) =>
    setGuardianPhone(
      e.target.value.replace(/\D/g, '').slice(0, 10)
    )
  }
/>
    </div>

    <div className="space-y-2">
      <Label>Roll Number</Label>
      <Input
        value={currentUser.student?.rollNumber || ''}
        disabled
        className="bg-muted"
      />
    </div>

    <div className="space-y-2">
      <Label>Department</Label>
      <Input
        value={currentUser.student?.department?.name || ''}
        disabled
        className="bg-muted"
      />
    </div>

    <div className="space-y-2">
      <Label>Semester</Label>
      <Input
        value={currentUser.student?.semester || ''}
        disabled
        className="bg-muted"
      />
    </div>

    <div className="space-y-2">
      <Label>Section</Label>
      <Input
        value={currentUser.student?.section || ''}
        disabled
        className="bg-muted"
      />
    </div>

    <div className="space-y-2">
      <Label>Admission Year</Label>
      <Input
        value={currentUser.student?.admissionYear || ''}
        disabled
        className="bg-muted"
      />
    </div>

    <div className="space-y-2">
      <Label>College Email</Label>
      <Input
        value={currentUser.student?.collegeEmail || ''}
        disabled
        className="bg-muted"
      />
    </div>
    
    <div className="space-y-2 md:col-span-2">
  <Label>Bio</Label>
  <textarea
    value={bio}
    onChange={(e) => setBio(e.target.value)}
    className="w-full min-h-[120px] rounded-md border px-3 py-2"
  />
</div>

  </div>
)}
{role === 'teacher' && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label>Research Area</Label>
      <Input
        value={researchArea}
        onChange={(e) => setResearchArea(e.target.value)}
      />
    </div>

    <div className="space-y-2">
      <Label>Qualification</Label>
      <Input
        value={qualification}
        onChange={(e) => setQualification(e.target.value)}
      />
    </div>

    <div className="space-y-2">
      <Label>Office Room</Label>
      <Input
        value={officeRoom}
        onChange={(e) => setOfficeRoom(e.target.value)}
      />
    </div>

    <div className="space-y-2">
      <Label>Phone Number</Label>
      <Input
  value={phoneNumber}
  maxLength={10}
  onChange={(e) =>
    setPhoneNumber(
      e.target.value.replace(/\D/g, '').slice(0, 10)
    )
  }
/>
    </div>

    <div className="space-y-2">
      <Label>Employee ID</Label>
      <Input
        value={currentUser.teacher?.employeeId || ''}
        disabled
        className="bg-muted"
      />
    </div>

    <div className="space-y-2">
      <Label>Department</Label>
      <Input
        value={currentUser.teacher?.department?.name || ''}
        disabled
        className="bg-muted"
      />
    </div>

    <div className="space-y-2">
      <Label>Designation</Label>
      <Input
        value={currentUser.teacher?.designation || ''}
        disabled
        className="bg-muted"
      />
    </div>
    <div className="space-y-2 md:col-span-2">
  <Label>Bio</Label>
  <textarea
    value={bio}
    onChange={(e) => setBio(e.target.value)}
    className="w-full min-h-[120px] rounded-md border px-3 py-2"
  />
</div>
  </div>
)}
                
                <div className="flex gap-2">
  <Button type="submit" disabled={saving} className="bg-emerald-700 hover:bg-emerald-800 shadow-sm hover:shadow-md transition-shadow">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
  <Button
    type="button"
    variant="destructive"
    onClick={handleRemoveAvatar}
  >
    Remove Avatar
  </Button>
</div>
              </form>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <KeyRound className="w-5 h-5" /> Change Password
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      onFocus={() => setFocusedField('currentPw')}
                      onBlur={() => setFocusedField(null)}
                      className={`pr-10 ${focusClass('currentPw')}`}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowCurrent(!showCurrent)}
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        onFocus={() => setFocusedField('newPw')}
                        onBlur={() => setFocusedField(null)}
                        className={`pr-10 ${focusClass('newPw')}`}
                        required
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowNew(!showNew)}
                      >
                        {showNew ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={() => setFocusedField('confirmPw')}
                      onBlur={() => setFocusedField(null)}
                      className={focusClass('confirmPw')}
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={changingPassword} className="bg-emerald-700 hover:bg-emerald-800 shadow-sm hover:shadow-md transition-shadow">
                  <KeyRound className="w-4 h-4 mr-2" />
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
