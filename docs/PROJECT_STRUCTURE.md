# Project Structure

## Overview

The LabManager project follows a clear and maintainable structure:

```
LabManager/
├── .github/                  # GitHub workflows and CI/CD configurations
├── client/                   # Frontend React application
│   ├── public/               # Static assets
│   ├── src/                  # React source code
│   │   ├── components/       # Reusable UI components
│   │   ├── context/          # React context providers
│   │   ├── hooks/            # Custom React hooks
│   │   ├── pages/            # Page components
│   │   └── utils/            # Utility functions
│   ├── .env.development      # Development environment variables
│   ├── .env.production       # Production environment variables
│   └── .env.example          # Example environment variables template
├── server/                   # Backend Node.js application
│   ├── config/               # Configuration files
│   ├── docs/                 # Essential backend documentation
│   │   ├── CI_CD_PLAN.md     # CI/CD implementation details
│   │   ├── DATABASE_SYNC.md  # Database synchronization guide
│   │   ├── DEPLOYMENT_CHECKLIST.md # Deployment requirements
│   │   ├── FIX_SUMMARY.md    # Bug fixes and improvements
│   │   ├── PM2_CLUSTER_SETUP.md # PM2 configuration
│   │   ├── PRODUCTION_DEPLOYMENT.md # Production setup guide
│   │   └── SECURITY_NOTES.md # Security implementation notes
│   ├── middleware/           # Express middleware
│   ├── models/               # Sequelize models
│   ├── routes/               # API routes
│   ├── scripts/              # Utility scripts
│   ├── services/             # Business logic services
│   ├── uploads/              # File upload directory
│   ├── .env.development      # Development environment variables
│   ├── .env.production       # Production environment variables
│   └── .env.example          # Example environment variables template
├── docs/                     # Project-wide documentation
├── docker-compose.dev.yml    # Development Docker configuration
├── docker-compose.prod.yml   # Production Docker configuration
├── .env.development          # Root development environment variables
├── .env.production           # Root production environment variables
└── .env.example              # Root example environment variables template
```

## Environment Files

The project uses a consistent environment file structure:

- `.env.example` - Template files (committed to version control)
- `.env.development` - Development environment variables
- `.env.production` - Production environment variables

Each component (root, client, server) has its own set of environment files.

## Documentation

Documentation is organized in multiple locations:

- `/docs/` - Project-wide documentation
- `/server/docs/` - Backend-specific documentation
- `/client/docs/` - Frontend-specific documentation

## Docker Configuration

- `docker-compose.dev.yml` - Development environment with hot-reloading
- `docker-compose.prod.yml` - Production environment with optimized builds