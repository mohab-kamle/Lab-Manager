# API Requirements: Patient Settlement Bills

This document outlines the backend API endpoints and logic required to support the Patient Settlement feature.

---

## 1. Data Models (Reference)

### 1.1. Invoices (Existing)
*   `id`: Primary Key
*   `patient_id`: Foreign Key
*   `total`: Decimal
*   `paid`: Decimal
*   `due`: Decimal (total - paid)
*   `date`: DateTime

### 1.2. Settlements (New)
*   `id`: Primary Key
*   `patient_id`: Foreign Key
*   `amount`: Decimal (Total payment received)
*   `payment_method_id`: Foreign Key
*   `date`: DateTime
*   `notes`: Text

### 1.3. SettlementItems (New/Links)
*   `settlement_id`: Foreign Key
*   `invoice_id`: Foreign Key
*   `amount_applied`: Decimal (Amount from this settlement applied to this specific invoice)

---

## 2. API Endpoints

### 2.1. GET /invoices/patient/:id/due
Fetches all invoices for a specific patient that have an outstanding balance (`due > 0`).

**Response:**
```json
[
  {
    "id": 101,
    "date": "2024-04-01",
    "total": 500.00,
    "paid": 200.00,
    "due": 300.00
  },
  {
    "id": 105,
    "date": "2024-04-15",
    "total": 1000.00,
    "paid": 0.00,
    "due": 1000.00
  }
]
```

### 2.2. POST /settlements
Processes a payment and reconciles it against one or more invoices.

**Payload:**
```json
{
  "patient_id": 1,
  "amount": 500.00,
  "payment_method_id": 2,
  "date": "2024-04-26T15:00:00Z",
  "notes": "Bulk payment for April tests",
  "invoice_ids": [101, 105], // Optional. If present, only these invoices are considered.
  "strategy": "automated" // "manual" or "automated" (custom)
}
```

---

## 3. Business Logic: Automated (Custom) Allocation

When `strategy` is `automated` (or no specific `invoice_ids` are provided with a partial amount), the backend must follow this settlement logic:

1.  **Retrieve Due Invoices**: Fetch all invoices for the patient where `due > 0`, sorted by `date` (Oldest First / "Nearest").
2.  **Validate Total Due**: Sum the `due` amounts of all retrieved invoices. If `payload.amount > total_due`, reject the request (Prevent overpayment unless credit system is explicitly requested).
3.  **Iterative Allocation**:
    *   Initialize `remaining_payment = payload.amount`.
    *   For each `invoice` in sorted list:
        *   If `remaining_payment <= 0`, break.
        *   `amount_to_apply = min(remaining_payment, invoice.due)`.
        *   Update `invoice.paid += amount_to_apply`.
        *   Update `invoice.due -= amount_to_apply`.
        *   Create `SettlementItem` linking this payment to the `invoice`.
        *   `remaining_payment -= amount_to_apply`.
4.  **Final Update**: Recalculate and update the `patient.total_due` (or equivalent financial summary field).
5.  **Transaction Record**: Save the `Settlement` header record.

---

## 4. Business Logic: Manual Allocation

If `invoice_ids` are provided and a specific amount is mapped to each (or distributed equally), apply payment specifically to those IDs and validate that no individual invoice `due` becomes negative.
