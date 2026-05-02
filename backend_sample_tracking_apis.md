# Sample Tracking Backend API Requirements

This document outlines the required endpoints and structures for implementing the Sample Tracking Kanban feature in the backend. 
**Note:** The base route is `/api/tracked-samples` to prevent collision with the existing `/api/samples` (which manages sample types dictionary).

## Database & Models Update Requirements

### `lab_samples` table/model
Ensure columns match tracking requirements:
- `medical_report_id` (Int)
- `test_id` (Int)
- `sample_type_id` (Int)
- `status` (String) - Default: "Pending Collection"
- `status_history` (JSON) - To store timestamps for tracking stages.

## 1. Get Tracked Samples
Retrieves a list of samples. Should support filtering by `report_id`.

**Endpoint:** `GET /api/tracked-samples`

**Query Parameters:**
- `report_id` (optional): Filter samples by medical report ID.

**Response:**
```json
[
  {
    "id": 1,
    "medical_report_id": 101,
    "invoice_id": "INV-1001",
    "test_id": 5,
    "test_name": "CBC",
    "sample_type_id": 2,
    "sample_type": "Blood",
    "status": "Pending Collection",
    "status_history": {
      "pending_collection_at": "2026-05-01T10:00:00Z",
      "collected_at": null,
      "dispatched_at": null,
      "in_process_at": null,
      "completed_at": null,
      "rejected_at": null
    },
    "created_at": "2026-05-01T10:00:00Z"
  }
]
```

## 2. Create Tracked Sample
Creates a new sample record.

**Endpoint:** `POST /api/tracked-samples`

**Payload:**
```json
{
  "medical_report_id": 101,
  "invoice_id": "INV-1001",
  "test_id": 5,
  "sample_type_id": 2
}
```

**Response:**
```json
{
  "id": 2,
  "medical_report_id": 101,
  "invoice_id": "INV-1001",
  "test_id": 5,
  "test_name": "CBC",
  "sample_type_id": 2,
  "sample_type": "Blood",
  "status": "Pending Collection",
  "status_history": {
    "pending_collection_at": "2026-05-01T10:05:00Z",
    "collected_at": null,
    "dispatched_at": null,
    "in_process_at": null,
    "completed_at": null,
    "rejected_at": null
  },
  "created_at": "2026-05-01T10:05:00Z"
}
```

## 3. Update Sample Status
Updates the status of a specific sample and captures the timestamp for the new state.

**Endpoint:** `PUT /api/tracked-samples/:id/status`

**Payload:**
```json
{
  "status": "Collected" // Valid values: "Pending Collection", "Collected", "Dispatched", "In Process", "Completed", "Rejected"
}
```

**Response:**
```json
{
  "id": 1,
  "status": "Collected",
  "status_history": {
    "pending_collection_at": "2026-05-01T10:00:00Z",
    "collected_at": "2026-05-01T10:15:00Z",
    "dispatched_at": null,
    "in_process_at": null,
    "completed_at": null,
    "rejected_at": null
  },
  "updated_at": "2026-05-01T10:15:00Z"
}
```

## 4. Delete Tracked Sample
Deletes a specific sample.

**Endpoint:** `DELETE /api/tracked-samples/:id`

**Response:**
```json
{
  "message": "Sample deleted successfully"
}
```

## 5. Sample Quick Info Lookup
Retrieves comprehensive details about a sample by its barcode/ID for read-only display.

**Endpoint:** `GET /api/tracked-samples/lookup/:sample_id`

**Response:**
```json
{
  "sample": {
    "id": "SMP-12345",
    "type": "Blood",
    "status": "Collected",
    "status_history": {
      "pending_collection_at": "2026-05-01T10:00:00Z",
      "collected_at": "2026-05-01T10:15:00Z"
    }
  },
  "patient": {
    "id": 1,
    "name": "John Doe",
    "phone": "+123456789",
    "age": 35,
    "sex": "Male"
  },
  "lab": {
    "branch_name": "Main Branch"
  },
  "test": {
    "name": "Complete Blood Count",
    "lab_to_lab_status": "Outsourced",
    "lab_name": "External Lab Partners Inc"
  },
  "report": {
    "id": 101
  }
}
```
