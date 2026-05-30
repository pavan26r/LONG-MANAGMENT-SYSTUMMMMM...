export interface BREInput {
  dateOfBirth: string | Date;
  monthlySalary: number;
  pan: string;
  employmentMode: string;
}

export interface BREResult {
  passed: boolean;
  errors: string[];
}

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export function runBRE(input: BREInput): BREResult {
  const errors: string[] = [];

  // Age check
  const dob = new Date(input.dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  if (age < 23 || age > 50) {
    errors.push(`Age must be between 23 and 50 years. Your age: ${age}`);
  }

  // Salary check
  if (input.monthlySalary < 25000) {
    errors.push(`Monthly salary must be at least ₹25,000. Provided: ₹${input.monthlySalary}`);
  }

  // PAN check
  if (!PAN_REGEX.test(input.pan.toUpperCase())) {
    errors.push(`Invalid PAN format. PAN must be in format: ABCDE1234F (5 letters, 4 digits, 1 letter)`);
  }

  // Employment mode check
  if (input.employmentMode === 'unemployed') {
    errors.push('Unemployed applicants are not eligible for loans.');
  }

  return {
    passed: errors.length === 0,
    errors,
  };
}

// Loan math utility
export function calculateLoan(principal: number, tenureDays: number): {
  simpleInterest: number;
  totalRepayment: number;
  interestRate: number;
} {
  const rate = 12; // 12% p.a. fixed
  const simpleInterest = (principal * rate * tenureDays) / (365 * 100);
  const totalRepayment = principal + simpleInterest;
  return {
    simpleInterest: Math.round(simpleInterest * 100) / 100,
    totalRepayment: Math.round(totalRepayment * 100) / 100,
    interestRate: rate,
  };
}
