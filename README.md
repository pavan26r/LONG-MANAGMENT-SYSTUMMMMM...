# 🏦 Loan Management System (LMS)

A full-stack MERN + Next.js Loan Management System with borrower portal, multi-step application flow with BRE, and an operations dashboard with RBAC.

## Tech Stack
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express.js + TypeScript
- **Database**: MongoDB + Mongoose
- **Auth**: JWT + bcrypt

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB running locally (or MongoDB Atlas URI)

### 1. Clone the repo
```bash
git clone <repo-url>
cd lms
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm install
npm run seed    # Creates one account per role
npm run dev     # Starts on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd frontend
cp .env.example .env.local
# Edit .env.local — set NEXT_PUBLIC_API_URL=http://localhost:5000
npm install
npm run dev     # Starts on http://localhost:3000
```

---

## 🔑 Login Credentials (after running seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@lms.com | Admin@123 |
| Sales | sales@lms.com | Sales@123 |
| Sanction | sanction@lms.com | Sanction@123 |
| Disbursement | disbursement@lms.com | Disbursement@123 |
| Collection | collection@lms.com | Collection@123 |
| Borrower | borrower@lms.com | Borrower@123 |

---

## 📐 Architecture

### Database Collections
- **users** — All users with roles
- **loans** — Full loan lifecycle data (personal details, BRE data, config, status, audit trail)
- **payments** — Payment records with unique UTR per payment

### Loan Status Lifecycle
```
APPLIED → SANCTIONED → DISBURSED → CLOSED
       ↘ REJECTED
```

| Transition | Triggered By |
|------------|--------------|
| applied | Borrower (on form submit) |
| sanctioned | Sanction executive |
| rejected | Sanction executive |
| disbursed | Disbursement executive |
| closed | Auto (when amountPaid >= totalRepayment) |

### RBAC
- Each executive role → accesses only their module
- Admin → accesses all 4 modules
- Borrower → cannot access dashboard at all
- Enforced on both frontend (redirect) AND backend (middleware returns 403)

### BRE (Business Rule Engine)
Runs on **both client and server**:
- Client: immediate feedback without round-trip
- Server: authoritative check; can't be bypassed

Rules:
1. Age between 23–50
2. Monthly salary ≥ ₹25,000
3. PAN matches `/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/`
4. Employment mode ≠ unemployed

### Loan Calculation
```
SI = (Principal × 12 × Tenure_days) / (365 × 100)
Total Repayment = Principal + SI
```

### API Routes
| Method | Route | Role |
|--------|-------|------|
| POST | /api/auth/register | Public |
| POST | /api/auth/login | Public |
| GET | /api/auth/me | Any auth |
| POST | /api/loans/check-eligibility | Borrower |
| POST | /api/loans/upload-salary-slip | Borrower |
| POST | /api/loans/apply | Borrower |
| GET | /api/loans/my | Borrower |
| GET | /api/dashboard/sales | Admin, Sales |
| GET | /api/dashboard/sanction | Admin, Sanction |
| POST | /api/dashboard/sanction/:id/approve | Admin, Sanction |
| POST | /api/dashboard/sanction/:id/reject | Admin, Sanction |
| GET | /api/dashboard/disbursement | Admin, Disbursement |
| POST | /api/dashboard/disbursement/:id/disburse | Admin, Disbursement |
| GET | /api/dashboard/collection | Admin, Collection |
| POST | /api/payments | Admin, Collection |
| GET | /api/payments/loan/:id | Admin, Collection, Borrower |

---

## 📁 Project Structure

```
lms/
├── backend/
│   ├── src/
│   │   ├── index.ts            # Express app + server
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── Loan.ts
│   │   │   └── Payment.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── loans.ts
│   │   │   ├── payments.ts
│   │   │   ├── dashboard.ts
│   │   │   └── users.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts         # JWT + RBAC middleware
│   │   │   └── upload.ts       # Multer config
│   │   └── utils/
│   │       ├── db.ts
│   │       ├── bre.ts          # BRE + loan math
│   │       └── seed.ts
│   └── uploads/                # Salary slip files
└── frontend/
    └── src/
        ├── app/
        │   ├── auth/login/
        │   ├── auth/register/
        │   ├── borrower/apply/  # Multi-step application
        │   └── dashboard/
        │       ├── sales/
        │       ├── sanction/
        │       ├── disbursement/
        │       └── collection/
        ├── components/
        ├── context/AuthContext.tsx
        ├── lib/
        │   ├── api.ts           # Axios + interceptors
        │   └── bre.ts           # Client-side BRE
        └── types/index.ts
```
