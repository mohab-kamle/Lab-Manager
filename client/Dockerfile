FROM node:18-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY . .
COPY sync-version.js ../sync-version.js
COPY tag-version.js ../tag-version.js
RUN pnpm install --frozen-lockfile
RUN pnpm run build -- --mode production


FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1
CMD ["nginx", "-g", "daemon off;"]