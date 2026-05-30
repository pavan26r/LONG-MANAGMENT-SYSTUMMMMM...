'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { CheckSquare, XCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Loan, User } from '@/types';
import { formatINR } from '@/lib/bre';

export default function SanctionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ loanId: string; open: boolean }>({ loanId: '', open: false });
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState('');

  useEffect(() => {
    if (!user) return;
    if (!['admin', 'sanction'].includes(user.role)) {
      toast.error('Access denied.'); router.push('/dashboard'); return;
    }
    fetchLoans();
  }, [user]);

  const fetchLoans = async () => {
    try {
      const res = await api.get('/dashboard/sanction');
      setLoans(res.data.loans);
    } catch { toast.error('Failed to load.'); }
    finally { setLoading(false); }
  };

  const handleApprove = async (loanId: string) => {
    setProcessing(loanId);
    try {
      await api.post(`/dashboard/sanction/${loanId}/approve`);
      toast.success('Loan sanctioned!');
      fetchLoans();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error');
    } finally { setProcessing(''); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      toast.error('Please provide a reason (min 5 characters).'); return;
    }
    setProcessing(rejectModal.loanId);
    try {
      await api.post(`/dashboard/sanction/${rejectModal.loanId}/reject`, { reason: rejectReason });
      toast.success('Loan rejected.');
      setRejectModal({ loanId: '', open: false });
      setRejectReason('');
      fetchLoans();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error');
    } finally { setProcessing(''); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sanction Dashboard</h1>
        <p className="text-gray-500 mt-1">Review and approve or reject loan applications ({loans.length} pending)</p>
      </div>

      {loans.length === 0 ? (
        <div className="card text-center py-16">
          <CheckSquare size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No pending applications to review</p>
        </div>
      ) : (
        <div className="space-y-4">
          {loans.map((loan) => {
            const borrower = loan.borrower as User;
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
                      <div><p className="text-gray-400">PAN</p><p className="font-medium font-mono">{loan.pan}</p></div>
                      <div><p className="text-gray-400">Employment</p><p className="font-medium capitalize">{loan.employmentMode}</p></div>
                      <div><p className="text-gray-400">Monthly Salary</p><p className="font-medium">{formatINR(loan.monthlySalary)}</p></div>
                      <div><p className="text-gray-400">Loan Amount</p><p className="font-bold text-blue-600">{formatINR(loan.principalAmount)}</p></div>
                      <div><p className="text-gray-400">Tenure</p><p className="font-medium">{loan.tenure} days</p></div>
                      <div><p className="text-gray-400">Total Repayment</p><p className="font-bold text-green-700">{formatINR(loan.totalRepayment)}</p></div>
                      <div><p className="text-gray-400">Applied On</p><p className="font-medium">{new Date(loan.createdAt).toLocaleDateString('en-IN')}</p></div>
                    </div>
                    {loan.salarySlipUrl && (
                      <a href={`${process.env.NEXT_PUBLIC_API_URL}${loan.salarySlipUrl}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-3">
                        <ExternalLink size={14} /> View Salary Slip
                      </a>
                    )}
                  </div>
                  <div className="flex lg:flex-col gap-2 lg:w-36">
                    <button onClick={() => handleApprove(loan._id)}
                      disabled={processing === loan._id}
                      className="btn-success flex items-center justify-center gap-2 flex-1 lg:flex-none">
                      <CheckCircle size={16} />
                      {processing === loan._id ? '...' : 'Approve'}
                    </button>
                    <button onClick={() => { setRejectModal({ loanId: loan._id, open: true }); setRejectReason(''); }}
                      disabled={processing === loan._id}
                      className="btn-danger flex items-center justify-center gap-2 flex-1 lg:flex-none">
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-gray-900 text-lg mb-2">Reject Loan Application</h3>
            <p className="text-sm text-gray-500 mb-4">Please provide a clear reason for rejection (shown to borrower).</p>
            <textarea className="input-field min-h-[100px] resize-none" placeholder="Enter rejection reason..."
              value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setRejectModal({ loanId: '', open: false })} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleReject} className="btn-danger flex-1" disabled={processing === rejectModal.loanId}>
                {processing === rejectModal.loanId ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
