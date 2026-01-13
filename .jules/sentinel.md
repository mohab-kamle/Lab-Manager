## 2024-05-23 - IDOR in Medical Reports
**Vulnerability:** Found an Insecure Direct Object Reference (IDOR) vulnerability in `server/routes/medical_reports.js` where `GET /:id` allowed accessing any medical report across tenants by ID, and allowed patients to view reports belonging to other patients.
**Learning:** Middleware like `tenantContext` must be explicitly added to every route that needs it, and database queries must explicitly filter by `lab_id` from the tenant context, even when fetching by Primary Key. Also, role-based checks (like patient ownership) must be explicit.
**Prevention:** Always verify `lab_id` in `where` clauses when fetching resources by ID in a multi-tenant system. Use `findOne` with `where` instead of `findByPk`. Ensure `tenantContext` is applied.
