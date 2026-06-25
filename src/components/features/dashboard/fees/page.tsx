'use client';

import { useEffect, useState } from 'react';
import StudentFeeView from '@/components/fees/StudentFeeView';
import AdminFeeView from '@/components/fees/AdminFeeView';

export default function FeesPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me', {
      credentials: 'include'
    })
      .then((res) => res.json())
      .then((data) => {
        setUser(data.data);
      });
  }, []);

  if (!user) {
    return <div>Loading...</div>;
  }

  if (user.role === 'admin') {
    return <AdminFeeView />;
  }

  return <StudentFeeView />;
}