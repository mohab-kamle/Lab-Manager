# Implementation Plan: Patient Settlement Bills

This plan covers the frontend implementation of the Settlement feature for Admin and Receptionist roles.

## User Review Required

> [!IMPORTANT]
> The "Custom Settlement" logic uses an automated allocation strategy (FIFO - First In, First Out). If "Nearest" implies a different sorting (e.g., matching amounts), please clarify.

---

## Proposed Changes

### 1. New Component: `SettlementModal`
A comprehensive form/modal for processing payments.

- **Patient Search**: If opened from Dashboard, includes a searchable patient dropdown (similar to Invoice creation).
- **Invoices Table**: Displays a list of invoices with `due > 0` for the selected patient.
- **Allocation Modes**:
    - **Specific Selection**: Checkboxes to select specific invoices.
    - **Custom Amount (Bulk)**: Input field for a total amount that is automatically distributed.
- **Preview**: Real-time display of how the payment will be distributed across the listed invoices.
- **Payment Details**: Fields for Payment Method, Date, and Notes.

### 2. Patient Profile Update
**File**: `PatientProfileAdminView.jsx`

- **Settlement Card**:
    - Add a new card in the profile grid.
    - Display "Current Outstanding Balance".
    - Action Buttons: "Process Settlement" (opens modal with patient pre-selected).
- **Invoices Table Enhancement**:
    - Add a "Pay" or "Reconcile" button directly on each row in the existing invoices list (or placeholder section).

### 3. Dashboard Integration
**Files**: `AdminDashboard.jsx`, `ReceptionistDashboard.jsx`

- **Quick Actions**:
    - Add a "Settlement" button to the main dashboard cards or toolbar.
    - Clicking this opens the `SettlementModal` in its empty/search state.

---

## Task Breakdown

### Phase 1: Foundation
- [ ] Create `SettlementModal.jsx` component.
- [ ] Implement patient search/selection logic.
- [ ] Implement invoice fetching for the selected patient.

### Phase 2: Settlement Logic (UI)
- [ ] Implement "Manual Selection" logic (summing selected invoices).
- [ ] Implement "Custom Amount" logic (automated distribution preview).
- [ ] Add validation to prevent paying more than the total due.

### Phase 3: Profile Integration
- [ ] Add the Settlement Card to `PatientProfileAdminView.jsx`.
- [ ] Connect the card buttons to the `SettlementModal`.

### Phase 4: Dashboard Integration
- [ ] Add the entry point to `AdminDashboard.jsx`.
- [ ] Add the entry point to `ReceptionistDashboard.jsx`.

---

## Verification Plan

### Manual Verification
1. **From Profile**: Open settlement, enter an amount, verify it distributes to the oldest invoices first in the preview.
2. **From Dashboard**: Search for a patient, verify their due invoices load correctly.
3. **Validation**: Try to enter an amount greater than the total due and verify the "Can't pay more than total due" error appears.
4. **Role Check**: Ensure only Admin and Receptionist can see these buttons.
