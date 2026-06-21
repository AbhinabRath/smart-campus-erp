'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { Search, Users } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  role: 'student' | 'teacher';
  avatar: string | null;
  student?: any;
  teacher?: any;
}

export default function DirectoryPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');

  const { setView, setSelectedProfileId } = useAppStore();

  const loadProfiles = async () => {
    const res = await api.get('/public-profiles', {
      params: { search }
    });

    setProfiles(res.data.data || []);
  };

  useEffect(() => {
    loadProfiles();
  }, [search]);

  return (
    <div className="space-y-6">

      <h2 className="text-2xl font-bold">
        People Directory
      </h2>

      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />

        <input
          className="w-full border rounded-lg pl-10 p-2"
          placeholder="Search students or teachers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

        {profiles.map((user) => (

          <div
            key={user.id}
            onClick={() => {
              setSelectedProfileId(user.id);
              setView('public-profile');
            }}
            className="cursor-pointer border rounded-xl p-4 hover:shadow-lg transition"
          >

            <div className="flex gap-3 items-center">

              <img
  src={
    user.avatar
      ? user.avatar.startsWith('/uploads')
        ? `http://localhost:3001${user.avatar}`
        : user.avatar
      : '/default-avatar.png'
  }
  className="w-14 h-14 rounded-full object-cover"
  alt={user.name}
/>

              <div>
                <h3 className="font-semibold">
                  {user.name}
                </h3>

                <p className="text-sm text-muted-foreground capitalize">
                  {user.role}
                </p>

                <p className="text-xs text-muted-foreground">
                  {user.student?.department?.name ||
                    user.teacher?.department?.name}
                </p>
              </div>
            </div>

          </div>
        ))}
      </div>

      {profiles.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          <Users className="w-10 h-10 mx-auto mb-2" />
          No users found
        </div>
      )}
    </div>
  );
}