'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { runClientBRE, calcLoan, formatINR } from '@/lib/bre';
import {
  FileText, Upload, DollarSign, UserCircle,
  CheckCircle, XCircle, ChevronRight, LogOut, Building2
} from 'lucide-react';
import { Loan, User } from '@/types';

type Step = 1 | 2 | 3 | 4;

interface PersonalDetails {
  fullName: string;
  pan: string;
  dateOfBirth: string;
  monthlySalary: string;
  employmentMode: string;
}

export default function BorrowerApplyPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [personalDetails, setPersonalDetails] = useState<PersonalDetails>({
    fullName: user?.name || '',
    pan: '',
    dateOfBirth: '',
    monthlySalary: '',
    employmentMode: 'salaried',
  });
  const [breErrors, setBreErrors] = useState<string[]>([]);
  const [salarySlipUrl, setSalarySlipUrl] = useState('');
  const [salarySlipOriginalName, setSalarySlipOriginalName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(false);
  const [principal, setPrincipal] = useState(100000);
  const [tenure, setTenure] = useState(90);
  const [submitting, setSubmitting] = useState(false);
  const [existingLoans, setExistingLoans] = useState<Loan[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    if (user.role !== 'borrower') { router.push('/dashboard'); return; }
    fetchMyLoans();
  }, [user]);

  const fetchMyLoans = async () => {
    try {
      const res = await api.get('/loans/my');
      setExistingLoans(res.data.loans);
    } catch { /* ignore */ } finally {
      setLoadingLoans(false);
    }
  };

  const { simpleInterest, totalRepayment } = calcLoan(principal, tenure);

  // Step 2 — BRE check
  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBreErrors([]);

    // Client-side BRE
    const clientCheck = runClientBRE({
      dateOfBirth: personalDetails.dateOfBirth,
      monthlySalary: Number(personalDetails.monthlySalary),
      pan: personalDetails.pan,
      employmentMode: personalDetails.employmentMode,
    });

    if (!clientCheck.passed) {
      setBreErrors(clientCheck.errors);
      return;
    }

    // Server-side BRE
    try {
      await api.post('/loans/check-eligibility', {
        dateOfBirth: personalDetails.dateOfBirth,
        monthlySalary: Number(personalDetails.monthlySalary),
        pan: personalDetails.pan,
        employmentMode: personalDetails.employmentMode,
      });
      toast.success('Eligibility check passed!');
      setStep(3);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { errors?: string[] } } })?.response?.data;
      if (data?.errors) setBreErrors(data.errors);
      else toast.error('Server error. Try again.');
    }
  };

  // Step 3 — Upload salary slip
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5 MB.');
      return;
    }

    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      toast.error('Only PDF, JPG, or PNG files allowed.');
      return;
    }

    const formData = new FormData();
    formData.append('salarySlip', file);
    setUploadProgress(true);

    try {
      const res = await api.post('/loans/upload-salary-slip', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSalarySlipUrl(res.data.fileUrl);
      setSalarySlipOriginalName(res.data.originalName);
      toast.success('File uploaded successfully!');
    } catch {
      toast.error('Upload failed. Try again.');
    } finally {
      setUploadProgress(false);
    }
  };

  // Step 4 — Final apply
  const handleApply = async () => {
    setSubmitting(true);
    try {
      await api.post('/loans/apply', {
        ...personalDetails,
        monthlySalary: Number(personalDetails.monthlySalary),
        salarySlipUrl,
        salarySlipOriginalName,
        principalAmount: principal,
        tenure,
      });
      toast.success('Loan application submitted! 🎉');
      await fetchMyLoans();
      setStep(1);
      setPersonalDetails({ fullName: user?.name || '', pan: '', dateOfBirth: '', monthlySalary: '', employmentMode: 'salaried' });
      setSalarySlipUrl('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Application failed.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { n: 1, label: 'Personal Details', icon: UserCircle },
    { n: 2, label: 'Salary Slip', icon: Upload },
    { n: 3, label: 'Loan Config', icon: DollarSign },
  ];

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      applied: 'badge-applied',
      sanctioned: 'badge-sanctioned',
      rejected: 'badge-rejected',
      disbursed: 'badge-disbursed',
      closed: 'badge-closed',
    };
    return <span className={map[status] || 'badge-applied'}>{status.toUpperCase()}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Building2 className="text-blue-600" size={24} />
            <span className="font-bold text-gray-900">LMS</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Hello, {user?.name}</span>
            <button onClick={logout} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-4 py-8">
        {/* Existing Loans */}
        {!loadingLoans && existingLoans.length > 0 && (
          <div className="card mb-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={18} /> My Loan Applications
            </h2>
            <div className="space-y-3">
              {existingLoans.map((loan) => (
                <div key={loan._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{formatINR(loan.principalAmount)} for {loan.tenure} days</p>
                    <p className="text-sm text-gray-500">Applied {new Date(loan.createdAt).toLocaleDateString('en-IN')}</p>
                    {loan.status === 'rejected' && loan.rejectionReason && (
                      <p className="text-sm text-red-600 mt-1">Reason: {loan.rejectionReason}</p>
                    )}
                    {loan.status === 'disbursed' && (
                      <p className="text-sm text-purple-600 mt-1">
                        Paid: {formatINR(loan.amountPaid)} / {formatINR(loan.totalRepayment)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-1">
                    {statusBadge(loan.status)}
                    <p className="text-xs text-gray-400">Total: {formatINR(loan.totalRepayment)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Application Form */}
        <div className="card">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Apply for a Loan</h1>
            <p className="text-gray-500 text-sm">Complete the steps below to submit your application</p>
          </div>

          {/* Stepper */}
          <div className="flex items-center mb-8">
            {[
              { n: 1, label: 'Personal Details' },
              { n: 2, label: 'Salary Slip' },
              { n: 3, label: 'Loan Config' },
            ].map((s, idx) => (
              <div key={s.n} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-colors
                    ${step > s.n ? 'bg-green-500 text-white' : step === s.n ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {step > s.n ? <CheckCircle size={18} /> : s.n}
                  </div>
                  <span className={`text-xs mt-1 hidden sm:block ${step === s.n ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
                {idx < 2 && <div className={`flex-1 h-0.5 mx-2 ${step > s.n ? 'bg-green-400' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          {/* STEP 1 — Already handled as step 2 in the BRE section, renamed for clarity */}
          {step === 1 && (
            <form onSubmit={handlePersonalSubmit} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Personal Details & Eligibility</h2>

              {breErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle size={18} className="text-red-500" />
                    <p className="font-semibold text-red-800">Eligibility Check Failed</p>
                  </div>
                  <ul className="list-disc list-inside space-y-1">
                    {breErrors.map((e, i) => (
                      <li key={i} className="text-sm text-red-700">{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input type="text" className="input-field" placeholder="As per Aadhar / PAN"
                    value={personalDetails.fullName}
                    onChange={(e) => setPersonalDetails({ ...personalDetails, fullName: e.target.value })}
                    required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                  <input type="text" className="input-field uppercase" placeholder="e.g. ABCDE1234F" maxLength={10}
                    value={personalDetails.pan}
                    onChange={(e) => setPersonalDetails({ ...personalDetails, pan: e.target.value.toUpperCase() })}
                    required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input type="date" className="input-field"
                    value={personalDetails.dateOfBirth}
                    onChange={(e) => setPersonalDetails({ ...personalDetails, dateOfBirth: e.target.value })}
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 23)).toISOString().split('T')[0]}
                    required />
                  <p className="text-xs text-gray-400 mt-1">Must be 23–50 years old</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary (₹)</label>
                  <input type="number" className="input-field" placeholder="e.g. 35000" min={1}
                    value={personalDetails.monthlySalary}
                    onChange={(e) => setPersonalDetails({ ...personalDetails, monthlySalary: e.target.value })}
                    required />
                  <p className="text-xs text-gray-400 mt-1">Minimum ₹25,000/month required</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employment Mode</label>
                  <select className="input-field"
                    value={personalDetails.employmentMode}
                    onChange={(e) => setPersonalDetails({ ...personalDetails, employmentMode: e.target.value })}>
                    <option value="salaried">Salaried</option>
                    <option value="self-employed">Self-Employed</option>
                    <option value="unemployed">Unemployed</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn-primary w-full mt-4">
                Check Eligibility & Continue <ChevronRight size={16} className="inline" />
              </button>
            </form>
          )}

          {/* STEP 2 — Upload Salary Slip */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-800">Upload Salary Slip</h2>
              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors
                ${salarySlipUrl ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50 hover:border-blue-400'}`}>
                {salarySlipUrl ? (
                  <div className="space-y-2">
                    <CheckCircle size={40} className="mx-auto text-green-500" />
                    <p className="font-semibold text-green-700">{salarySlipOriginalName}</p>
                    <p className="text-sm text-green-600">Uploaded successfully!</p>
                    <button onClick={() => { setSalarySlipUrl(''); setSalarySlipOriginalName(''); }}
                      className="text-sm text-red-500 hover:underline">Remove & Re-upload</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload size={40} className="mx-auto text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-700">Drop your file here or click to browse</p>
                      <p className="text-sm text-gray-400">PDF, JPG, PNG • Max 5 MB</p>
                    </div>
                    <label className="btn-primary inline-block cursor-pointer">
                      {uploadProgress ? 'Uploading...' : 'Choose File'}
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileUpload} disabled={uploadProgress} />
                    </label>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
                <button onClick={() => setStep(3)} disabled={!salarySlipUrl} className="btn-primary flex-1">
                  Continue <ChevronRight size={16} className="inline" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — Loan Config & Apply */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-800">Loan Configuration</h2>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Loan Amount</label>
                    <span className="font-bold text-blue-600 text-lg">{formatINR(principal)}</span>
                  </div>
                  <input type="range" className="w-full accent-blue-600" min={50000} max={500000} step={5000}
                    value={principal} onChange={(e) => setPrincipal(Number(e.target.value))} />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>₹50,000</span><span>₹5,00,000</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Tenure (Days)</label>
                    <span className="font-bold text-blue-600 text-lg">{tenure} days</span>
                  </div>
                  <input type="range" className="w-full accent-blue-600" min={30} max={365} step={5}
                    value={tenure} onChange={(e) => setTenure(Number(e.target.value))} />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>30 days</span><span>365 days</span>
                  </div>
                </div>
              </div>

              {/* Live Calculation Panel */}
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                <h3 className="font-semibold text-blue-900 mb-4">Loan Summary</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Principal</p>
                    <p className="font-bold text-gray-900">{formatINR(principal)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Interest Rate</p>
                    <p className="font-bold text-gray-900">12% p.a.</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Simple Interest</p>
                    <p className="font-bold text-orange-600">{formatINR(simpleInterest)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Total Repayment</p>
                    <p className="font-bold text-green-700">{formatINR(totalRepayment)}</p>
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-3 text-center">
                  SI = ({formatINR(principal)} × 12 × {tenure}) ÷ (365 × 100)
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
                <button onClick={handleApply} disabled={submitting} className="btn-primary flex-1">
                  {submitting ? 'Submitting...' : '🚀 Apply Now'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
