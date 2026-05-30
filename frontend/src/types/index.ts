export type UserRole = 'borrower' | 'admin' | 'sales' | 'sanction' | 'disbursement' | 'collection';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export type LoanStatus = 'applied' | 'sanctioned' | 'rejected' | 'disbursed' | 'closed';
export type EmploymentMode = 'salaried' | 'self-employed' | 'unemployed';

export interface Loan {
  _id: string;
  borrower: User | string;
  fullName: string;
  pan: string;
  dateOfBirth: string;
  monthlySalary: number;
  employmentMode: EmploymentMode;
  salarySlipUrl: string;
  salarySlipOriginalName: string;
  principalAmount: number;
  tenure: number;
  interestRate: number;
  simpleInterest: number;
  totalRepayment: number;
  status: LoanStatus;
  amountPaid: number;
  sanctionedBy?: User;
  sanctionedAt?: string;
  rejectionReason?: string;
  rejectedBy?: User;
  rejectedAt?: string;
  disbursedBy?: User;
  disbursedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  _id: string;
  loan: string;
  borrower: string;
  recordedBy: User | string;
  utrNumber: string;
  amount: number;
  paymentDate: string;
  createdAt: string;
}
