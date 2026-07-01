'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ResetRequest {
  id: string;
  status: string;
  requestedAt: string;
  handledAt?: string;
  handledByName?: string;

  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export default function PasswordResetRequests() {

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ResetRequest[]>([]);

  const load = async () => {

    try {

      const res = await api.get(
        '/auth/password-reset-requests'
      );

      setRequests(res.data.data || []);

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {

    load();

  }, []);

  const approve = async (id: string) => {

    await api.post(
      `/auth/password-reset-requests/${id}/approve`
    );

    toast.success('Request approved.');

    load();

  };

  const reject = async (id: string) => {

    await api.post(
      `/auth/password-reset-requests/${id}/reject`
    );

    toast.success('Request rejected.');

    load();

  };

  return (

<Card>

<CardHeader>

<CardTitle>

Forgot Password Logs

</CardTitle>

</CardHeader>

<CardContent>

<div className="overflow-x-auto">

<table className="w-full">

<thead>

<tr className="border-b">

<th className="text-left p-3">Name</th>

<th className="text-left p-3">Email</th>

<th className="text-left p-3">Role</th>

<th className="text-left p-3">Status</th>

<th className="text-left p-3">Requested</th>

<th className="text-left p-3">Action</th>

</tr>

</thead>

<tbody>

{requests.map((r)=>(

<tr
key={r.id}
className="border-b"
>

<td className="p-3">

{r.user.name}

</td>

<td className="p-3">

{r.user.email}

</td>

<td className="p-3">

{r.user.role}

</td>

<td className="p-3">

<Badge>

{r.status}

</Badge>

</td>

<td className="p-3">

{new Date(
r.requestedAt
).toLocaleString()}

</td>

<td className="p-3 space-x-2">

{r.status==="PENDING" && (

<>

<Button
size="sm"
onClick={()=>
approve(r.id)
}
>

Approve

</Button>

<Button
size="sm"
variant="destructive"
onClick={()=>
reject(r.id)
}
>

Reject

</Button>

</>

)}

</td>

</tr>

))}

</tbody>

</table>

{!loading && requests.length===0 && (

<p className="text-center text-muted-foreground py-8">

No password reset requests.

</p>

)}

</div>

</CardContent>

</Card>

  );

}