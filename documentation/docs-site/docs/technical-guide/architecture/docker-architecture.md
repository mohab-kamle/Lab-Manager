# Docker & PNPM Architecture
This `README` is designed to be dropped directly into your project root (e.g., as `MIGRATION_GUIDE.md` or appended to your main `README.md`). It explains the *why*, the *how*, and the *what now* for your team.

---

# 🏗️ Architecture Migration Guide: pnpm Monorepo & Unified Docker

> **TL;DR:** We have moved to a **Monorepo structure**.
> * ❌ **STOP** running `npm install` inside `client/` or `server/`.
> * ✅ **START** running `pnpm install` only in the **Root**.
> * ✅ **ALWAYS** run Docker commands from the **Root**.
> 
> 

---

## 1. Why the Change?

Previously, our project treated `client` and `server` as completely isolated islands. This caused several issues:

1. **Dependency Hell:** We had multiple `node_modules` folders consuming gigabytes of disk space with duplicate packages.
2. **Version Conflicts:** The root, client, and server were often using different versions of the same library (e.g., `mysql2`), leading to "it works on my machine" bugs.
3. **Docker Redundancy:** We were maintaining three separate Dockerfiles with nearly identical setup steps. Updating Node.js versions required editing three files.

**The Solution:** We have converted the project into a **pnpm Workspace**.

* **One Lockfile to Rule Them All:** A single `pnpm-lock.yaml` at the root ensures everyone uses the exact same package versions.
* **Shared Cache:** Dependencies used by both client and server are stored only once on your disk.
* **Unified Docker:** A single, multi-stage `Dockerfile` now handles development and production for both services.

---

## 2. Developer Workflow (New Standard)

### 📦 Installing Dependencies

**Old Way:** `cd server && npm install` (❌ DO NOT DO THIS)
**New Way:**
Run this **once** in the root directory:

```bash
pnpm install

```

*This installs dependencies for the Root, Client, and Server simultaneously and links them together.*

### ➕ Adding a New Package

Since we share a lockfile, you must tell `pnpm` *which* project needs the package.

**Scenario:** You want to add `uuid` to the **Server**.

1. **Do not** `cd` into `server`. Stay in the Root.
2. Run the filter command:
```bash
pnpm add uuid --filter server

```


3. **For the Client:**
```bash
pnpm add date-fns --filter client

```


4. **For the Root (Dev Tools like Husky/Eslint):**
```bash
pnpm add -D husky -w

```


*(The `-w` flag means "workspace root")*

### 🚀 Running the App

You can now orchestrate everything from the root.

* **Start Client & Server (if configured):**
```bash
pnpm dev

```


* **Run a script in a specific folder:**
```bash
pnpm --filter server run db:migrate

```



---

## 3. Docker Updates

We have deleted the individual Dockerfiles in `client/` and `server/`. There is now **one master `Dockerfile**` in the root.

### ⚠️ Important: Build Context

You **MUST** run all Docker Compose commands from the **Root Directory**. The Docker build context is now set to `.` (root) so it can see the workspace config.

### How to Apply Changes in Docker

Because dependencies are now baked into the Docker image, if you add a package (like `uuid`), the container won't see it until you rebuild.

**The Workflow:**

1. You added a package: `pnpm add uuid --filter server`
2. **Rebuild the specific container:**
```bash
docker compose -f docker-compose.dev.yml up -d --build backend

```


*(Replacing `backend` with `frontend` if you changed client deps).*

---

## 4. Troubleshooting ("The Nuclear Option")

If you are seeing weird errors like "module not found" or mismatched versions after pulling the latest code, your local `node_modules` might be stale.

**Run this sequence from the Root to reset everything:**

1. **Clean:**
```bash
# Windows (PowerShell)
rm -r node_modules; rm -r client/node_modules; rm -r server/node_modules

# Mac/Linux
rm -rf node_modules client/node_modules server/node_modules

```


2. **Reinstall:**
```bash
pnpm install

```


3. **Rebuild Docker:**
```bash
docker compose -f docker-compose.dev.yml up -d --build

```



---

## 5. Cheat Sheet

| Action | Command (Run from Root) |
| --- | --- |
| **Install All Deps** | `pnpm install` |
| **Add Pkg to Server** | `pnpm add <pkg> --filter server` |
| **Add Pkg to Client** | `pnpm add <pkg> --filter client` |
| **Run Server Script** | `pnpm --filter server run <script_name>` |
| **Update Docker** | `docker compose ... up -d --build` |


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
