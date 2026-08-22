## 2024-05-24 - Cryptographically Insecure Password Generation
**Vulnerability:** The initial admin password for trial accounts in `server/routes/demo.js` was generated using `Math.random()`.
**Learning:** `Math.random()` is a pseudo-random number generator (PRNG) and is not cryptographically secure. Its outputs can be predicted, making it unsuitable for generating passwords, secrets, or tokens.
**Prevention:** Always use a cryptographically secure pseudo-random number generator (CSPRNG), such as `crypto.randomBytes()` in Node.js, for generating sensitive values.
