# Implementation Plan: Sample Barcode Management & Tracking Integration - V8

This final plan outlines the implementation of the read-only Sample Quick Info Modal, fully aligned with the backend tracking APIs and specific UI navigation requirements.

## 1. Database & Models Update

### [MODIFY] [server/models/lab_samples.js](file:///home/zaid/Project/Lab-Manager/server/models/lab_samples.js)
- Ensure columns match tracking requirements:
    - `medical_report_id` (Int)
    - `test_id` (Int)
    - `sample_type_id` (Int)
    - `status` (String) - Default: "Pending Collection"
    - `status_history` (JSON) - To store timestamps for tracking stages.

## 2. Backend: API Implementation

### [NEW] `server/routes/tracked_samples.js`
- Base Route: `/api/tracked-samples`
- **GET `/lookup/:sample_id`**: Performs a deep join to fetch:
    - **Patient**: ID, Name, Phone, Age, Sex.
    - **Lab**: Branch Name.
    - **Sample**: ID, Type, Status, Status History.
    - **Test**: Name, `lab_to_lab_status`, and `lab_name` (for Outsourced Lab info).
    - **Report**: ID.

## 3. UI: Component Integration

### [NEW] [client/src/components/samples/SampleQuickInfoModal.jsx](file:///home/zaid/Project/Lab-Manager/client/src/components/samples/SampleQuickInfoModal.jsx)
A **Read-Only** dashboard for sample verification.

#### Data Display (Visual Only):
- **Patient Section**: ID, Name, Phone Number, Age, Sex.
- **Lab Section**: Lab Branch Name.
- **Sample Section**:
    - Sample ID & Type.
    - **Specific Test Name**: The test this vial belongs to.
    - **Outsourced Lab**: If the test is outsourced, display the destination lab name.
    - **Status Timeline**: A visual progression of the `status_history`.
- **Navigation**:
    - **Medical Report ID**: Displayed as a clickable link that navigates to `/admin/dashboard/medical-reports/:id` (the details page).

## 4. UI: Navigation Action Points

### A. Dashboards & Reports List
- "Scan Sample" buttons added to Admin, Chemist, Receptionist, and Employee dashboards.
- "Scan Sample" button added to the [MedicalReports.jsx](file:///home/zaid/Project/Lab-Manager/client/src/pages/reports/MedicalReports.jsx) toolbar.

### B. Report Details Page
- Lookup icon next to each Sample ID in [MedicalReportDetails.jsx](file:///home/zaid/Project/Lab-Manager/client/src/pages/reports/MedicalReportDetails.jsx).

## 5. Scanning Logic
- Modal buffers keyboard input while open.
- On detection of a new scan:
    - Clears current display.
    - Fetches and displays new sample data.
- **No Edit Actions**: The modal is strictly for information display.

---

## Verification Plan
1. **Field Verification**: Verify Patient details, Branch name, Test name, and Outsourced Lab appear correctly.
2. **Navigation Test**: Click the Medical Report ID link and ensure it navigates to the full report details.
3. **Read-Only Check**: Ensure there are no buttons to change status or edit information within the modal.
4. **Scan Flow**: Test scanning multiple vials in sequence while the modal remains open.
