import { Router, Response } from 'express';
import Loan from '../models/Loan';
import User from '../models/User';
import Payment from '../models/Payment';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// ========== SALES MODULE ==========
// GET /api/dashboard/sales — Users who registered but haven't applied
router.get('/sales', authenticate, authorize('admin', 'sales'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get all borrower user IDs
    const borrowers = await User.find({ role: 'borrower' }).select('-password');

    // Get borrower IDs that have at least one loan
    const appliedBorrowerIds = await Loan.distinct('borrower');

    // Leads = borrowers with NO loan
    const leads = borrowers.filter(
      (b) => !appliedBorrowerIds.some((id) => id.toString() === b._id.toString())
    );

    // Also get borrowers with loans for full visibility
    const applicants = borrowers.filter(
      (b) => appliedBorrowerIds.some((id) => id.toString() === b._id.toString())
    );

    res.json({ leads, applicants, totalBorrowers: borrowers.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ========== SANCTION MODULE ==========
// GET /api/dashboard/sanction — Applied loans
router.get('/sanction', authenticate, authorize('admin', 'sanction'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const loans = await Loan.find({ status: 'applied' })
      .populate('borrower', 'name email')
      .sort({ createdAt: -1 });
    res.json({ loans });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/dashboard/sanction/:loanId/approve
router.post('/sanction/:loanId/approve', authenticate, authorize('admin', 'sanction'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const loan = await Loan.findById(req.params.loanId);
    if (!loan) { res.status(404).json({ message: 'Loan not found.' }); return; }
    if (loan.status !== 'applied') {
      res.status(400).json({ message: `Cannot sanction a loan with status: ${loan.status}` });
      return;
    }

    loan.status = 'sanctioned';
    loan.sanctionedBy = req.user!.id as unknown as typeof loan.sanctionedBy;
    loan.sanctionedAt = new Date();
    await loan.save();

    res.json({ message: 'Loan sanctioned successfully.', loan });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/dashboard/sanction/:loanId/reject
router.post('/sanction/:loanId/reject', authenticate, authorize('admin', 'sanction'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { reason } = req.body;
  if (!reason || reason.trim().length < 5) {
    res.status(400).json({ message: 'Rejection reason is required (min 5 characters).' });
    return;
  }

  try {
    const loan = await Loan.findById(req.params.loanId);
    if (!loan) { res.status(404).json({ message: 'Loan not found.' }); return; }
    if (loan.status !== 'applied') {
      res.status(400).json({ message: `Cannot reject a loan with status: ${loan.status}` });
      return;
    }

    loan.status = 'rejected';
    loan.rejectionReason = reason.trim();
    loan.rejectedBy = req.user!.id as unknown as typeof loan.rejectedBy;
    loan.rejectedAt = new Date();
    await loan.save();

    res.json({ message: 'Loan rejected.', loan });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ========== DISBURSEMENT MODULE ==========
// GET /api/dashboard/disbursement — Sanctioned loans
router.get('/disbursement', authenticate, authorize('admin', 'disbursement'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const loans = await Loan.find({ status: 'sanctioned' })
      .populate('borrower', 'name email')
      .populate('sanctionedBy', 'name')
      .sort({ sanctionedAt: -1 });
    res.json({ loans });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/dashboard/disbursement/:loanId/disburse
router.post('/disbursement/:loanId/disburse', authenticate, authorize('admin', 'disbursement'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const loan = await Loan.findById(req.params.loanId);
    if (!loan) { res.status(404).json({ message: 'Loan not found.' }); return; }
    if (loan.status !== 'sanctioned') {
      res.status(400).json({ message: `Cannot disburse a loan with status: ${loan.status}` });
      return;
    }

    loan.status = 'disbursed';
    loan.disbursedBy = req.user!.id as unknown as typeof loan.disbursedBy;
    loan.disbursedAt = new Date();
    await loan.save();

    res.json({ message: 'Loan disbursed successfully.', loan });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ========== COLLECTION MODULE ==========
// GET /api/dashboard/collection — Disbursed loans
router.get('/collection', authenticate, authorize('admin', 'collection'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const loans = await Loan.find({ status: { $in: ['disbursed', 'closed'] } })
      .populate('borrower', 'name email')
      .populate('disbursedBy', 'name')
      .sort({ disbursedAt: -1 });

    // Attach payments for each loan
    const loansWithPayments = await Promise.all(
      loans.map(async (loan) => {
        const payments = await Payment.find({ loan: loan._id }).sort({ paymentDate: -1 });
        return { ...loan.toObject(), payments };
      })
    );

    res.json({ loans: loansWithPayments });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ========== ADMIN: ALL LOANS ==========
router.get('/admin/loans', authenticate, authorize('admin'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const loans = await Loan.find()
      .populate('borrower', 'name email')
      .sort({ createdAt: -1 });
    res.json({ loans });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET specific loan detail (admin/executives)
router.get('/loan/:loanId', authenticate, authorize('admin', 'sales', 'sanction', 'disbursement', 'collection'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const loan = await Loan.findById(req.params.loanId)
      .populate('borrower', 'name email')
      .populate('sanctionedBy', 'name')
      .populate('rejectedBy', 'name')
      .populate('disbursedBy', 'name');

    if (!loan) { res.status(404).json({ message: 'Loan not found.' }); return; }

    const payments = await Payment.find({ loan: loan._id }).sort({ paymentDate: -1 });
    res.json({ loan, payments });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

export default router;
