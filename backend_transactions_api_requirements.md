# Backend Implementation Report: Transactions & Financial Audit API

## 1. Context & Objective
The frontend requires a unified "Transactions History" feed. 
Currently, the system handles financials by updating aggregates on the `patient` table (`total`, `paid`, `due`) and adding records to `bill_has_payment_method`. However, this does not create a chronological audit trail of *events* (e.g., when exactly was a due amount generated, or when was a specific payment made by which receptionist).

To bridge the gap between the frontend UI needs and the database reality, we must implement an **Event-Driven Ledger System**.

---

## 2. Database Schema Updates (Sequelize)

You must create a new model: `financial_transaction` (or `patient_transaction`).

### Suggested Model: `financial_transaction.js`
```javascript
const Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('financial_transaction', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    transaction_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Unique identifier shared with front-end (e.g., TXN-20240425-001)'
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'The monetary value of the event'
    },
    process_type: {
      type: DataTypes.ENUM('Payment', 'Refund', 'Due', 'Credit'),
      allowNull: false,
      comment: 'The nature of the financial event'
    },
    change_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Amount returned to patient in case of overpayment'
    },
    
    // --- Relations ---
    
    patient_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Nullable if it's a non-patient system transaction
      references: { model: 'patient', key: 'id' }
    },
    bill_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Not all transactions (like direct credits) stem from a bill
      references: { model: 'bill', key: 'id' }
    },
    payment_method_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'payment_method', key: 'id' }
    },
    processed_by_type: {
      type: DataTypes.ENUM('admin', 'receptionist', 'system'),
      allowNull: false,
      comment: 'Polymorphic relation to track who performed the action'
    },
    processed_by_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID of the admin or receptionist'
    },
    lab_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'lab', key: 'id' }
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'branch', key: 'id' }
    }
  });
};
```

---

## 3. Business Logic Updates (Event Triggers)

The `financial_transaction` table must act as an append-only ledger. You need to hook into existing routes to generate these events.

**Location**: `server/routes/invoices.js` (POST `/` and PUT `/:id`)
When a bill is created or updated:
1. **If `req.body.paid > 0`**: Create a `financial_transaction` record with `process_type: 'Payment'`, mapping the `payment_method_id`.
    *   **Overpayment & Change**: If the paid amount exceeds the bill total and `give_change` is true, the frontend will send `original_paid` (the full amount handed over) and `change_amount` (the change given back). The backend should:
        *   Set `financial_transaction.amount = req.body.original_paid`.
        *   Set `financial_transaction.change_amount = req.body.change_amount`.
        *   This ensures the ledger reflects the actual cash received and the amount handed back in a single audit event.
2. **If `req.body.due > 0`**: Create a `financial_transaction` record with `process_type: 'Due'`, leaving `payment_method_id` null.
3. Ensure both records are attached to the same `transaction` object so they rollback if the invoice fails.

---

## 4. API Endpoints for Frontend

### A. Admin Global Transactions Vault
**Endpoint**: `GET /api/admin/transactions`
**Auth**: Admin/Receptionist Token
**Query Params**: `?patient_id=123&startDate=2024-01-01&endDate=2024-01-31&process_type=Payment`

**Backend Responsibilities**:
1. Query `financial_transaction`.
2. Join `patient` (to get patient name and ID).
3. Join `payment_method` (to get method name).
4. Join the creator based on `processed_by_type` and `processed_by_id` to get the Employee/Admin name.
5. Join `bill` -> `bill_has_test` / `bill_has_package` to generate a lightweight comma-separated summary string (e.g., "CBC, Glucose").

**Response Format**:
```json
[
  {
    "transactionId": "TXN-20240425-001",
    "date": "2024-04-25T14:30:00.000Z",
    "amount": 120.50,
    "changeAmount": 0,
    "processType": "Payment",
    "paidWith": "Visa",
    "processedBy": {
      "id": 4,
      "name": "Sarah Ahmed",
      "role": "receptionist"
    },
    "patient": {
      "id": 552,
      "name": "John Doe"
    },
    "invoiceId": 1001,
    "summary": "CBC, Liver Profile"
  }
]
```

### B. Patient Personal History
**Endpoint**: `GET /api/patient/transactions`
**Auth**: Patient Token (`req.user.role === 'patient'`)

**Backend Responsibilities**:
1. Query `financial_transaction` where `patient_id = req.user.id`.
2. Join `lab` and `branch` to provide location context.
3. Join `payment_method`.
4. Join `bill` to get the test/package summary.
*Note: Do NOT expose the `processedBy` details to the patient.*

**Response Format**:
```json
[
  {
    "transactionId": "TXN-20240425-001",
    "date": "2024-04-25T14:30:00.000Z",
    "amount": 120.50,
    "processType": "Payment",
    "paidWith": "Visa",
    "labName": "City Labs",
    "branchName": "Downtown Branch",
    "invoiceId": 1001,
    "summary": "CBC, Liver Profile"
  }
]
```

---

## 5. Key Takeaways for Backend Developer
- **Do not rely solely on `bill_has_payment_method`**: It lacks chronological tracking, event typing (Due vs Refund), and polymorphic user tracking (Who did it?).
- **Transaction uniqueness**: Generate a robust `transaction_code` (e.g., using a short UUID or date-based hash) to be used as the shared identifier between Admin and Patient views.
- **Data aggregation**: The frontend does *not* want to make multiple requests to fetch the invoice summary. The backend must do the heavy lifting of joining `bill_has_test` and `test` names into a single `summary` string before sending the JSON response.
