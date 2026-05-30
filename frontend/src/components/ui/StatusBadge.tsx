import { LoanStatus } from '@/types';

export function StatusBadge({ status }: { status: LoanStatus }) {
  const map: Record<LoanStatus, string> = {
    applied: 'bg-yellow-100 text-yellow-800',
    sanctioned: 'bg-blue-100 text-blue-800',
    rejected: 'bg-red-100 text-red-800',
    disbursed: 'bg-purple-100 text-purple-800',
    closed: 'bg-green-100 text-green-800',
  };
  return (
    <span className={`${map[status]} text-xs font-semibold px-2.5 py-1 rounded-full`}>
      {status.toUpperCase()}
    </span>
  );
}
