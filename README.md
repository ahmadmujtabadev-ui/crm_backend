# CRM Backend API

> Node.js + Express + MongoDB backend for CRM system.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env file
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# 3. Run development server
npm run dev

# 4. Run production
npm start
```

## Environment Variables

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/crm_db
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d
NODE_ENV=development
```

---

## API Endpoints

### Auth — `/api/v1/auth`

| Method | Endpoint    | Auth | Description               |
|--------|-------------|------|---------------------------|
| POST   | /register   | No   | Register admin + org      |
| POST   | /login      | No   | Login, returns JWT        |
| GET    | /me         | Yes  | Get current user          |
| POST   | /logout     | Yes  | Logout (clears client)    |

**Register body:**
```json
{
  "name": "John Doe",
  "email": "admin@company.com",
  "password": "password123",
  "role": "admin",
  "organizationName": "My Company",
  "currency": "CAD"
}
```

---

### Client Management — `/api/v1/clients`

| Method | Endpoint | Auth | Description                        |
|--------|----------|------|------------------------------------|
| GET    | /        | Yes  | Get all clients (search/paginate)  |
| POST   | /        | Yes  | Create new client                  |
| GET    | /:id     | Yes  | Get client + invoice history       |
| PUT    | /:id     | Yes  | Update client                      |
| DELETE | /:id     | Yes  | Soft delete (deactivate)           |

**Query Params (GET /):** `search`, `status`, `page`, `limit`

**Create/Update body:**
```json
{
  "companyName": "Acme Corp",
  "contactPerson": "Jane Smith",
  "email": "jane@acme.com",
  "phone": "+1-555-0100",
  "address": "123 Main St, Toronto, ON"
}
```

---

### Invoicing Engine — `/api/v1/invoices`

| Method | Endpoint         | Auth | Description                   |
|--------|------------------|------|-------------------------------|
| GET    | /                | Yes  | List invoices (filter/page)   |
| POST   | /                | Yes  | Create invoice (atomic)       |
| GET    | /:id             | Yes  | Get invoice details           |
| PUT    | /:id             | Yes  | Update invoice                |
| PATCH  | /:id/status      | Yes  | Update payment status         |
| GET    | /:id/download    | Yes  | Generate & download PDF       |
| DELETE | /:id             | Yes  | Soft delete                   |

**Query Params (GET /):** `status`, `startDate`, `endDate`, `client`, `page`, `limit`

**Create body:**
```json
{
  "client": "CLIENT_MONGO_ID",
  "issue_date": "2024-01-15",
  "due_date": "2024-02-15",
  "status": "Draft",
  "tax_rate": 13,
  "notes": "Payment due in 30 days",
  "items": [
    { "description": "Web Development", "quantity": 10, "unit_price": 150 },
    { "description": "Hosting (1yr)", "quantity": 1, "unit_price": 200 }
  ]
}
```

**Status values:** `Draft` | `Sent` | `Paid` | `Partial` | `Overdue`

> ⚠️ **Backend auto-calculates** `line_total`, `subtotal`, `tax_amount`, `total_amount` — never trust frontend totals.

---

### Expenses — `/api/v1/expenses`

| Method | Endpoint | Auth | Description           |
|--------|----------|------|-----------------------|
| GET    | /        | Yes  | List expenses         |
| POST   | /        | Yes  | Create expense        |
| GET    | /:id     | Yes  | Get expense           |
| PUT    | /:id     | Yes  | Update expense        |
| DELETE | /:id     | Yes  | Soft delete           |

**Query Params (GET /):** `category`, `startDate`, `endDate`, `page`, `limit`

**Create** (multipart/form-data):
```
category: "Software"
amount: 299.99
expense_date: "2024-01-10"
description: "Annual SaaS subscription"
receipt: [file upload]
```

**Categories:** `Rent` | `Payroll` | `Supplies` | `Software` | `Marketing` | `Travel` | `Utilities` | `Other`

---

### Financial Analytics — `/api/v1/reports`

| Method | Endpoint   | Auth | Description                         |
|--------|------------|------|-------------------------------------|
| GET    | /summary   | Yes  | Dashboard stats + chart data        |
| GET    | /expenses  | Yes  | Expense report by category/date     |

**Summary Response includes:**
- `quickStats`: totalRevenue, totalExpenses, netProfit, monthlyProfit, outstandingInvoices
- `topClients`: Top 5 by revenue
- `statusBreakdown`: Invoice count/amount per status
- `charts.revenueByMonth` & `charts.expensesByMonth`: For line charts

---

### Organization — `/api/v1/organization`

| Method | Endpoint | Auth | Description             |
|--------|----------|------|-------------------------|
| GET    | /        | Yes  | Get org profile         |
| PUT    | /        | Yes  | Update org + logo upload|

**Update** (multipart/form-data):
```
name: "My Company"
tax_id: "BN-123456789"
currency: "CAD"
address: "456 Bay St, Toronto, ON"
logo: [file upload]
```

---

## Architecture Notes

- **Atomic Transactions**: Invoice creation uses MongoDB sessions — if any part fails, entire operation rolls back
- **Soft Deletes**: All financial records use `deletedAt` timestamp, never permanent DELETE
- **Backend Calculations**: All totals (line_total, subtotal, tax_amount, total_amount) computed server-side via Mongoose pre-save hook
- **PDF Generation**: Puppeteer renders professional HTML→PDF with org logo, client info, itemized table
- **Auth**: JWT Bearer token, 7-day expiry
