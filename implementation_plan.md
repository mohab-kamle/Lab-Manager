
# Technical Implementation Guide: Invoice Refund & Authorization System

This document provides detailed frontend instructions for implementing the secure refund system, authorization key management, and comprehensive invoice history tracking.

---

## 1. Role Access Control
- **Admin**: Full access to Refunds, Invoice History, and Manager Key Management.
- **Receptionist**: Access to Refunds and Invoice History only.
- **Location for Key Management**: `Sidebar > Manage Branches > Manager Key Management`.

---

## 2. Authorization Key Management (Admin Only)
**Component**: `client/src/pages/admin/ManagerKeyManagement.jsx`

### Generate Key Workflow
1. **Initial Trigger**: Button "Generate Authorization Key".
2. **Inputs**:
   - `Key Name`: Optional custom name. 
   - **Naming Logic**: If empty, default to `[adminName]_[keyNumber]`. Otherwise, `[adminName]_[customName]`.
3. **The Warning**: Before saving, show a prominent warning: *"This is the only time you will see the full key. Please copy it or take a screenshot."*
4. **Expiry**: Explicitly mention keys expire after 6 months. Display the calculated `Expire Date` (Current + 6 months).
5. **Storage**: Keys should be hashed server-side, but the first 4 digits are stored/shown for identification.

### Key Management Table
Use `@[client/src/components/ui/DynamicTable.jsx]` with the following columns:
- **Date**: Creation date.
- **Key ID**: System ID.
- **Name**: `adminName_name1`.
- **Key**: Masked format (e.g., `ABCD****`).
- **Expire Date**: 6 months from creation.
- **Status**: "Active" or "Expired" (Red badge).
- **Actions**: Delete button.
  - **Security**: Clicking delete requires a prompt where the user must type `'confirm delete'` to proceed.

---

## 3. Refund Logic & Constraints
**Component**: `client/src/components/invoices/RefundModal.jsx`

### Logic Tiers
- **< 24 Hours**: Direct refund. No Auth Key required.
- **> 24 Hours**: 
  1. Show a visible warning: *"This invoice was created more than 24 hours ago. Manager authorization is required."*
  2. Add a mandatory checkbox: `[ ] I am sure I want to process this refund`.
  3. **Confirmation Window**: Upon clicking the final refund button, a confirm window (via `ToastContext`) must appear.
     - **Required Inputs**: 
       - User must type `'Confirm Refund'`.
       - User must enter the **Authorization Key**.

### Refund Calculation & Credit
1. **Item Selection**: User selects specific items (tests/packages).
2. **Amount Calculation**: 
   - Display `Total Refundable Amount` (Sum of selected items).
   - Display `Current Invoice Credit` (If any exists, it must be included in the refund directly).
3. **Lab Payment Input**: A field `"Amount Lab will pay now"`.
4. **Auto-Credit Handling**:
   - If `Amount Lab Pays` < `Total Refund Amount`: The difference is automatically added to the Patient's Credit balance.
   - Example: Refund is $100. Lab pays $40. Patient gets $40 cash and $60 added to their system credit.

---

## 4. Invoice History (Float Window)
**Component**: `client/src/components/invoices/InvoiceHistoryDrawer.jsx`

Accessible via a "History" button on each invoice row. It should show a vertical timeline/table containing:
- **Creation Date**: When the invoice was first opened.
- **Payment Method**: (e.g., Cash, Visa, Insurance).
- **Payment Log**: List of every payment action (Amount, Date, Due remaining, Credit generated).
- **Refund Details**: Date, Type (Partial/Full), and specifically the **Authorization Key Name** used for the refund.
- **Completion Date**: The date when the invoice status moved to "Fully Paid".

---

## 5. UI Updates to Existing Pages

### `@[client/src/pages/invoices/Invoices.jsx]`
1. **New Column**: "Age" (Calculated as `today - creationDate`). Display as `'X days'`.
2. **Row Actions**:
   - 🕒 **History Button**: Opens the Invoice History Float Window.
   - 🔄 **Refund Button**: Opens the Refund Modal (Disabled if invoice is already fully refunded).

### `@[client/src/pages/admin/TransactionsVault.jsx]`
1. **Refund Records**: Update the table/summary to include the **Authorization Key Name** (`adminName_name1`) associated with every refund transaction for auditing.

---

## 6. Frontend Security Notes
- **Key Validation**: Always validate Authorization Keys via a dedicated backend endpoint before submitting the refund transaction.
- **Expiry Check**: Frontend should immediately block/error if an expired key is attempted.
- **Confirm Logic**: Use the `confirm` object from `useToast` but extend the UI to support the "Confirm Refund" text match and key input fields.

> [!IMPORTANT]
> Refund logic must ensure that any existing credit on the invoice is settled first before calculating new payouts.
