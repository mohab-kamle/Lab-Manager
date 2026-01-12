# Sentinel's Journal

## 2024-05-23 - Missing Rate Limiting on Patient Login
**Vulnerability:** The `/patient/login` endpoint lacked rate limiting, allowing unlimited login attempts.
**Learning:** While `employee` login was protected, `patient` login was missed. Inconsistent security application across similar features is a common pattern.
**Prevention:** Verify that security controls (like rate limiting) are applied to ALL authentication endpoints, not just the main administrative ones. Use a shared middleware configuration where possible to ensure consistency.
