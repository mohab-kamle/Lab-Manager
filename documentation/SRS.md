# Software Requirements Specification (SRS)

## Project: Cura (Lab Management System)

### 1. Introduction
Cura is a comprehensive, multi-tenant Laboratory Information Management System (LIMS) designed to digitize medical laboratory operations. The system facilitates patient management, inventory tracking, clinical testing workflows, automated billing, and secure dynamic reporting. It utilizes a Client-Server architecture deployed via Docker.

---

### 2. Functional Requirements

#### 2.1 Multi-Role Access & Authentication
* **Requirement:** The system must support isolated Multi-Role Access Control (Admin, Doctor, Chemist, Patient, Receptionist, Employee).
* **Implementation:** JWT authentication coupled with RBAC middleware (`server/middleware/authenticateUser.js`, `server/middleware/authorizeRoles.js`).
* **Requirement:** The system must support unified login with tenant isolation.
* **Implementation:** Login validations explicitly check `lab_id` to prevent cross-tenant access (`client/src/pages/auth/UnifiedLogin.jsx`, `server/routes/register.js`).

#### 2.2 Medical Operations & Reporting
* **Requirement:** The system must process and store test results, linking them to a global test catalog.
* **Implementation:** `global_test_catalog` and `test` models are used to standardize test parameters and link findings to LOINC codes (`server/models/global_test_catalog.js`).
* **Requirement:** The system must generate dynamic medical reports with digital signatures.
* **Implementation:** Client-side generation utilizing React-PDF and WebAssembly (`client/src/pages/reports/MedicalReports.jsx`, `client/src/components/pdf/HtmlToPdfRenderer.jsx`).
* **Requirement:** The system must track Turnaround Time (TAT) for all medical reports.
* **Implementation:** Tracking utilizing `registered_at`, `collected_at`, `received_at`, and `reported_at` columns in the `medical_report` database model.

#### 2.3 Inventory & Resource Management
* **Requirement:** The system must track inventory batches and maintain stock levels.
* **Implementation:** Inventory management API accessed by `admin` and `chemist` roles (`server/routes/inventory.js`).
* **Requirement:** The system must alert staff immediately on low stock.
* **Implementation:** WebSocket event emitters (`server/services/inventoryEvents.js`) trigger real-time notifications (`server/models/inventory_notification.js`).

#### 2.4 Billing & Payments
* **Requirement:** The system must process multiple payment methods (Cash, Card, Wallet) and apply package/offer logic.
* **Implementation:** Strategy pattern implementations for payments (`server/routes/paymentsGateway.js`, `server/routes/paymentMethods.js`).
* **Requirement:** The system must generate digital invoices.
* **Implementation:** `InvoicePDF.jsx` component generates and triggers a blob download for users (`client/src/components/pdf/InvoicePDF.jsx`).

#### 2.5 Multi-Tenancy
* **Requirement:** The system must completely isolate data between different laboratory tenants.
* **Implementation:** All tenant-scoped resources require explicit `req.tenant.lab_id` filtering in Sequelize queries, bypassing direct primary key lookups (`server/models/lab.js`).

---

### 3. Non-Functional Requirements

#### 3.1 Security
* **Authentication:** Passwords securely hashed using bcryptjs (`bcrypt`).
* **Authorization:** Strict Role-Based Access Control protecting API endpoints.
* **Data Privacy:** Explicit tenant-level scoping prevents IDOR (Insecure Direct Object Reference) and data leakage. Cache keys include `lab_id` to prevent cross-tenant cache poisoning.
* **Attack Prevention:** Rate limiting middleware prevents brute-force attacks on login endpoints (`server/index.js`, `server/middleware/cacheMiddleware.js`). SQL Object Injection is prevented via explicit type checks.

#### 3.2 Performance
* **Caching & Routing:** Redis is utilized alongside Nginx reverse proxy configurations to optimize request routing and caching.
* **Clustering:** Backend runs PM2 clustering (`ecosystem.config.js`) to handle parallel request loads efficiently.
* **Query Optimization:** Database queries avoid Cartesian products by utilizing `separate: true` for large associations and perform direct filtering database-side rather than application-side (`server/routes/medical_reports.js`).

#### 3.3 Scalability & Deployment
* **Infrastructure:** The entire application is containerized using Docker.
* **Environment:** `docker-compose.prod.yml` defines isolated networks containing MySQL, Redis, Node.js Backend, Nginx Frontend, and Cloudflared tunneling.
* **Database:** MySQL relational database utilizing Sequelize ORM for schema versioning, migrations, and transactional integrity.

#### 3.4 User Experience & Accessibility
* **Theme Support:** Global context-driven dark mode persisting via `localStorage`.
* **Accessibility:** Keyboard navigable components (e.g., dynamic tables, uploaders) employing proper `aria-label` and `role` attributes (`client/src/components/ui/DynamicTable.jsx`).
* **Error Handling:** Graceful failure states captured by React UI Error Boundaries (`client/src/components/error/ErrorBoundary.jsx`).
