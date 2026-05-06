# API Update Request: Forgot Password Flow Completion

## Problem Profile
The current implementation of the "Forgot Password" flow is incomplete. While endpoints exist to request an OTP and verify it, there is no secure mechanism to perform the actual password reset for an unauthenticated user.

### Current Limitations:
1. **`/emp/verifyOtp`**: Currently verifies the OTP and immediately deletes it from the cache. It returns only `success: true`. This leaves the frontend with no "proof of verification" to pass to a subsequent password update request.
2. **Missing Reset Endpoint**: There is no public endpoint (one that doesn't require a login session/Bearer token) to update an employee's password. The existing `changePassword` endpoint is protected and requires the user to be already logged in.

## Proposed API Updates

### 1. Update `/emp/verifyOtp` (POST)
**Current behavior**: Verifies OTP, deletes it, returns `{ success: true }`.
**Requested change**: Upon successful verification, generate and return a short-lived `resetToken`.

- **Token Requirements**:
    - Format: JWT (JSON Web Token).
    - Payload: `{ "email": "user@example.com", "purpose": "password_reset" }`.
    - Expiration: 10–15 minutes.
- **Example Response**:
```json
{
    "success": true,
    "message": "OTP verified successfully.",
    "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Add `/emp/resetPassword` (POST)
Create a new public endpoint to perform the final password update.

- **Endpoint**: `POST /emp/resetPassword`
- **Request Body**:
```json
{
    "resetToken": "string",
    "newPassword": "string"
}
```
- **Logic**:
    1. Verify the `resetToken` is valid and not expired.
    2. Extract the `email` from the token payload.
    3. Validate `newPassword` strength (using existing `validatePassword` utility).
    4. Hash the new password using `bcrypt`.
    5. Update the employee record in the database identified by the email.
    6. (Optional) Invalidate the token or a secondary flag to prevent reuse.
- **Success Response**:
```json
{
    "success": true,
    "message": "Password has been reset successfully."
}
```

## Impact on Frontend
Once these changes are implemented, the frontend (`OTPVerify.jsx` and `ChangePassword.jsx`) can securely transition from OTP verification to password reset by carrying the `resetToken` through the flow.
