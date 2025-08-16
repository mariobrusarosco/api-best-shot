# Multi-stage Dockerfile for Cloud Run with optimized caching
# Dependencies stage: Install and cache dependencies separately
# Builder stage: Compile TypeScript using cached dependencies  
# Production stage: Lean runtime with only production dependencies

# ================================
# Dependencies Stage (Cached Layer)
# ================================
FROM mcr.microsoft.com/playwright:v1.54.1-jammy AS dependencies

WORKDIR /app

# Enable Yarn 3
RUN corepack enable && corepack prepare yarn@3.8.7 --activate

# Copy ONLY package management files for better caching
# This layer will be cached unless package.json/yarn.lock changes
COPY package.json yarn.lock .yarnrc.yml ./

# Install ALL dependencies (including dev dependencies for building)
# This expensive step gets cached when dependencies don't change
RUN yarn install --immutable --frozen-lockfile

# ================================
# Builder Stage (Uses Cached Dependencies)
# ================================
FROM dependencies AS builder

# Copy source code (separate from dependencies for better caching)
COPY . .

# Build the application using pre-installed dependencies
RUN yarn build

# ================================
# Production Dependencies Stage
# ================================
FROM mcr.microsoft.com/playwright:v1.54.1-jammy AS prod-deps

WORKDIR /app

# Enable Yarn 3
RUN corepack enable && corepack prepare yarn@3.8.7 --activate

# Copy package management files
COPY package.json yarn.lock .yarnrc.yml ./

# Install ONLY production dependencies for smaller final image
RUN NODE_ENV=production yarn install --immutable --frozen-lockfile && \
    yarn cache clean --all

# ================================
# Production Runtime Stage
# ================================
FROM mcr.microsoft.com/playwright:v1.54.1-jammy AS production

WORKDIR /app

# Copy production dependencies from cached layer
COPY --from=prod-deps /app/node_modules ./node_modules

# Copy the built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy package.json for metadata (version, etc.)
COPY --from=builder /app/package.json ./package.json

# Set up directories and permissions for pwuser
RUN mkdir -p /home/pwuser/Downloads && \
    chown -R pwuser:pwuser /home/pwuser && \
    chown -R pwuser:pwuser /app

# Switch to non-root user for security
USER pwuser

# Expose port (Cloud Run expects 8080)
EXPOSE 8080

# Playwright optimizations for Cloud Run environment
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
# NODE_ENV will be provided by Cloud Run environment variables
CMD ["node", "dist/src/index.js"] 