import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './utils/db';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import loanRoutes from './routes/loans';
import paymentRoutes from './routes/payments';
import dashboardRoutes from './routes/dashboard';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const rawFrontendUrls = process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:3000,https://*.vercel.app';
const allowedOrigins = rawFrontendUrls
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const originMatches = (origin: string, pattern: string) => {
  if (pattern === '*') return true;
  if (!pattern.includes('*')) return origin === pattern;
  const regex = new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`);
  return regex.test(origin);
};

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(pattern => originMatches(origin, pattern))) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Connect DB and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});

export default app;
