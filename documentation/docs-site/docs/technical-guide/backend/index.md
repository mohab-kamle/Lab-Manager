---
sidebar_position: 2
title: Backend Overview
---

# Backend

This section covers the LabManager backend — a Node.js/Express REST API that handles authentication, business logic, and database operations through Sequelize ORM.

## Key Areas

- **Authentication & Authorization:** JWT-based authentication with role-based access control (RBAC) for six user roles.
- **Medical Reports API:** CRUD operations for tests, cultures, antibiotic sensitivities, and report lifecycle management.
- **Billing API:** Invoice generation, contract pricing, package management, and payment tracking.
- **Multi-tenancy:** Each laboratory operates as an isolated tenant, with data scoped by lab context and subdomain-based routing.

## In This Section

- **[Server README](./server-readme)** — Setup instructions, environment variables, and how to run the server locally.
- **[Database Sync](./database-sync)** — How Sequelize model synchronization works and migration strategies.
- **[Sequelize Workflow](./sequelize-workflow)** — Best practices for using Sequelize models, associations, and queries.
- **[Fix Summary](./fix-summary)** — Summary of important bug fixes and patches applied to the backend.
- **[Index Fix Summary](./index-fix-summary)** — Database index optimization and fix details.
