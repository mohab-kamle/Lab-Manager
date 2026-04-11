---
sidebar_position: 5
title: Security Overview
---

# Security

This section covers the security measures implemented in the LabManager system — from authentication and authorization to data protection and network-level safeguards.

## Key Areas

- **Authentication:** JWT-based token authentication with secure password hashing (bcrypt). First-time login password change enforcement.
- **Authorization:** Role-based access control (RBAC) ensuring users can only access resources permitted by their role.
- **Rate Limiting:** API rate limiters to prevent brute-force attacks on login endpoints and other sensitive routes.
- **Data Isolation:** Multi-tenant architecture ensures each laboratory's data is strictly isolated, with scoped queries and subdomain-based access boundaries.
- **Input Validation:** Server-side validation and sanitization of all user inputs to prevent injection attacks and data corruption.

## In This Section

- **[Security Notes](./security-notes)** — Detailed security implementation notes, threat model considerations, and best practices followed in the codebase.
