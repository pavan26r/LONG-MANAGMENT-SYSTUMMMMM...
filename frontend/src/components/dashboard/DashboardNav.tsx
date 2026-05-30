'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Building2, LogOut, Users, CheckSquare,
  Banknote, Coins, LayoutDashboard
} from 'lucide-react';

const navItems = [
  { href: '/dashboard/sales', label: 'Sales', icon: Users, roles: ['admin', 'sales'] },
  { href: '/dashboard/sanction', label: 'Sanction', icon: CheckSquare, roles: ['admin', 'sanction'] },
  { href: '/dashboard/disbursement', label: 'Disbursement', icon: Banknote, roles: ['admin', 'disbursement'] },
  { href: '/dashboard/collection', label: 'Collection', icon: Coins, roles: ['admin', 'collection'] },
];

export function DashboardNav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const visibleItems = navItems.filter((item) =>
    user && item.roles.includes(user.role)
  );

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Building2 className="text-blue-600" size={24} />
              <span className="font-bold text-gray-900">LMS</span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${active ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
            <button onClick={logout}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
