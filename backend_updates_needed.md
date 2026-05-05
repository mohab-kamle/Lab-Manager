
# Backend Updates Needed: Invoice Refund & Authorization System

The following backend updates are required to support the frontend implementation of the secure refund system and authorization key management.

## 1. Database Schema (Sequelize Models)

### `manager_key.js` (NEW MODEL)
- `id`: Primary Key.
- `key_hash`: Hashed version of the authorization key (using `bcrypt` or similar).
- `key_name`: Optional custom name (e.g., `adminName_name1`).
- `first_four`: Stored first 4 digits for identification (e.g., `ABCD`).
- `admin_id`: Reference to the admin who created it.
- `lab_id`: Reference to the lab.
- `expires_at`: Expiration date (exactly 6 months from creation).
- `is_active`: Boolean (default: true).
- **Indices**: `lab_id`, `admin_id`.

### `financial_transaction.js` (NEW MODEL)
- `id`: Primary Key.
- `lab_id`: Reference to the lab.
- `branch_id`: Reference to the branch.
- `bill_id`: Reference to the invoice (`bill` table).
- `patient_id`: Reference to the patient.
- `amount`: Decimal(10, 2). Positive for payments, negative for refunds.
- `transaction_type`: ENUM ('Payment', 'Refund', 'Adjustment').
- `process_type`: ENUM ('Cash', 'Credit', 'Mixed').
- `manager_key_id`: Reference to `manager_key.id` (Optional, only for authorized refunds).
- `refund_items`: JSON field storing details of refunded tests/packages: `[{ id: 1, type: 'test', price: 50 }, ...]`.
- `created_at`: Timestamp.
- `receptionist_id`: Reference to the receptionist who processed it.

### `patient.js` (UPDATE)
- Add `credit`: Decimal(10, 2), default: 0.00. (To track balance from partial refunds).

### `bill.js` (UPDATE)
- Ensure status can reflect "Partially Refunded" or "Fully Refunded" if not already covered by existing statuses.

## 2. API Endpoints

### Authorization Keys (`/api/admin/keys`)
- `POST /`: 
  - Generate a random 16-character alphanumeric key.
  - Hash it and store in `manager_key`.
  - Return the **plain-text key** in the response (ONLY ONCE).
- `GET /`: List all keys for the current lab. Return `id`, `key_name`, `first_four`, `expires_at`, `is_active`.
- `DELETE /:id`: Hard delete or set `is_active = false`.

### Refunds (`/api/invoices/:id/refund`)
- `POST /`: 
  - **Payload**: `{ items: [], amountLabPays: 0, authKey: "..." }`.
  - **Verification**: 
    - If `bill.date` > 24 hours ago, `authKey` is MANDATORY.
    - Validate `authKey` against active, non-expired keys for the lab.
  - **Calculations**:
    - `totalRefundAmount` = sum of prices of `items`.
    - If `amountLabPays < totalRefundAmount`: 
      - `creditAmount = totalRefundAmount - amountLabPays`.
      - Increment `patient.credit` by `creditAmount`.
  - **Database Updates**:
    - Update `bill.paid` (decrease by `totalRefundAmount`).
    - Update `bill.due` (should be adjusted carefully).
    - Create `financial_transaction` record with `transaction_type = 'Refund'`.
    - If `authKey` used, link `manager_key_id`.

### Invoice History (`/api/invoices/:id/history`)
- `GET /`: Aggregate data from `bill`, `financial_transaction`, and `lab_activity_log`.
  - Return chronological array:
    - `created_at`: Invoice opened.
    - `payment`: amount, date, method.
    - `refund`: amount, date, items, authKeyName.
    - `status_change`: from, to, date.

## 3. Middleware & Security Utilities

### `authKeyValidator.js`
- Utility function to:
  1. Retrieve all active keys for a `lab_id`.
  2. Iterate and compare provided `authKey` using `bcrypt.compare`.
  3. Return the `manager_key` object if valid, else throw error.

### Automated Expiry
- Backend should check `expires_at` during any key validation.
- (Optional) A cron job to mark keys as `is_active = false` after 6 months.
