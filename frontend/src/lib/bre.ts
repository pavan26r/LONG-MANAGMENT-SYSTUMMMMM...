export interface BREResult {
  passed: boolean;
  errors: string[];
}

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export function runClientBRE(input: {
  dateOfBirth: string;
  monthlySalary: number;
  pan: string;
  employmentMode: string;
}): BREResult {
  const errors: string[] = [];

  // Age check
  const dob = new Date(input.dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;

  if (age < 23 || age > 50) {
    errors.push(`Age must be between 23 and 50 years. Your age: ${age}`);
  }

  if (input.monthlySalary < 25000) {
    errors.push(`Monthly salary must be ₹25,000+. Yours: ₹${input.monthlySalary.toLocaleString('en-IN')}`);
  }

  if (!PAN_REGEX.test(input.pan.toUpperCase())) {
    errors.push('Invalid PAN format (e.g. ABCDE1234F: 5 letters, 4 digits, 1 letter)');
  }

  if (input.employmentMode === 'unemployed') {
    errors.push('Unemployed applicants are not eligible.');
  }

  return { passed: errors.length === 0, errors };
}

export function calcLoan(principal: number, tenure: number) {
  const rate = 12;
  const si = (principal * rate * tenure) / (365 * 100);
  return {
    simpleInterest: Math.round(si * 100) / 100,
    totalRepayment: Math.round((principal + si) * 100) / 100,
    interestRate: rate,
  };
}

export function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}
