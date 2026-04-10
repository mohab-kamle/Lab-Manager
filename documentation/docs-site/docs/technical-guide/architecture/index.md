---
sidebar_position: 1
title: Architecture Overview
---

# Architecture

This section describes the high-level architecture of the LabManager system — how the different layers are organized, how they communicate, and how the project is structured.

## Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React (Vite), React-Bootstrap, Framer Motion |
| **Backend** | Node.js, Express.js |
| **Database** | MySQL with Sequelize ORM |
| **Containerization** | Docker & Docker Compose |
| **Process Manager** | PM2 (production) |

## High-Level Overview

LabManager follows a **client-server architecture** with a clear separation between the frontend single-page application (SPA) and the backend REST API:

1. **Client (React SPA):** Handles all user-facing interfaces — login, dashboards, medical reports, billing, and administration panels. Communicates with the backend exclusively via HTTP API calls.
2. **Server (Express API):** Exposes RESTful endpoints for authentication, data management, and business logic. Connects to the MySQL database through Sequelize ORM.
3. **Database (MySQL):** Stores all persistent data — users, patients, tests, medical reports, invoices, laboratory configuration, and multi-tenant lab information.

## In This Section

- **[Project Structure](./project-structure)** — Directory layout and file organization across the monorepo.
- **[Docker Architecture](./docker-architecture)** — Container setup, services, and orchestration with Docker Compose.
- **[Structure Review](./structure-review)** — Detailed review and analysis of the codebase structure.
