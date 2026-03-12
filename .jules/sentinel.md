# Sentinel's Journal

## 2024-05-23 - Missing Rate Limiting on Patient Login
**Vulnerability:** The `/patient/login` endpoint lacked rate limiting, allowing unlimited login attempts.
**Learning:** While `employee` login was protected, `patient` login was missed. Inconsistent security application across similar features is a common pattern.
**Prevention:** Verify that security controls (like rate limiting) are applied to ALL authentication endpoints, not just the main administrative ones. Use a shared middleware configuration where possible to ensure consistency.
## 2024-05-23 - Broken Access Control in File Uploads
**Vulnerability:** The `authorizeFileAccess` middleware was "failing open" - if a filename didn't match the expected format (regex mismatch), the code called `next()` instead of denying access. This allowed unauthorized users to bypass file access controls by uploading files with malformed names (e.g. via `multer` using non-numeric IDs). Additionally, a legacy `express.static` route allowed public access to `comment-images`, bypassing the auth middleware entirely.
**Learning:** Middleware validation logic must "fail closed" (default deny). Regex matches must explicitly handle the "no match" case to deny access. Legacy backward-compatibility routes can silently negate new security controls if not removed.
**Prevention:** Always include an `else` block (or default return) that denies access if validation checks fail or are skipped. Ensure all access paths to sensitive resources are covered by the same security controls; remove legacy static routes when adding auth middleware.
## 2024-05-23 - IDOR in Medical Reports
**Vulnerability:** Found an Insecure Direct Object Reference (IDOR) vulnerability in `server/routes/medical_reports.js` where `GET /:id` allowed accessing any medical report across tenants by ID, and allowed patients to view reports belonging to other patients.
**Learning:** Middleware like `tenantContext` must be explicitly added to every route that needs it, and database queries must explicitly filter by `lab_id` from the tenant context, even when fetching by Primary Key. Also, role-based checks (like patient ownership) must be explicit.
**Prevention:** Always verify `lab_id` in `where` clauses when fetching resources by ID in a multi-tenant system. Use `findOne` with `where` instead of `findByPk`. Ensure `tenantContext` is applied.
## 2024-05-22 - Path Traversal & Access Control Bypass in File Uploads
**Vulnerability:** Found a potential path traversal in file uploads where `req.params.id` was used directly in filenames, allowing attackers to write files outside the intended directory. Also found an access control bypass where files not matching a specific naming convention in `comment-images` were served without authorization check, coupled with a legacy `express.static` route that could serve these files publicly.
**Learning:** Middleware chains in Express (like `authorizeFileAccess` followed by `next()`) must default to "deny" if specific conditions for "allow" are not met, especially when handling user-uploaded content. Fallback `express.static` routes can inadvertently expose secured content if the secure route logic is bypassed.
**Prevention:**
1. Always sanitize user input used in file paths (remove `..`, `/`).
2. Ensure authorization middleware explicitly denies access (`res.status(403)`) for invalid or unrecognized request patterns instead of falling through to `next()`.
3. Do not mix authenticated routes and static serving for the same directory unless absolutely necessary and carefully ordered. Remove legacy static routes that overlap with secure routes.
# Sentinel's Journal

## 2026-01-10 - Comment Images Authorization Bypass
**Vulnerability:** Files in `uploads/comment-images` were accessible to anyone via a legacy `express.static` route, bypassing the `authorizeFileAccess` middleware. Additionally, `authorizeFileAccess` allowed access to files not following the naming convention if the check was skipped, potentially allowing access to arbitrary files if they ended up in that directory.
**Learning:** Middleware order and redundancy can be dangerous. An authenticated route can be undermined by a subsequent static route serving the same directory.
**Prevention:** Avoid `express.static` for directories containing sensitive user data. Always use a dedicated route handler with authentication middleware. Ensure middleware defaults to "deny" if validation logic is skipped.
## 2026-01-07 - Overly Permissive CORS Configuration
**Vulnerability:** The server was configured to blindly reflect the `Origin` header in the `Access-Control-Allow-Origin` response header for any origin that wasn't explicitly allowed, effectively disabling CORS protection. This was done via a `callback(null, true)` in the `else` block of `corsOptions` and a redundant manual middleware.
**Learning:** Debugging code left in production ("Temporarily allowing blocked origin for debugging") is a major security risk. Also, using multiple layers of CORS configuration (package + manual middleware) can lead to conflicting or overriding behaviors that weaken security.
**Prevention:** Strictly enforce `callback(new Error('Not allowed by CORS'))` for unknown origins. Avoid manual CORS header manipulation when using a dedicated middleware library like `cors`. Ensure debugging code is stripped or strictly conditional on `NODE_ENV=development` (and even then, be careful).

## 2024-05-24 - IDOR and Cache Poisoning in Results Data
**Vulnerability:** The `GET /:id/results-data` endpoint fetched medical reports using `findByPk(id)` which ignored the tenant context (`lab_id`), allowing access to any report by ID. Additionally, the caching middleware used only `reportId` as the cache key, meaning a cached report from one tenant could be served to another if they requested the same ID.
**Learning:** In multi-tenant systems, caching layers must include the tenant identifier in the cache key. Fixing the database query alone is insufficient if the cache can serve stale or cross-tenant data.
**Prevention:** Always include `tenant_id` (or `lab_id`) in cache keys for tenant-specific resources. Use `findOne` with explicit `where: { lab_id }` checks instead of `findByPk` for resources that must be isolated.

## 2024-05-24 - Missing Environment Variable Validation
**Vulnerability:** The application relied on `SECRET_KEY` for JWT signing but did not validate its presence at startup. This could lead to the application starting in an insecure state or failing unpredictably at runtime if the variable was missing or undefined.
**Learning:** Critical security configuration must be validated at application startup. Failing to do so allows "silent failures" or default insecure behaviors that might go unnoticed until exploitation.
**Prevention:** Implement a "Fail Fast" strategy. Validate all critical environment variables (secrets, DB URLs, API keys) during the bootstrap phase (e.g., `index.js`) and crash the application (`process.exit(1)`) if any are missing.
