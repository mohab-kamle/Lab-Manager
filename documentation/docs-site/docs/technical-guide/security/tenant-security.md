---
sidebar_position: 3
title: Multi-Tenancy & Data Security
---

# Multi-Tenancy & Data Security

LabManager is a multi-tenant application where each laboratory operates within its own isolated context.

## Tenant Isolation

Isolation is enforced at both the infrastructure and application layers.

### Subdomain-Based Routing
Each tenant is identified by their subdomain (e.g., `lab1.labmanager.app`). The frontend captures this subdomain and includes it in the `X-Tenant-ID` header for all API requests.

### `tenantContext` Middleware
The backend uses a specialized middleware to extract and validate the tenant context:
1. **Validation**: Checks if the tenant exists and is active.
2. **Context Injection**: Attaches `req.tenant` and `req.lab_id` to the request object.
3. **Database Scoping**: All Sequelize queries automatically include a `where: { lab_id: req.lab_id }` clause (managed either manually or via Sequelize hooks).

## File Security (S3 Integration)

The application utilizes **S3-Compatible Storage** with a strict security model.

- **Private Buckets**: All patient documents and medical reports are stored in private buckets with no public read access.
- **Pre-signed URLs**: To display an image, the backend generates a time-limited **pre-signed URL**. This ensures that even if a URL is leaked, it expires within minutes.
- **Authenticated Proxying**: For certain file types, the backend acts as an authenticated proxy, verifying the user's session before fetching and streaming the file from S3.

## Rate Limiting & Brute Force Protection

The system implements multiple layers of rate limiting using `express-rate-limit`:

- **Global Limiter**: Protects the entire API from general DOS attacks.
- **Auth Limiter**: Strict limits on `/login` and `/register` endpoints to prevent brute-force credential stuffing.
- **Upload Limiter**: Prevents resource exhaustion via mass file uploads.

## WhatsApp Tenant Security
WhatsApp messages are routed based on the `tenantContext`. Each lab can configure their own WhatsApp credentials, and the system ensures that message logs (`whatsapp_sends`) are strictly scoped to the laboratory that initiated the communication.
