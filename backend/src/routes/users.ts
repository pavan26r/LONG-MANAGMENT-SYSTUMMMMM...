import { Router, Response } from 'express';
import User from '../models/User';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/users — Admin only: list all users
router.get('/', authenticate, authorize('admin'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

export default router;
