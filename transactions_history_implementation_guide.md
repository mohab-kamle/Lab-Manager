# Technical Specification: Global Transactions & Financial Audit System

## 1. Objective
Implement a centralized financial tracking system. 
- **Admin View**: A global audit log of every financial event (Payment, Refund, Credit, Due generation) occurring in the system.
- **Patient View**: A personalized history of financial events related to their account, including lab/branch context and service summaries.

---

## 2. API Contract (Event-Based Architecture)

A "Transaction" in this system represents a **Financial Event**, which may or may not be linked to an Invoice. Every transaction must have a unique `transactionId` shared between admin and patient views.

### A. Admin Global Log
- **Endpoint**: `GET /api/admin/transactions`
- **Auth**: Admin 
- **Purpose**: System-wide financial auditing.

### B. Patient Personal History
- **Endpoint**: `GET /api/patient/transactions`
- **Auth**: Patient
- **Purpose**: Personal billing transparency.

### C. Transaction Object Structure
```json
{
  "transactionId": "TXN-99021", 
  "date": "2024-04-25T14:30:00Z",
  "amount": 120.50,
  "processType": "Payment", // e.g., "Payment", "Refund", "Credit", "Due Settlement"
  "paidWith": "Visa", // e.g., "Cash", "Visa", "Wallet", "Insurance"
  
  // Admin only fields
  "processedBy": {
    "id": "EMP-04",
    "name": "Sarah Ahmed",
    "role": "Receptionist"
  },
  
  // Contextual info
  "patientId": "PAT-552", // Optional (null if global adjustment)
  "invoiceId": "INV-1001", // Optional (null if direct credit/adjustment)
  "branchName": "Main City Branch", 
  
  // Summary for UI
  "summary": "CBC, Liver Profile, Glucose" // Concise list of tests/packages, If there are any 
}
```

---

## 3. Frontend Architecture

### A. New Pages to Implement
1. **Global Transactions Log (Admin)**
   - **Path**: `client/src/pages/admin/TransactionsVault.jsx`
   - **Features**: 
     - Multi-filter (by Process Type, Payment Method, Employee, and Date).
     - Export to CSV/Excel button for accounting.
     - Real-time "Total Processed" counters.

2. **My Transactions (Patient)**
   - **Path**: `client/src/pages/patient/PatientTransactions.jsx`
   - **Features**:
     - Visual breakdown of payments vs dues. 
     - Clear labeling of which branch processed the transaction.

### B. Shared UI Components
- **`TransactionStatusBadge.jsx`**:
  - `Payment`: Green/Success
  - `Refund`: Orange/Warning
  - `Due`: Red/Danger
  - `Credit`: Blue/Info
- **`TransactionSummaryRow.jsx`**:
  - A compact row component that expands to show `processedBy` details for admins.

---

## 4. UI/UX Design Standards

### Admin View (The "Audit Trail" Aesthetic)
- **Layout**: High-density table with sticky headers.
- **Micro-interactions**: 
  - Clicking a `patientId` navigates to their profile.
  - Clicking an `invoiceId` opens the invoice PDF/Modal.
- **Visual Cues**: Use subtle background colors for different process types (e.g., light red for refunds) to allow quick scanning of the log.

### Patient View (The "Consumer Statement" Aesthetic)
- **Layout**: Card-based or clean list view focusing on the `branchName` and `amount`.
- **Summary**: Ensure `invoiceSummary` is truncated gracefully (e.g., "CBC, Glucose + 3 more").

---

## 5. Implementation Roadmap

1. **Transaction Event Model**: Ensure the backend can aggregate events from `bill`, `bill_has_payment_method`, and any upcoming `refunds` table.
2. **Global Admin View**: Implement the `TransactionsVault.jsx` with full filtering capabilities.
3. **Patient View**: Update the existing `PatientInvoices.jsx` logic to fetch from the new `transactions` endpoint instead of just raw invoices.
4. **ID Consistency**: Ensure the `transactionId` is generated once at the database level and remains immutable for both views.

---

## 6. Development Tools 
- **State Management**: `react-query` or `SWR` is recommended for the Global Log to handle caching and pagination efficiently.
- **Icons**: `react-bootstrap-icons` (e.g., `ArrowUpRight` for payments, `ArrowDownLeft` for refunds).
- **Formatting**: Use `src/utils/dateFormatter.js` and a new `src/utils/currencyFormatter.js`.
