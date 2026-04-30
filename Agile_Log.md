# Agile Log: Development Milestones

## Project Overview
This project, Cura (Lab Management System), was built with a full-stack, multi-tenant architecture designed to digitize and manage operations across medical laboratories. Given the comprehensive scope, the following "Development Milestones" represent our structured agile approach to delivering the system.

## Team Roles
- **Mohab (Full Stack & DevOps):** System architecture, database modeling (MySQL/Sequelize), Docker/PM2 deployment, CI/CD, QA, and security implementations.
- **Karim (Backend Developer):** API scaffolding, business logic, route controllers, backend integration, and database operations.
- **Ziad (Frontend Developer):** UI/UX design, React/Vite frontend development, component architecture, and API integration.

***

## Milestone 1 (Architecture, Auth & Multi-Tenancy Core)
**Objective:** Establish the foundation of the system, including infrastructure, database schema, and security protocols.
* **Mohab:**
  * Designed and deployed the Dockerized environment (`docker-compose.prod.yml`, `Dockerfile`) including Redis for caching and Cloudflared for secure tunneling.
  * Designed the MySQL relational schema and initialized Sequelize ORM models (`server/models/index.js`, `server/models/init-models.js`).
  * Implemented the multi-tenant architecture (`lab_id` context) to ensure data isolation across different laboratories.
* **Karim:**
  * Built the unified login system and authentication endpoints (`server/routes/register.js`).
  * Implemented JWT-based stateless authentication and Role-Based Access Control (RBAC) middleware (`server/middleware/authenticateUser.js`, `server/middleware/authorizeRoles.js`).
* **Ziad:**
  * Created the unified login interface (`client/src/pages/auth/UnifiedLogin.jsx`).
  * Set up the Vite/React frontend scaffolding with custom SASS and Bootstrap 5 (`client/package.json`).

## Milestone 2 (Core Laboratory Operations & Management)
**Objective:** Build the primary logic for managing tests, patients, and laboratory inventory.
* **Mohab:**
  * Implemented robust multi-tenant scoping for patient imports and updates to prevent cross-tenant data leakage (`server/routes/patient.js`).
  * Configured Multer with AWS S3/memory storage for handling document uploads and Excel parsing (`server/services/excelService.js`).
* **Karim:**
  * Developed the core API logic for the `global_test_catalog`, `packages_and_offers`, and `test` models (`server/routes/globalTestCatalog.js`, `server/routes/tests.js`).
  * Built the API scaffolding for Inventory and Stock Management accessible to admins and chemists (`server/routes/inventory.js`).
* **Ziad:**
  * Designed dynamic, role-specific frontend routing using `react-router-dom` and context providers (`client/src/LabRoutes.jsx`).
  * Developed the `DynamicTable` component with pagination, memoization, and accessibility features (`client/src/components/ui/DynamicTable.jsx`).

## Milestone 3 (Advanced Integrations, Billing & Reporting)
**Objective:** Implement financial processing, real-time tracking, and medical report generation.
* **Mohab:**
  * Architected the real-time cross-client notification system using Socket.io to push tenant-isolated events like low inventory alerts (`client/src/utils/socket.js`, `server/services/inventoryEvents.js`).
  * Implemented Turnaround Time (TAT) tracking utilizing timestamps in the `medical_report` database model.
* **Karim:**
  * Integrated payment gateways and dynamic billing strategies allowing cash, card, or wallet methods (`server/routes/paymentsGateway.js`, `server/routes/paymentMethods.js`).
  * Created backend controllers to validate test results and link findings to LOINC codes.
* **Ziad:**
  * Implemented client-side Medical PDF report rendering and digital signatures (`client/src/components/pdf/HtmlToPdfRenderer.jsx`, `client/src/pages/reports/MedicalReports.jsx`).
  * Developed the automated invoice PDF generation component (`client/src/components/pdf/InvoicePDF.jsx`).

## Milestone 4 (QA, Performance Optimization & Polish)
**Objective:** Ensure system stability, optimize performance, and finalize clean code standards.
* **Mohab:**
  * Executed comprehensive full QA testing across isolated components utilizing Playwright and temporary harness pages.
  * Optimized API queries by eliminating Cartesian products using `separate: true` and applying database-side filtering with `include` and `where` clauses (e.g., `server/routes/medical_reports.js`).
  * Configured Nginx reverse proxy routing and PM2 clustering for enhanced performance (`ecosystem.config.js`).
* **Karim:**
  * Wrote data maintenance scripts and token expiration checks (`server/scripts/maintenance/checkTokenExpiration.js`).
  * Finalized rate limiting middleware to prevent brute-force attacks (`server/middleware/cacheMiddleware.js`, `server/index.js`).
* **Ziad:**
  * Implemented UI Error Boundaries to gracefully catch rendering issues (`client/src/components/error/ErrorBoundary.jsx`).
  * Finalized global dark mode state management with persistent `localStorage` and `data-bs-theme` (`ThemeContext`).
