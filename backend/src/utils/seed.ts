import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms';

const seedUsers = [
  { name: 'Admin User', email: 'admin@lms.com', password: 'Admin@123', role: 'admin' as const },
  { name: 'Sales Executive', email: 'sales@lms.com', password: 'Sales@123', role: 'sales' as const },
  { name: 'Sanction Executive', email: 'sanction@lms.com', password: 'Sanction@123', role: 'sanction' as const },
  { name: 'Disbursement Executive', email: 'disbursement@lms.com', password: 'Disbursement@123', role: 'disbursement' as const },
  { name: 'Collection Executive', email: 'collection@lms.com', password: 'Collection@123', role: 'collection' as const },
  { name: 'Test Borrower', email: 'borrower@lms.com', password: 'Borrower@123', role: 'borrower' as const },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  for (const userData of seedUsers) {
    const existing = await User.findOne({ email: userData.email });
    if (existing) {
      console.log(`⏭  Skipping ${userData.email} (already exists)`);
      continue;
    }
    await User.create(userData);
    console.log(`✅ Created: ${userData.email} [${userData.role}] — password: ${userData.password}`);
  }

  console.log('\n🎉 Seed complete!\n');
  console.log('Login Credentials:');
  console.table(seedUsers.map(u => ({ Email: u.email, Password: u.password, Role: u.role })));

  await mongoose.disconnect();
}

seed().catch(console.error);
