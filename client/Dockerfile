FROM node:18-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY . .
RUN pnpm install --frozen-lockfile

# Remove BOM characters from environment files
RUN sed -i '1s/^\xEF\xBB\xBF//' .env* 2>/dev/null || true

# Debug: Check files after BOM removal
RUN echo "=== .env.production after BOM removal ===" && cat ./.env.production

RUN pnpm run build -- --mode production

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1
CMD ["nginx", "-g", "daemon off;"]