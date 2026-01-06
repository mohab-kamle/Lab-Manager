# Docker & PNPM Architecture

## Overview
The project uses a **PNPM Monorepo** structure combined with **Multi-Stage Docker Builds** to ensure efficient caching, fast local development, and optimized production builds.

## PNPM Workspace
- **Structure**: Defined in `pnpm-workspace.yaml`.
    - `client/`: Frontend (React/Vite)
    - `server/`: Backend (Express/Node)
- **Dependency Management**:
    - `pnpm install` in the root installs dependencies for all workspaces.
    - Shared dependencies and lockfile (`pnpm-lock.yaml`) are managed at the root.

## Docker Configuration

### Dockerfile Strategy
The `Dockerfile` is a multi-stage build file that supports both development and production targets in a single file.

1.  **Base Stage**:
    - Sets up the base Node.js image (Alpine).
    - Installs `pnpm` globally.
    - Copies **only** package configs (`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`) first.
    - This allows Docker to cache the dependency installation layer. If your code changes but dependencies don't, this layer is reused, speeding up builds significantly.

2.  **Dependencies Stage**:
    - Runs `pnpm install --frozen-lockfile`.
    - All dependencies are installed here and cached.

3.  **Development Stages** (`server-dev`, `client-dev`):
    - Optimized for local development.
    - Uses `CMD` to run dev servers (`npm run dev`).

4.  **Client Build Stage** (`client-build`) *[Added Jan 2026]*:
    - Explicitly builds the frontend assets using `npm run build`.
    - This generates the `dist/` folder required for Nginx.

5.  **Production Stages**:
    - **Server (`server-prod`)**: Re-installs only production dependencies (`pnpm install --prod`) to keep the image small.
    - **Client (`client-prod`)**: Uses `nginx:alpine` to serve static assets from the `client-build` stage.

### Docker Compose
We use separate compose files for clarity and specific behaviors:

#### `docker-compose.dev.yml` (Local Development)
- **Purpose**: Hot-reloading and debugging.
- **Volumes**:
    - Mounts `./client` and `./server` source code into containers.
    - **Crucial**: Uses anonymous volumes for `node_modules` (`/app/node_modules`, `/app/client/node_modules`, etc.) to prevent the host's empty/OS-specific modules from overwriting the container's installed modules.
- **Commands**:
    - Overrides commands to include `--host` for Vite and `nodemon` for Server.

#### `docker-compose.prod.yml` (Deployment)
- **Purpose**: Stable, optimized production deployment.
- **Builds**:
    - Uses `target: server-prod` and `target: client-prod` from the Dockerfile.
- **Infrastructure**:
    - **Nginx**: Serves the frontend on port 80.
    - **Redis**: For caching/sessions.
    - **MySQL**: Persistent database.
    - **Cloudflared**: Secure tunnel for public access without opening ports.

## Recent Updates & Fixes
- **Verified Legit Architecture**: Confirmed validity of PNPM monorepo structure and Docker caching layers.
