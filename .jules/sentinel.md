## 2024-05-18 - [Fix Deleted User Access via JWT]
**Vulnerability:** A deleted user could still access the system as long as their JWT token remained unexpired, because `authenticateUser.js` decoded the token and mapped it to a role, but didn't actually verify if the `userRecord` returned from the database was non-null before attaching it to `req.user` and continuing the request.
**Learning:** In stateless JWT authentication architectures, token validity does not imply database validity. We must always verify the user still exists in the database if the JWT is not immediately invalidated upon deletion.
**Prevention:** Always verify the result of the database lookup for the user. If `userRecord` is null, reject the request with a 401 Unauthorized instead of continuing the middleware chain.
