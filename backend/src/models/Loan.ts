import mongoose, { Document, Schema } from 'mongoose';

export type LoanStatus =
  | 'applied'
  | 'sanctioned'
  | 'rejected'
  | 'disbursed'
  | 'closed';

export type EmploymentMode = 'salaried' | 'self-employed' | 'unemployed';

export interface ILoan extends Document {
  _id: mongoose.Types.ObjectId;
  borrower: mongoose.Types.ObjectId;

  // Personal Details
  fullName: string;
  pan: string;
  dateOfBirth: Date;
  monthlySalary: number;
  employmentMode: EmploymentMode;

  // Salary Slip
  salarySlipUrl: string;
  salarySlipOriginalName: string;

  // Loan Config
  principalAmount: number;
  tenure: number; // days
  interestRate: number; // fixed 12% p.a.
  simpleInterest: number;
  totalRepayment: number;

  // Status
  status: LoanStatus;

  // Sanction
  sanctionedBy?: mongoose.Types.ObjectId;
  sanctionedAt?: Date;
  rejectionReason?: string;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;

  // Disbursement
  disbursedBy?: mongoose.Types.ObjectId;
  disbursedAt?: Date;

  // Collection
  amountPaid: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const LoanSchema = new Schema<ILoan>(
  {
    borrower: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    fullName: { type: String, required: true },
    pan: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    monthlySalary: { type: Number, required: true },
    employmentMode: {
      type: String,
      enum: ['salaried', 'self-employed', 'unemployed'],
      required: true,
    },

    salarySlipUrl: { type: String, required: true },
    salarySlipOriginalName: { type: String, required: true },

    principalAmount: { type: Number, required: true, min: 50000, max: 500000 },
    tenure: { type: Number, required: true, min: 30, max: 365 },
    interestRate: { type: Number, default: 12 },
    simpleInterest: { type: Number, required: true },
    totalRepayment: { type: Number, required: true },

    status: {
      type: String,
      enum: ['applied', 'sanctioned', 'rejected', 'disbursed', 'closed'],
      default: 'applied',
    },

    sanctionedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    sanctionedAt: { type: Date },
    rejectionReason: { type: String },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: { type: Date },

    disbursedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    disbursedAt: { type: Date },

    amountPaid: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<ILoan>('Loan', LoanSchema);
