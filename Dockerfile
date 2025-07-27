# Multi-stage Dockerfile for Cloud Run
# Build stage: Compiles TypeScript with all dependencies
# Production stage: Lean runtime with only production dependencies

# ================================
# Build Stage
# ================================
FROM mcr.microsoft.com/playwright:v1.54.1-jammy AS builder

WORKDIR /app

# Enable Yarn 3
RUN corepack enable && corepack prepare yarn@3.8.7 --activate

# Copy package management files
COPY package.json yarn.lock .yarnrc.yml ./

# Install ALL dependencies (needed for TypeScript compilation)
RUN yarn install --immutable

# Copy source code
COPY . .

# Build the application
RUN yarn build

# ================================
# Production Stage
# ================================
FROM mcr.microsoft.com/playwright:v1.54.1-jammy AS production

WORKDIR /app

# Enable Yarn 3
RUN corepack enable && corepack prepare yarn@3.8.7 --activate

# Copy package management files
COPY package.json yarn.lock .yarnrc.yml ./

# Create a production-only install by temporarily setting NODE_ENV
# This ensures only production dependencies are installed
RUN NODE_ENV=production yarn install --immutable && \
    yarn cache clean --all

# Copy the built application from builder stage
COPY --from=builder /app/dist ./dist

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