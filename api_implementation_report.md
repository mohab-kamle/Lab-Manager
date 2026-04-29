# API Implementation Report: Invoice Refund & Security System

This report details the new and updated API endpoints required to support the recently implemented frontend features: **Invoice Refund Modal**, **Manager Key Management**, and the **Invoice History Audit Trail**.

---

## 1. Authorization & Manager Keys (`/api/admin/keys`)
Used to manage high-security alphanumeric keys required for sensitive financial operations (like older refunds).

### `GET /api/admin/keys`
- **Purpose**: List all authorization keys for the current lab.
- **Access**: Admin only.
- **Response**:
  ```json
  [
    {
      "id": 1,
      "key_name": "Admin_Manager_1",
      "first_four": "A1B2",
      "expires_at": "2026-10-30T00:00:00Z",
      "is_active": true
    }
  ]
  ```

### `POST /api/admin/keys`
- **Purpose**: Generate a new random 16-character authorization key.
- **Payload**: `{ "key_name": "string" }`
- **Logic**: 
  - Backend generates a random 16-char string.
  - Hashes the string (bcrypt) for storage.
  - Stores the `first_four` characters for display/identification.
- **Response (CRITICAL)**: Returns the **plain-text key** only once.
  ```json
  {
    "id": 2,
    "plain_text_key": "A1B2-C3D4-E5F6-G7H8",
    "message": "Store this key securely. It will not be shown again."
  }
  ```

### `DELETE /api/admin/keys/:id`
- **Purpose**: Revoke/Delete an authorization key.
- **Logic**: Set `is_active = false` or hard delete.

---

## 2. Invoice Refunds (`/api/invoices/:id/refund`)
Handles the complex logic of returning funds, adjusting bills, and updating patient credit.

### `POST /api/invoices/:id/refund`
- **Purpose**: Process a full or partial refund for a specific invoice.
- **Payload**:
  ```json
  {
    "items": {
      "tests": [{ "id": 1, "price": 50.00 }],
      "packages": []
    },
    "amountLabPays": 10.00,
    "authKey": "A1B2-C3D4-E5F6-G7H8"
  }
  ```
- **Backend Logic**:
  1. **Age Check**: If invoice is > 24 hours old, `authKey` validation is mandatory.
  2. **Key Validation**: Compare provided `authKey` against hashed keys in `manager_keys`.
  3. **Financial Update**:
     - Decrease `bill.paid` by total refund value.
     - If `amountLabPays` < total refund value, add remainder to `patient.credit`.
  4. **Record Transaction**: Create a entry in `financial_transactions` with type `Refund`.
  5. **Log Activity**: Add entry to `lab_activity_log`.

---

## 3. Invoice Audit Trail (`/api/invoices/:id/history`)
Aggregates lifecycle data for a single bill.

### `GET /api/invoices/:id/history`
- **Purpose**: Fetch a chronological list of all events related to an invoice.
- **Data Sources**: `bills`, `financial_transactions`, `lab_activity_log`, `manager_keys`.
- **Response**:
  ```json
  [
    { "type": "created", "date": "...", "user": "Receptionist A" },
    { "type": "payment", "amount": 100, "method": "Cash", "date": "..." },
    { "type": "refund", "amount": 50, "authorized_by": "Admin Key (A1B2)", "date": "..." }
  ]
  ```

---

## 4. Transaction Audit (`/api/admin/transactions`)
Updates to existing financial monitoring.

### `GET /api/admin/transactions` (Updated)
- **Change**: Now includes `Refund` type transactions.
- **Filter**: Ensure admins can filter by `processType: 'Refund'`.
- **Calculation**: Total Net revenue now subtracts `Refund` amounts from `Payment` amounts.

### `GET /api/patient/:id/transactions` (NEW)
- **Purpose**: Fetch the recent transaction history for a specific patient.
- **Parameters**: `limit` (default: 5).
- **Response**:
  ```json
  [
    {
      "transactionId": "TXN-123",
      "date": "2026-04-30T00:00:00Z",
      "amount": 150.00,
      "processType": "Payment",
      "summary": "Full payment for invoice #101"
    }
  ]
  ```

---

## 🗄️ Database Schema Summary
- **New Table**: `manager_keys` (id, hash, first_four, name, lab_id, expiry).
- **New Table**: `financial_transactions` (lab_id, bill_id, amount, type, receptionist_id, manager_key_id).
- **Updated Table**: `patients` (added `credit` field).
- **Updated Table**: `bills` (added `refunded_amount` field).
