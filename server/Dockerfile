FROM node:lts-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Create necessary directories
RUN mkdir -p uploads logs

EXPOSE 3001

# Health check for PM2 cluster mode
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use PM2 runtime for cluster mode in production
CMD ["npx", "pm2-runtime", "ecosystem.config.js"]