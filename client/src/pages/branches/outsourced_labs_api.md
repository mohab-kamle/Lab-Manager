# Outsourced Labs — Backend API Requirements

This document describes the REST API endpoints needed to support the **Outsourced Labs** frontend interface.

---

## Database Table: `outsourced_lab`

| Column           | Type            | Constraints                      | Notes              |
|------------------|-----------------|----------------------------------|---------------------|
| `id`             | `INTEGER`       | PK, auto-increment               |                     |
| `name`           | `VARCHAR(100)`  | NOT NULL                          | Lab name            |
| `contact_number` | `VARCHAR(45)`   | nullable                          | Phone number        |
| `email`          | `VARCHAR(100)`  | nullable                          | Email address       |
| `address`        | `VARCHAR(255)`  | nullable                          | Physical address    |
| `lab_id`         | `INTEGER`       | NOT NULL, FK → `lab.id`           | Tenant isolation    |

> **Timestamps**: `false` (matches the project convention for simple lookup tables).

---

## Base Path

```
/outsourced-labs
```

Mounted in `server/index.js`:
```js
app.use("/outsourced-labs", require("./routes/outsourcedLabs"));
```

---

## Middleware (all routes)

| Middleware         | Purpose                                                |
|--------------------|--------------------------------------------------------|
| `authenticateUser` | Verify JWT token                                       |
| `authorizeRoles('admin', 'employee', 'chemist')` | Role gate                |
| `tenantContext`    | Extract `lab_id` from the user's tenant context        |

---

## Endpoints

### 1. `GET /`

Fetch all outsourced labs for the current tenant.

**Query**: `WHERE lab_id = req.tenant.lab_id`, `ORDER BY name ASC`

**Response** `200`:
```json
[
  {
    "id": 1,
    "name": "Alpha Labs",
    "contact_number": "+201234567890",
    "email": "info@alpha.com",
    "address": "123 Main St",
    "lab_id": 5
  }
]
```

---

### 2. `POST /`

Create a new outsourced lab.

**Request body**:
```json
{
  "name": "Alpha Labs",
  "contact_number": "+201234567890",
  "email": "info@alpha.com",
  "address": "123 Main St"
}
```

> The backend should inject `lab_id` from `req.tenant.lab_id`.

**Validation**:
- `name` is required and must not be empty.
- Check for duplicate `name` within the same `lab_id`.

**Response** `201`:
```json
{
  "id": 1,
  "name": "Alpha Labs",
  "contact_number": "+201234567890",
  "email": "info@alpha.com",
  "address": "123 Main St",
  "lab_id": 5
}
```

**Error** `400`:
```json
{ "error": "Name is required" }
```
```json
{ "error": "An outsourced lab with this name already exists" }
```

---

### 3. `PUT /:id`

Update an existing outsourced lab.

**Request body**: same as POST (all fields optional except `name`).

**Validation**:
- Verify the lab belongs to `req.tenant.lab_id`.
- If `name` changed, check for duplicates within the same tenant.

**Response** `200`:
```json
{ "message": "Outsourced lab updated successfully" }
```

**Error** `404`:
```json
{ "error": "Outsourced lab not found" }
```

---

### 4. `DELETE /:id`

Delete an outsourced lab by ID.

**Validation**:
- Verify the lab belongs to `req.tenant.lab_id`.

**Response** `200`:
```json
{ "message": "Outsourced lab deleted successfully" }
```

**Error** `404`:
```json
{ "error": "Outsourced lab not found" }
```

---

### 5. `POST /import`

Bulk-import outsourced labs from parsed Excel data.

> **Note**: The client parses the Excel file and sends JSON. The backend receives a JSON array and creates records.

**Request body**:
```json
{
  "labs": [
    { "Name": "Alpha Labs", "Contact Number": "123", "Email": "a@b.com", "Address": "St 1" },
    { "Name": "Beta Labs", "Contact Number": "456", "Email": "", "Address": "" }
  ]
}
```

**Backend logic** (per row):
1. Map header names: `Name` → `name`, `Contact Number` → `contact_number`, `Email` → `email`, `Address` → `address`.
2. Skip rows where `name` is empty.
3. Skip rows where a lab with the same `name` + `lab_id` already exists.
4. Create the record with `lab_id = req.tenant.lab_id`.

**Response** `200`:
```json
{
  "imported": 2,
  "errors": ["Row 4: Name is required"],
  "message": "Successfully imported 2 labs"
}
```

---

## Sequelize Model File

Create `server/models/outsourced_lab.js` following the same pattern as `server/models/branch.js`.

## init-models.js Changes

1. Import `var _outsourced_lab = require("./outsourced_lab");`
2. Initialise: `var outsourced_lab = _outsourced_lab(sequelize, DataTypes);`
3. Associations:
   ```js
   lab.hasMany(outsourced_lab, { as: "outsourced_labs", foreignKey: "lab_id" });
   outsourced_lab.belongsTo(lab, { as: "lab", foreignKey: "lab_id" });
   ```
4. Add to the return object: `outsourced_lab`.
