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

1. **Client (React SPA):** Handles all user-facing interfaces (Login, Dashboard, Medical Reports, Billing).
2. **Server (Express API):** Exposes RESTful endpoints for business logic and data management.
3. **Secure Edge Access:** Production traffic is routed through **Cloudflare Tunnels**, providing a secure, token-based entry point without exposing open ports.
4. **Persistence Layer:**
    - **Relational Data:** MySQL database for core application state.
    - **File Storage:** **S3-Compatible Storage (MinIO/AWS S3)** for medical reports and patient documents.
5. **AI Processing:** A hybrid pipeline combining **AWS Bedrock** for vision and LLM services for automated report scanning and logical data extraction.
6. **Infrastructure:** Containerized environment with **PNPM monorepo** and multi-stage Docker builds optimized for production performance.

## In This Section

- **[Project Structure](./project-structure)** — Directory layout and file organization across the monorepo.
- **[Docker Architecture](./docker-architecture)** — Container setup, services, and orchestration with Docker Compose.
- **[Structure Review](./structure-review)** — Detailed review and analysis of the codebase structure.
