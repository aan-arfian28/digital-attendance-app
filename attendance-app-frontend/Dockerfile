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

# Copy hasil build (dist)
COPY --from=builder /app/dist/client /usr/share/nginx/html

# Copy file nginx.conf GLOBAL yang baru kita buat
# Perhatikan tujuannya: /etc/nginx/nginx.conf (Menimpa config bawaan)
COPY nginx.conf /etc/nginx/nginx.conf

# Hapus default config bawaan agar tidak bentrok
RUN rm -rf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=10s \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
