## 2024-02-14 - Path Traversal in Static File Serving
**Vulnerability:** Path traversal vulnerability in `server/index.js` where user-supplied filenames were directly joined with the base directory path without sanitization. This allowed attackers to access arbitrary files on the system using `../` sequences.
**Learning:** `express.static` protects against path traversal, but custom routes using `res.sendFile` with `path.join` must explicitly sanitize input or check the resolved path.
**Prevention:** Always normalize paths and verify they start with the expected root directory before serving files. Use `path.normalize()` and check `startsWith()`.
