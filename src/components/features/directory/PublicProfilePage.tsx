'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { ArrowLeft } from 'lucide-react';

export default function PublicProfilePage() {

  const {
    selectedProfileId,
    setView
  } = useAppStore();

  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!selectedProfileId) return;

    api
      .get(`/public-profiles/${selectedProfileId}`)
      .then((res) => setProfile(res.data.data));
  }, [selectedProfileId]);

  if (!profile) {
    return <p>Loading...</p>;
  }

  const student = profile.student;
  const teacher = profile.teacher;

  return (
    <div className="space-y-6">

      <button
        onClick={() => setView('directory')}
        className="flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Directory
      </button>

      <div className="border rounded-xl p-6">

        <div className="flex gap-5 items-center">

          <img
  src={
    profile.avatar
      ? profile.avatar.startsWith('/uploads')
        ? `http://localhost:3001${profile.avatar}`
        : profile.avatar
      : '/default-avatar.png'
  }
  className="w-28 h-28 rounded-full object-cover"
  alt={profile.name}
/>

          <div>

            <h2 className="text-3xl font-bold">
              {profile.name}
            </h2>

            <p className="text-muted-foreground capitalize">
              {profile.role}
            </p>

          </div>
        </div>

      </div>

      {student && (
        <div className="border rounded-xl p-6 space-y-2">

          <h3 className="font-semibold">
            Student Information
          </h3>

          <p>
            <b>Roll Number:</b> {student.rollNumber}
          </p>

          <p>
            <b>Department:</b> {student.department?.name}
          </p>

          <p>
            <b>Semester:</b> {student.semester}
          </p>

          <p>
            <b>Section:</b> {student.section}
          </p>

          {student.bio && (
            <p>
              <b>Bio:</b> {student.bio}
            </p>
          )}

        </div>
      )}

      {teacher && (
        <div className="border rounded-xl p-6 space-y-2">

          <h3 className="font-semibold">
            Teacher Information
          </h3>

          <p>
            <b>Department:</b> {teacher.department?.name}
          </p>

          <p>
            <b>Designation:</b> {teacher.designation}
          </p>

          {teacher.qualification && (
            <p>
              <b>Qualification:</b> {teacher.qualification}
            </p>
          )}

          {teacher.researchArea && (
            <p>
              <b>Research Area:</b> {teacher.researchArea}
            </p>
          )}

          {teacher.officeRoom && (
            <p>
              <b>Office Room:</b> {teacher.officeRoom}
            </p>
          )}

          {teacher.bio && (
            <p>
              <b>Bio:</b> {teacher.bio}
            </p>
          )}

        </div>
      )}

    </div>
  );
}