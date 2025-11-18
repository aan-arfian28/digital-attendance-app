# ==============================================
# Stage 1: Build Application
# ==============================================
FROM node:24-alpine3.22 AS builder

WORKDIR /app

# Install dependencies with retry and timeout configurations
COPY package.json package-lock.json ./

RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm ci --legacy-peer-deps --prefer-offline --no-audit

COPY . .

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# ==============================================
# Stage 2: Production Runtime (Nginx Server for SPA)
# ==============================================
FROM nginx:alpine

# Copy public folder for assets first
COPY --from=builder /app/public /usr/share/nginx/html

# Copy built static files from builder (TanStack Start outputs to dist/client)
# This will overwrite index.html from public with the built one
COPY --from=builder /app/dist/client /usr/share/nginx/html

# Create custom nginx configuration for SPA routing
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index _shell.html; \
    location / { \
    try_files $uri $uri/ /_shell.html; \
    } \
    location /api { \
    proxy_pass http://backend:8080; \ 
    proxy_http_version 1.1; \
    proxy_set_header Upgrade $http_upgrade; \
    proxy_set_header Connection "upgrade"; \
    proxy_set_header Host $host; \
    proxy_set_header X-Real-IP $remote_addr; \
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
    proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ { \
    expires 1y; \
    add_header Cache-Control "public, immutable"; \
    } \
    }' > /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=10s \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
