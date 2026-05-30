import { Router, Response } from 'express';
import path from 'path';
import Loan from '../models/Loan';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { runBRE, calculateLoan } from '../utils/bre';

const router = Router();

// POST /api/loans/check-eligibility — BRE check (no file needed yet)
router.post('/check-eligibility', authenticate, authorize('borrower'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { dateOfBirth, monthlySalary, pan, employmentMode } = req.body;

  if (!dateOfBirth || !monthlySalary || !pan || !employmentMode) {
    res.status(400).json({ message: 'All fields are required.' });
    return;
  }

  const result = runBRE({ dateOfBirth, monthlySalary: Number(monthlySalary), pan, employmentMode });

  if (!result.passed) {
    res.status(422).json({ passed: false, errors: result.errors });
    return;
  }

  res.json({ passed: true, message: 'Eligibility check passed!' });
});

// POST /api/loans/upload-salary-slip
router.post('/upload-salary-slip', authenticate, authorize('borrower'), upload.single('salarySlip'), async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ message: 'Salary slip file is required.' });
    return;
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ fileUrl, originalName: req.file.originalname });
});

// POST /api/loans/apply — Full loan application
router.post('/apply', authenticate, authorize('borrower'), async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    fullName, pan, dateOfBirth, monthlySalary, employmentMode,
    salarySlipUrl, salarySlipOriginalName,
    principalAmount, tenure,
  } = req.body;

  // Validate required fields
  if (!fullName || !pan || !dateOfBirth || !monthlySalary || !employmentMode ||
    !salarySlipUrl || !salarySlipOriginalName || !principalAmount || !tenure) {
    res.status(400).json({ message: 'All fields are required.' });
    return;
  }

  // Run BRE on server again
  const breResult = runBRE({
    dateOfBirth,
    monthlySalary: Number(monthlySalary),
    pan,
    employmentMode,
  });

  if (!breResult.passed) {
    res.status(422).json({ message: 'BRE check failed.', errors: breResult.errors });
    return;
  }

  // Validate loan config
  const p = Number(principalAmount);
  const t = Number(tenure);
  if (p < 50000 || p > 500000) {
    res.status(400).json({ message: 'Loan amount must be between ₹50,000 and ₹5,00,000.' });
    return;
  }
  if (t < 30 || t > 365) {
    res.status(400).json({ message: 'Tenure must be between 30 and 365 days.' });
    return;
  }

  try {
    const { simpleInterest, totalRepayment, interestRate } = calculateLoan(p, t);

    const loan = await Loan.create({
      borrower: req.user!.id,
      fullName,
      pan: pan.toUpperCase(),
      dateOfBirth,
      monthlySalary: Number(monthlySalary),
      employmentMode,
      salarySlipUrl,
      salarySlipOriginalName,
      principalAmount: p,
      tenure: t,
      interestRate,
      simpleInterest,
      totalRepayment,
      status: 'applied',
      amountPaid: 0,
    });

    res.status(201).json({ message: 'Loan application submitted!', loan });
  } catch (error) {
    console.error('Loan apply error:', error);
    res.status(500).json({ message: 'Server error while applying for loan.' });
  }
});

// GET /api/loans/my — Borrower's own loans
router.get('/my', authenticate, authorize('borrower'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const loans = await Loan.find({ borrower: req.user!.id }).sort({ createdAt: -1 });
    res.json({ loans });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/loans/calculate — Live calculation helper
router.get('/calculate', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { principal, tenure } = req.query;
  if (!principal || !tenure) {
    res.status(400).json({ message: 'principal and tenure are required.' });
    return;
  }
  const result = calculateLoan(Number(principal), Number(tenure));
  res.json(result);
});

export default router;
