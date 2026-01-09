## 2024-05-22 - Path Traversal & Access Control Bypass in File Uploads
**Vulnerability:** Found a potential path traversal in file uploads where `req.params.id` was used directly in filenames, allowing attackers to write files outside the intended directory. Also found an access control bypass where files not matching a specific naming convention in `comment-images` were served without authorization check, coupled with a legacy `express.static` route that could serve these files publicly.
**Learning:** Middleware chains in Express (like `authorizeFileAccess` followed by `next()`) must default to "deny" if specific conditions for "allow" are not met, especially when handling user-uploaded content. Fallback `express.static` routes can inadvertently expose secured content if the secure route logic is bypassed.
**Prevention:**
1. Always sanitize user input used in file paths (remove `..`, `/`).
2. Ensure authorization middleware explicitly denies access (`res.status(403)`) for invalid or unrecognized request patterns instead of falling through to `next()`.
3. Do not mix authenticated routes and static serving for the same directory unless absolutely necessary and carefully ordered. Remove legacy static routes that overlap with secure routes.
