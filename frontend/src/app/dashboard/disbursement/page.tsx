'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Banknote, Send } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Loan, User } from '@/types';
import { formatINR } from '@/lib/bre';

export default function DisbursementPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState('');

  useEffect(() => {
    if (!user) return;
    if (!['admin', 'disbursement'].includes(user.role)) {
      toast.error('Access denied.'); router.push('/dashboard'); return;
    }
    fetchLoans();
  }, [user]);

  const fetchLoans = async () => {
    try {
      const res = await api.get('/dashboard/disbursement');
      setLoans(res.data.loans);
    } catch { toast.error('Failed to load.'); }
    finally { setLoading(false); }
  };

  const handleDisburse = async (loanId: string) => {
    if (!confirm('Are you sure you want to disburse this loan?')) return;
    setProcessing(loanId);
    try {
      await api.post(`/dashboard/disbursement/${loanId}/disburse`);
      toast.success('Loan disbursed successfully!');
      fetchLoans();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error');
    } finally { setProcessing(''); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Disbursement Dashboard</h1>
        <p className="text-gray-500 mt-1">Sanctioned loans ready for fund release ({loans.length} pending)</p>
      </div>

      {loans.length === 0 ? (
        <div className="card text-center py-16">
          <Banknote size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No loans awaiting disbursement</p>
        </div>
      ) : (
        <div className="space-y-4">
          {loans.map((loan) => {
            const borrower = loan.borrower as User;
            const sanctionedBy = loan.sanctionedBy as User | undefined;
            return (
              <div key={loan._id} className="card">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-semibold text-gray-900 text-lg">{loan.fullName}</h3>
                      <StatusBadge status={loan.status} />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div><p className="text-gray-400">Borrower</p><p className="font-medium">{borrower?.name}</p></div>
                      <div><p className="text-gray-400">Email</p><p className="font-medium">{borrower?.email}</p></div>
                      <div><p className="text-gray-400">Loan Amount</p><p className="font-bold text-blue-600 text-base">{formatINR(loan.principalAmount)}</p></div>
                      <div><p className="text-gray-400">Tenure</p><p className="font-medium">{loan.tenure} days</p></div>
                      <div><p className="text-gray-400">Interest (SI)</p><p className="font-medium text-orange-600">{formatINR(loan.simpleInterest)}</p></div>
                      <div><p className="text-gray-400">Total Repayment</p><p className="font-bold text-green-700">{formatINR(loan.totalRepayment)}</p></div>
                      <div><p className="text-gray-400">Sanctioned By</p><p className="font-medium">{sanctionedBy?.name || 'N/A'}</p></div>
                      <div><p className="text-gray-400">Sanctioned On</p><p className="font-medium">{loan.sanctionedAt ? new Date(loan.sanctionedAt).toLocaleDateString('en-IN') : '-'}</p></div>
                    </div>
                  </div>
                  <div className="lg:w-40">
                    <button onClick={() => handleDisburse(loan._id)}
                      disabled={processing === loan._id}
                      className="btn-primary w-full flex items-center justify-center gap-2">
                      <Send size={16} />
                      {processing === loan._id ? 'Processing...' : 'Disburse Funds'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
