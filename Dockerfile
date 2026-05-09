# -----------------------------------------------------------------------------
# 1. BASE: Shared configuration for all stages
# -----------------------------------------------------------------------------
FROM node:lts-alpine AS base
WORKDIR /app
# Install git for pnpm to fetch git dependencies
RUN apk add --no-cache git
# Force git to use HTTPS instead of SSH
RUN git config --global url."https://github.com/".insteadOf git@github.com:
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm
RUN pnpm config set only-built-dependencies-soft-fail true

# Copy workspace configs (the structure fixed)
FROM base AS configs
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# -----------------------------------------------------------------------------
# 2. DEPENDENCIES: Install modules (Cached & Parallel)
# -----------------------------------------------------------------------------
# 2a. Server Dependencies
FROM configs AS server-deps
COPY server/package.json ./server/
RUN pnpm config set store-dir /pnpm/store
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --filter server... --frozen-lockfile

# 2b. Client Dependencies
FROM configs AS client-deps
COPY client/package.json ./client/
RUN pnpm config set store-dir /pnpm/store
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --filter client... --frozen-lockfile

# -----------------------------------------------------------------------------
# 3. DEVELOPMENT: Server
# -----------------------------------------------------------------------------
FROM base AS server-dev
# Copy modules from the dependencies stage
COPY --from=server-deps /app/node_modules /app/node_modules
COPY --from=server-deps /app/server/node_modules /app/server/node_modules

# Copy source code
COPY server/ ./server/

WORKDIR /app/server
CMD ["npm", "run", "dev"]

# -----------------------------------------------------------------------------
# 4. DEVELOPMENT: Client
# -----------------------------------------------------------------------------
FROM base AS client-dev
COPY --from=client-deps /app/node_modules /app/node_modules
COPY --from=client-deps /app/client/node_modules /app/client/node_modules

COPY client/ ./client/

WORKDIR /app/client
CMD ["npm", "run", "dev", "--", "--host"]

# -----------------------------------------------------------------------------
# 5. PRODUCTION: Client (Nginx)
# -----------------------------------------------------------------------------
FROM nginx:alpine AS client-prod
# CHANGED: Copy directly from the host context (files uploaded by GH Actions)
# We remove '--from=client-build' because we are using the files on disk
COPY client/dist /usr/share/nginx/html

COPY client/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# -----------------------------------------------------------------------------
# 6. PRODUCTION: Server
# -----------------------------------------------------------------------------
FROM configs AS server-prod
COPY server/package.json ./server/
# Re-install only production dependencies to keep image small
RUN pnpm install --prod --frozen-lockfile --filter server...

COPY server/ ./server/
WORKDIR /app/server

# Copy necessary scripts or ecosystem files if they aren't in /server
# COPY server/ecosystem.config.js . 

EXPOSE 3001
CMD ["npx", "pm2-runtime", "ecosystem.config.js"]