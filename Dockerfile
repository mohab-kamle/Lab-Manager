# -----------------------------------------------------------------------------
# 1. BASE: Shared configuration for all stages
# -----------------------------------------------------------------------------
FROM node:lts-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

# Copy workspace configs (the structure fixed)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# -----------------------------------------------------------------------------
# 2. DEPENDENCIES: Install modules (Cached)
# -----------------------------------------------------------------------------
FROM base AS dependencies
# Install all dependencies (including devDependencies) for building
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# 3. DEVELOPMENT: Server
# -----------------------------------------------------------------------------
FROM base AS server-dev
# Copy modules from the dependencies stage
COPY --from=dependencies /app/node_modules /app/node_modules
COPY --from=dependencies /app/server/node_modules /app/server/node_modules
COPY --from=dependencies /app/client/node_modules /app/client/node_modules

# Copy source code
COPY server/ ./server/

WORKDIR /app/server
CMD ["npm", "run", "dev"]

# -----------------------------------------------------------------------------
# 4. DEVELOPMENT: Client
# -----------------------------------------------------------------------------
FROM base AS client-dev
COPY --from=dependencies /app/node_modules /app/node_modules
COPY --from=dependencies /app/client/node_modules /app/client/node_modules
# (Optional) Copy server modules if client relies on shared types in server
COPY --from=dependencies /app/server/node_modules /app/server/node_modules

COPY client/ ./client/

WORKDIR /app/client
CMD ["npm", "run", "dev", "--", "--host"]

# -----------------------------------------------------------------------------
# 5. PRODUCTION: Client (Nginx)
# -----------------------------------------------------------------------------
FROM nginx:alpine AS client-prod
# Copy the built assets from the 'client-build' stage
COPY /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# -----------------------------------------------------------------------------
# 6. PRODUCTION: Server
# -----------------------------------------------------------------------------
FROM base AS server-prod
# Re-install only production dependencies to keep image small
RUN pnpm install --prod --frozen-lockfile

COPY server/ ./server/
WORKDIR /app/server

# Copy necessary scripts or ecosystem files if they aren't in /server
# COPY server/ecosystem.config.js . 

EXPOSE 3001
CMD ["npx", "pm2-runtime", "ecosystem.config.js"]