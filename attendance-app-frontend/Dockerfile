# ==============================================
# Stage 1: Build Application
# ==============================================
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --legacy-peer-deps

COPY . .

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# ==============================================
# Stage 2: Production Runtime (Node.js Server)
# ==============================================
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY --from=builder /app/package.json /app/package-lock.json ./

# Copy node_modules from builder (includes all dependencies)
COPY --from=builder /app/node_modules ./node_modules

# Copy built application from builder (.output folder from Nitro build)
COPY --from=builder /app/.output ./.output

# Copy public folder for assets
COPY --from=builder /app/public ./public

# Change ownership to node user (already exists in node:alpine)
RUN chown -R node:node /app

USER node

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=10s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the application using npm start (runs: node .output/server/index.mjs)
CMD ["npm", "run", "start"]