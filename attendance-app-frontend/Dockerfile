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

# Install wget (karena nginx:alpine tidak memilikinya by default)
# Ini diperlukan untuk HEALTHCHECK
RUN apk add --no-cache wget

# Copy public folder for assets first
COPY --from=builder /app/public /usr/share/nginx/html

# Copy built static files from builder (TanStack Start outputs to dist/client)
# This will overwrite index.html from public with the built one
COPY --from=builder /app/dist/client /usr/share/nginx/html

# --- INI ADALAH PERBAIKANNYA ---
# Hapus 'RUN echo...' dan GANTI dengan 'COPY'
# Ini akan menyalin file nginx.conf Anda yang benar ke dalam image
COPY nginx.conf /etc/nginx/conf.d/default.conf
# ---------------------------------

EXPOSE 80

# Perbarui HEALTHCHECK untuk menggunakan endpoint /health yang Anda buat
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=10s \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
