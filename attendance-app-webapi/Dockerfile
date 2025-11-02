# ==============================================
# Stage 1: Build Go Binary
# ==============================================
FROM golang:1.25-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git gcc musl-dev

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build static binary
RUN CGO_ENABLED=1 GOOS=linux go build -ldflags="-s -w -extldflags '-static'" -o /app/server main.go

# ==============================================
# Stage 2: Runtime Image (Minimal)
# ==============================================
FROM alpine:3.19

# Install runtime dependencies
RUN apk add --no-cache ca-certificates tzdata wget

# Create non-root user
RUN addgroup -g 1000 appuser && adduser -D -u 1000 -G appuser appuser

# Set working directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder --chown=appuser:appuser /app/server /app/server

# Copy migrations
COPY --from=builder --chown=appuser:appuser /app/database/migrations /app/database/migrations

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R appuser:appuser /app/uploads

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Run the application
CMD ["/app/server"]