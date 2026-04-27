# Tests — Backend API Updates for Outsourced Labs

This document describes the necessary backend modifications to support the "Outsourced Lab Selection" feature within the **Tests Management** interface.

---

## 1. Context

The Tests interface now requires a list of **Outsourced Labs** to allow users to specify which lab performs a test when `lab_to_lab_status` is set to `OUT`.

---

## 2. Dependencies

The `fetchTestsAndRelated` function in the client now makes an additional parallel request:

```js
// Requesting outsourced labs alongside tests, categories, and samples
axios.get(`${apiUrl}/outsourced-labs`, { headers: { Authorization: `Bearer token` } })
```

---

## 3. Required Implementation

### 3.1. Route Registration
Ensure the `outsourced-labs` router is correctly mounted in `server/index.js` so that the frontend can fetch the list:

```js
app.use("/outsourced-labs", require("./routes/outsourcedLabs"));
```

### 3.2. GET /outsourced-labs
The endpoint must return an array of objects, specifically containing the `name` field used to populate the dropdown.

**Expected JSON Response:**
```json
[
  { "id": 1, "name": "Alpha Reference Lab", ... },
  { "id": 2, "name": "Global Diagnostics Center", ... }
]
```

### 3.3. Test Model/Table Updates
Ensure the `test` table can store the `lab_name` string.

| Column | Type | Notes |
| :--- | :--- | :--- |
| `lab_to_lab_status` | `VARCHAR` | Stores 'IN' or 'OUT' |
| `lab_name` | `VARCHAR(100)` | Stores the name of the selected outsourced lab |

---

## 4. Frontend Integration Summary

- **State**: Added `outsourcedLabs` state to `Tests.jsx`.
- **Validation**: Added a requirement that `lab_name` must not be empty if `lab_to_lab_status === 'OUT'`.
- **UI**: Replaced the text input for `lab_name` with a dynamic dropdown (`Form.Select`) that is only active when `OUT` is selected.
- **Error Handling**: Implemented `toast.error` for fetch failures in the `fetchTestsAndRelated` sequence.
