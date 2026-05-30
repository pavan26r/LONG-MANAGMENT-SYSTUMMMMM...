import { Router, Response } from 'express';
import Payment from '../models/Payment';
import Loan from '../models/Loan';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/payments — Record a payment
router.post('/', authenticate, authorize('admin', 'collection'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { loanId, utrNumber, amount, paymentDate } = req.body;

  if (!loanId || !utrNumber || !amount || !paymentDate) {
    res.status(400).json({ message: 'loanId, utrNumber, amount, and paymentDate are required.' });
    return;
  }

  if (utrNumber.trim().length < 6) {
    res.status(400).json({ message: 'UTR number must be at least 6 characters.' });
    return;
  }

  try {
    const loan = await Loan.findById(loanId);
    if (!loan) {
      res.status(404).json({ message: 'Loan not found.' });
      return;
    }

    if (loan.status !== 'disbursed') {
      res.status(400).json({ message: `Payments can only be recorded for disbursed loans. Current status: ${loan.status}` });
      return;
    }

    // Check UTR uniqueness globally
    const existingUTR = await Payment.findOne({ utrNumber: utrNumber.trim() });
    if (existingUTR) {
      res.status(409).json({ message: 'UTR number already exists. Each payment must have a unique UTR.' });
      return;
    }

    const paymentAmount = Number(amount);
    if (paymentAmount <= 0) {
      res.status(400).json({ message: 'Payment amount must be greater than 0.' });
      return;
    }

    // Calculate outstanding
    const outstanding = loan.totalRepayment - loan.amountPaid;
    if (paymentAmount > outstanding) {
      res.status(400).json({
        message: `Payment amount ₹${paymentAmount} exceeds outstanding balance ₹${outstanding.toFixed(2)}.`,
      });
      return;
    }

    // Create payment
    const payment = await Payment.create({
      loan: loanId,
      borrower: loan.borrower,
      recordedBy: req.user!.id,
      utrNumber: utrNumber.trim(),
      amount: paymentAmount,
      paymentDate: new Date(paymentDate),
    });

    // Update loan amount paid
    loan.amountPaid = Math.round((loan.amountPaid + paymentAmount) * 100) / 100;

    // Auto-close if fully paid
    if (loan.amountPaid >= loan.totalRepayment) {
      loan.status = 'closed';
    }

    await loan.save();

    res.status(201).json({
      message: loan.status === 'closed' ? 'Payment recorded. Loan is now CLOSED!' : 'Payment recorded successfully.',
      payment,
      loan: {
        id: loan._id,
        status: loan.status,
        amountPaid: loan.amountPaid,
        totalRepayment: loan.totalRepayment,
        outstanding: Math.max(0, loan.totalRepayment - loan.amountPaid),
      },
    });
  } catch (error: unknown) {
    if ((error as { code?: number }).code === 11000) {
      res.status(409).json({ message: 'UTR number already exists.' });
      return;
    }
    console.error('Payment error:', error);
    res.status(500).json({ message: 'Server error while recording payment.' });
  }
});

// GET /api/payments/loan/:loanId — All payments for a loan
router.get('/loan/:loanId', authenticate, authorize('admin', 'collection', 'borrower'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payments = await Payment.find({ loan: req.params.loanId })
      .populate('recordedBy', 'name')
      .sort({ paymentDate: -1 });
    res.json({ payments });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

export default router;
