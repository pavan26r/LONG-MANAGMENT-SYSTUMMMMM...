'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { Building2, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user) {
    router.push(user.role === 'borrower' ? '/borrower/apply' : '/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const demoCredentials = [
    { role: 'Borrower', email: 'borrower@lms.com', password: 'Borrower@123' },
    { role: 'Admin', email: 'admin@lms.com', password: 'Admin@123' },
    { role: 'Sales', email: 'sales@lms.com', password: 'Sales@123' },
    { role: 'Sanction', email: 'sanction@lms.com', password: 'Sanction@123' },
    { role: 'Disbursement', email: 'disbursement@lms.com', password: 'Disbursement@123' },
    { role: 'Collection', email: 'collection@lms.com', password: 'Collection@123' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Building2 className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">LMS</h1>
          <p className="text-gray-500 mt-1">Loan Management System</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in to your account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            New borrower?{' '}
            <Link href="/auth/register" className="text-blue-600 hover:underline font-medium">
              Create account
            </Link>
          </p>
        </div>

        {/* Demo Credentials */}
        <div className="mt-4 card">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Demo Credentials</p>
          <div className="space-y-1.5">
            {demoCredentials.map((c) => (
              <button
                key={c.role}
                onClick={() => { setEmail(c.email); setPassword(c.password); }}
                className="w-full flex justify-between items-center text-xs px-3 py-2 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors"
              >
                <span className="font-medium text-gray-700">{c.role}</span>
                <span className="text-gray-400">{c.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
