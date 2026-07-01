'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api';

export default function ResetPasswordPage() {

  const { toast } = useToast();

  const logout = useAppStore((s) => s.logout);

  const [password, setPassword] = useState('');

  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    if (password.length < 6) {

      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive'
      });

      return;

    }

    if (password !== confirmPassword) {

      toast({
        title: 'Error',
        description: 'Passwords do not match.',
        variant: 'destructive'
      });

      return;

    }

    setLoading(true);

    try {

      await api.post(
        '/auth/reset-password',
        {
          password
        }
      );

      toast({
        title: 'Success',
        description: 'Password updated successfully. Please login again.'
      });

      logout();

    } catch (err: any) {

      toast({

        title: 'Error',

        description:
          err.response?.data?.message ||
          'Unable to reset password.',

        variant: 'destructive'

      });

    } finally {

      setLoading(false);

    }

  };

  return (

<div className="max-w-md mx-auto mt-16">

<Card>

<CardHeader>

<CardTitle>

Reset Password

</CardTitle>

</CardHeader>

<CardContent>

<form
onSubmit={handleSubmit}
className="space-y-4"
>

<div>

<Label>

New Password

</Label>

<Input
type="password"
value={password}
onChange={(e)=>
setPassword(
e.target.value
)
}
/>

</div>

<div>

<Label>

Confirm Password

</Label>

<Input
type="password"
value={confirmPassword}
onChange={(e)=>
setConfirmPassword(
e.target.value
)
}
/>

</div>

<Button
type="submit"
disabled={loading}
className="w-full"
>

{loading
? 'Saving...'
: 'Update Password'}

</Button>

</form>

</CardContent>

</Card>

</div>

  );

}