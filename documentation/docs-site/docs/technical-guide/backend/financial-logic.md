---
sidebar_position: 7
title: Financial & Billing Logic
---

# Financial & Billing Logic

LabManager implements a robust, transactional financial system designed to handle multi-tenant laboratory billing, including automated tax calculations, commission tracking, and patient debt management.

## Percentage-Based Tax System

The system has transitioned from fixed-amount taxes to a flexible **percentage-based model**.

- **Tax Calculation**: Taxes are calculated as a percentage of the subtotal (Subtotal * Tax Rate).
- **Precision**: The database stores tax rates with high precision (e.g., 0.14 for 14%) and rounds final tax amounts to 2 decimal places.
- **Bidirectional Input**: The frontend allows entering either a percentage or an absolute amount, with the backend normalizing the data before persistence.

## Atomic Billing Transactions

Every invoice created (`POST /invoices`) is wrapped in a **database transaction** to ensure data integrity across multiple tables:

1. **Bill Creation**: Records the core financial data (subtotal, discount, tax, total, paid, due).
2. **Patient Financial Update**: Automatically updates the patient's cumulative `total`, `paid`, and `due` balances.
3. **Doctor Commission**: Calculates and adds commissions to the referring doctor's `total_gain` and `due` accounts.
4. **Medical Report Trigger**: Automatically initializes a corresponding `medical_report` record if the invoice contains tests.

### Validation Rules
- **Patient Due Limit**: If a lab has configured a `patient_due_limit`, the system will block invoice creation if the new total debt exceeds this threshold, unless a `bypass_due_limit` flag is provided by an authorized user.
- **Refund-Only Removal**: Test removal from an existing invoice is restricted to the **Refund Flow** to maintain an audit trail.

## Patient Debt & Credit

Patient balances are managed globally across all their invoices:

- **Gross Debt**: The sum of all positive `due` amounts from individual invoices.
- **Gross Credit**: The sum of all negative `due` amounts (overpayments).
- **Net Balance**: The difference between gross debt and gross credit.

### Refund Logic
When a refund is processed:
1. **Debt Reduction**: The system first attempts to reduce any existing net debt for the patient.
2. **Credit Addition**: If the refundable amount exceeds the debt, the remainder is added as **Patient Credit** (negative due) or paid out in cash.
3. **Atomic Rollback**: If any part of the refund calculation fails, the entire transaction (including invoice status updates and patient balance changes) is rolled back.
