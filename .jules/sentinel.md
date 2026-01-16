# Sentinel's Journal

## 2026-01-10 - Comment Images Authorization Bypass
**Vulnerability:** Files in `uploads/comment-images` were accessible to anyone via a legacy `express.static` route, bypassing the `authorizeFileAccess` middleware. Additionally, `authorizeFileAccess` allowed access to files not following the naming convention if the check was skipped, potentially allowing access to arbitrary files if they ended up in that directory.
**Learning:** Middleware order and redundancy can be dangerous. An authenticated route can be undermined by a subsequent static route serving the same directory.
**Prevention:** Avoid `express.static` for directories containing sensitive user data. Always use a dedicated route handler with authentication middleware. Ensure middleware defaults to "deny" if validation logic is skipped.
## 2026-01-07 - Overly Permissive CORS Configuration
**Vulnerability:** The server was configured to blindly reflect the `Origin` header in the `Access-Control-Allow-Origin` response header for any origin that wasn't explicitly allowed, effectively disabling CORS protection. This was done via a `callback(null, true)` in the `else` block of `corsOptions` and a redundant manual middleware.
**Learning:** Debugging code left in production ("Temporarily allowing blocked origin for debugging") is a major security risk. Also, using multiple layers of CORS configuration (package + manual middleware) can lead to conflicting or overriding behaviors that weaken security.
**Prevention:** Strictly enforce `callback(new Error('Not allowed by CORS'))` for unknown origins. Avoid manual CORS header manipulation when using a dedicated middleware library like `cors`. Ensure debugging code is stripped or strictly conditional on `NODE_ENV=development` (and even then, be careful).
