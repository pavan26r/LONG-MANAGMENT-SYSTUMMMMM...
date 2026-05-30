'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Users, UserCheck, UserX } from 'lucide-react';
import { User } from '@/types';

export default function SalesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<{ leads: User[]; applicants: User[]; totalBorrowers: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (!['admin', 'sales'].includes(user.role)) {
      toast.error('Access denied.');
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const res = await api.get('/dashboard/sales');
      setData(res.data);
    } catch {
      toast.error('Failed to load sales data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  if (!data) return null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales Dashboard</h1>
        <p className="text-gray-500 mt-1">Lead tracking — borrowers and their application status</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <Users size={24} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Borrowers</p>
            <p className="text-2xl font-bold text-gray-900">{data.totalBorrowers}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center">
            <UserX size={24} className="text-yellow-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Pending Leads</p>
            <p className="text-2xl font-bold text-gray-900">{data.leads.length}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
            <UserCheck size={24} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Applied</p>
            <p className="text-2xl font-bold text-gray-900">{data.applicants.length}</p>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="card mb-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <UserX size={18} className="text-yellow-500" />
          Leads (Registered but not applied)
        </h2>
        {data.leads.length === 0 ? (
          <p className="text-gray-400 text-center py-6">No pending leads</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Name</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Email</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Joined</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
              </tr></thead>
              <tbody>
                {data.leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-3 font-medium">{lead.name}</td>
                    <td className="py-3 px-3 text-gray-600">{lead.email}</td>
                    <td className="py-3 px-3 text-gray-400">{new Date((lead as unknown as { createdAt: string }).createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="py-3 px-3"><span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">Not Applied</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Applicants Table */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <UserCheck size={18} className="text-green-500" />
          Applicants (Have applied for loans)
        </h2>
        {data.applicants.length === 0 ? (
          <p className="text-gray-400 text-center py-6">No applicants yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Name</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Email</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Joined</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
              </tr></thead>
              <tbody>
                {data.applicants.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-3 font-medium">{a.name}</td>
                    <td className="py-3 px-3 text-gray-600">{a.email}</td>
                    <td className="py-3 px-3 text-gray-400">{new Date((a as unknown as { createdAt: string }).createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="py-3 px-3"><span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">Applied</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
