'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const roleToModule: Record<string, string> = {
  sales: '/dashboard/sales',
  sanction: '/dashboard/sanction',
  disbursement: '/dashboard/disbursement',
  collection: '/dashboard/collection',
  admin: '/dashboard/sales',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && roleToModule[user.role]) {
      router.push(roleToModule[user.role]);
    }
  }, [user, router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );
}
