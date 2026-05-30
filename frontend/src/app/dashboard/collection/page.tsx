'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Coins, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Loan, Payment, User } from '@/types';
import { formatINR } from '@/lib/bre';

interface LoanWithPayments extends Loan {
  payments: Payment[];
}

interface PaymentForm {
  utrNumber: string;
  amount: string;
  paymentDate: string;
}

export default function CollectionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loans, setLoans] = useState<LoanWithPayments[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState<{ loanId: string; open: boolean; maxAmount: number }>({ loanId: '', open: false, maxAmount: 0 });
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({ utrNumber: '', amount: '', paymentDate: new Date().toISOString().split('T')[0] });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!['admin', 'collection'].includes(user.role)) {
      toast.error('Access denied.'); router.push('/dashboard'); return;
    }
    fetchLoans();
  }, [user]);

  const fetchLoans = async () => {
    try {
      const res = await api.get('/dashboard/collection');
      setLoans(res.data.loans);
    } catch { toast.error('Failed to load.'); }
    finally { setLoading(false); }
  };

  const handleRecordPayment = async () => {
    if (!paymentForm.utrNumber.trim() || !paymentForm.amount || !paymentForm.paymentDate) {
      toast.error('All fields are required.'); return;
    }
    const amt = Number(paymentForm.amount);
    if (amt <= 0) { toast.error('Amount must be > 0.'); return; }
    if (amt > paymentModal.maxAmount) {
      toast.error(`Amount cannot exceed outstanding ₹${paymentModal.maxAmount.toFixed(2)}`); return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/payments', {
        loanId: paymentModal.loanId,
        utrNumber: paymentForm.utrNumber.trim(),
        amount: amt,
        paymentDate: paymentForm.paymentDate,
      });
      toast.success(res.data.message);
      setPaymentModal({ loanId: '', open: false, maxAmount: 0 });
      setPaymentForm({ utrNumber: '', amount: '', paymentDate: new Date().toISOString().split('T')[0] });
      fetchLoans();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Payment failed.');
    } finally { setSubmitting(false); }
  };

  const openPayment = (loan: LoanWithPayments) => {
    const outstanding = loan.totalRepayment - loan.amountPaid;
    setPaymentModal({ loanId: loan._id, open: true, maxAmount: Math.round(outstanding * 100) / 100 });
    setPaymentForm({ utrNumber: '', amount: '', paymentDate: new Date().toISOString().split('T')[0] });
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  const activeLoanCount = loans.filter(l => l.status === 'disbursed').length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Collection Dashboard</h1>
        <p className="text-gray-500 mt-1">Record payments for disbursed loans ({activeLoanCount} active)</p>
      </div>

      {loans.length === 0 ? (
        <div className="card text-center py-16">
          <Coins size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No disbursed loans found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {loans.map((loan) => {
            const borrower = loan.borrower as User;
            const outstanding = Math.max(0, loan.totalRepayment - loan.amountPaid);
            const progress = (loan.amountPaid / loan.totalRepayment) * 100;
            const isOpen = expanded === loan._id;

            return (
              <div key={loan._id} className="card">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <h3 className="font-semibold text-gray-900 text-lg">{loan.fullName}</h3>
                      <StatusBadge status={loan.status} />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
                      <div><p className="text-gray-400">Borrower</p><p className="font-medium">{borrower?.name}</p></div>
                      <div><p className="text-gray-400">Principal</p><p className="font-medium">{formatINR(loan.principalAmount)}</p></div>
                      <div><p className="text-gray-400">Total Due</p><p className="font-bold text-gray-900">{formatINR(loan.totalRepayment)}</p></div>
                      <div><p className="text-gray-400">Outstanding</p><p className={`font-bold ${outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatINR(outstanding)}</p></div>
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Paid: {formatINR(loan.amountPaid)}</span>
                        <span>{progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className={`h-2 rounded-full transition-all ${progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(100, progress)}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 lg:w-40">
                    {loan.status === 'disbursed' && (
                      <button onClick={() => openPayment(loan)} className="btn-primary w-full flex items-center justify-center gap-2">
                        <Plus size={16} /> Record Payment
                      </button>
                    )}
                    <button onClick={() => setExpanded(isOpen ? null : loan._id)}
                      className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
                      {isOpen ? <><ChevronUp size={14} /> Hide</> : <><ChevronDown size={14} /> History ({loan.payments.length})</>}
                    </button>
                  </div>
                </div>

                {/* Payment History */}
                {isOpen && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Payment History</h4>
                    {loan.payments.length === 0 ? (
                      <p className="text-sm text-gray-400">No payments recorded yet</p>
                    ) : (
                      <div className="space-y-2">
                        {loan.payments.map((p) => (
                          <div key={p._id} className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">UTR: <span className="font-mono">{p.utrNumber}</span></p>
                              <p className="text-gray-400">{new Date(p.paymentDate).toLocaleDateString('en-IN')}</p>
                            </div>
                            <p className="font-bold text-green-700">{formatINR(p.amount)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Modal */}
      {paymentModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-gray-900 text-lg mb-1">Record Payment</h3>
            <p className="text-sm text-gray-500 mb-4">Outstanding: <strong>{formatINR(paymentModal.maxAmount)}</strong></p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">UTR Number *</label>
                <input type="text" className="input-field" placeholder="Enter unique UTR number"
                  value={paymentForm.utrNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, utrNumber: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                <input type="number" className="input-field" placeholder={`Max: ${paymentModal.maxAmount}`}
                  min={1} max={paymentModal.maxAmount} step={0.01}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date *</label>
                <input type="date" className="input-field"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setPaymentModal({ loanId: '', open: false, maxAmount: 0 })} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={handleRecordPayment} className="btn-primary flex-1" disabled={submitting}>
                {submitting ? 'Saving...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
