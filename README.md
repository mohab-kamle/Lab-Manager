# LabManager - Complete Laboratory Management System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v18-blue.svg)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-v20+-blue.svg)](https://www.docker.com/)

LabManager is a high-performance, multi-tenant laboratory management system (LIMS) built for modern medical facilities. It streamlines operations from patient registration and automated test processing to financial auditing and professional PDF reporting.

---

## 🚀 Quick Start (Docker)

The project uses Docker Compose for seamless environment management.

### 1. Prerequisites

- Docker & Docker Compose V2
- PNPM (for local development)

Copy the template environment files to their respective locations:

```bash
# Copy root environment templates
cp .env.example .env.development
cp .env.example .env.production
```

### 3. Development Mode

Launches the full stack with hot-reloading and local MinIO storage.

1.  **Prerequisites**: Ensure you have **Docker**, **Node.js (v18+)**, and **pnpm** installed.
2.  **Environment Setup**: Copy the example file to your development environment:
    ```bash
    cp .env.example .env.development
    ```
3.  **Launch Stack**: Start the containers (this handles MySQL, Redis, MinIO, Backend, and Frontend):
    ```bash
    docker compose -f docker-compose.dev.yml up -d
    ```
4.  **Database Seeding**: Once the containers are running, enter the backend container to sync the database and seed the initial data (Admin, Antibiotics, and LOINC Catalog):
    ```bash
    docker exec -it labmanager-backend-dev sh
    pnpm db:seed
    ```
5.  **Access & Login**: Open [http://localhost:5173](http://localhost:5173) and log in with the default administrator account:
    *   **Username**: `admin`
    *   **Password**: `admin123`

🎉 **Congratulations! You are in!**

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001](http://localhost:3001)
- **MinIO Console**: [http://localhost:9001](http://localhost:9001) (Credentials in `.env.development`)

### 4. Production Mode

Launches optimized builds with production-ready security.

```bash
docker compose -f docker-compose.prod.yml up -d
```

- **Frontend**: [http://localhost:80](http://localhost:80)
- **API**: [http://localhost:3001](http://localhost:3001)

---

## 🛠️ Local Development (Manual)

If you prefer running without Docker for debugging:

### Root Installation

```bash
pnpm install
```

### Backend Setup

```bash
cd server
pnpm install
cp .env.example .env
# Ensure a local MySQL/Redis is running
pnpm run db:sync
pnpm run dev
```

### Frontend Setup

```bash
cd client
pnpm install
cp .env.example .env
pnpm run dev
```

---

## 🏗️ System Architecture

### Technology Stack

- **Monorepo**: PNPM Workspaces
- **Frontend**: React 18 + Vite + Bootstrap 5 + Lucide Icons
- **Backend**: Node.js + Express + Sequelize ORM
- **Database**: MySQL 8.0 + Redis 7 (Caching/Sessions)
- **Storage**: S3-Compatible (MinIO for Dev, AWS S3 for Prod)
- **AI/OCR**: AWS Bedrock + Groq (for automated report scanning)
- **Auth**: JWT with Role-Based Access Control (RBAC)

### Project Layout

```text
LabManager/
├── client/           # React frontend (Vite)
├── server/           # Node.js backend (Express)
├── documentation/    # Comprehensive Docusaurus docs site
├── scripts/          # Automation & migration scripts
├── docker-compose.dev.yml
└── docker-compose.prod.yml
```

---

## ✨ Key Features

### 🧪 Laboratory Management

- **LOINC Integration**: Import standard tests from a global catalog.
- **Dynamic Test Components**: Demographic-specific reference ranges.
- **Culture & Sensitivity**: Automated antibiotic mapping.
- **Sample Tracking**: Barcode generation and status monitoring.

### 💰 Financial & Billing

- **Atomic Transactions**: Secure billing and refund processing.
- **Contract Management**: Discount structures for corporate clients.
- **Insurance/Packages**: Support for service bundles and insurance providers.

### 📄 Medical Reporting

- **PDF Generation**: Premium React-PDF reports with QR code verification.
- **AI Scan**: Auto-fill test results from scanned laboratory reports.
- **Digital Signatures**: Authenticated approvals for medical staff.

---

## 🗄️ Database Design

The system uses a highly normalized MySQL schema managed via Sequelize migrations.

### Core Modules

- **Identity**: Multi-role users (Admin, Chemist, Doctor, Patient, etc.)
- **Catalog**: Global LOINC tests, Local Test definitions, and Components.
- **Medical**: Reports, Results, and Historical Medical Records.
- **Financial**: Invoices, Payments, Refunds, and Debt Tracking.

---

## 🔐 Security & Multi-Tenancy

- **Tenant Isolation**: Strict sub-domain/header based laboratory isolation (`tenantContext`).
- **Encrypted Data**: Passwords hashed with bcrypt; sensitive data encrypted at rest where required.
- **CORS Policies**: Restricted production domains with pre-signed URL patterns for private S3 assets.

---

## 📚 Documentation

Detailed technical documentation, API guides, and architecture deep-dives are available in the `documentation/docs-site` folder or by running the local docs server:

```bash
cd documentation/docs-site
pnpm install
pnpm start
```

---

## 🤝 Contact & Contribution

- **Lead Developer**: Mohab
- **Repository**: [GitHub Link](https://github.com/mohab-kamle/Lab-Manager-Fullstack.git)

---

*Note: This project is intended for professional medical use. Ensure full compliance with regional healthcare data privacy regulations (e.g., GDPR, HIPAA) before production deployment.*
