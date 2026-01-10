# Sentinel's Journal

## 2026-01-10 - Comment Images Authorization Bypass
**Vulnerability:** Files in `uploads/comment-images` were accessible to anyone via a legacy `express.static` route, bypassing the `authorizeFileAccess` middleware. Additionally, `authorizeFileAccess` allowed access to files not following the naming convention if the check was skipped, potentially allowing access to arbitrary files if they ended up in that directory.
**Learning:** Middleware order and redundancy can be dangerous. An authenticated route can be undermined by a subsequent static route serving the same directory.
**Prevention:** Avoid `express.static` for directories containing sensitive user data. Always use a dedicated route handler with authentication middleware. Ensure middleware defaults to "deny" if validation logic is skipped.
