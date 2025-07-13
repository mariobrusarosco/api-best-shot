# Dockerfile for Cloud Run using Official Playwright Image
# Uses Microsoft's official Playwright image with all browsers and dependencies pre-installed
FROM mcr.microsoft.com/playwright:v1.52.0-jammy AS base

# Set working directory
WORKDIR /app

# Enable Yarn 3
RUN corepack enable && corepack prepare yarn@3.8.7 --activate

# Install dependencies
COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --frozen-lockfile --production=false

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Production stage - using official Playwright image
FROM mcr.microsoft.com/playwright:v1.52.0-jammy AS production

WORKDIR /app

# Enable Yarn 3 in production stage too
RUN corepack enable && corepack prepare yarn@3.8.7 --activate

# Copy package files
COPY package.json yarn.lock .yarnrc.yml ./

# Install only production dependencies
RUN yarn install --frozen-lockfile --production=true && \
    yarn cache clean

# Copy built application from build stage
COPY --from=base /app/dist ./dist

# Use existing pwuser from Playwright image and set up directories
RUN mkdir -p /home/pwuser/Downloads && \
    chown -R pwuser:pwuser /home/pwuser && \
    chown -R pwuser:pwuser /app

# Switch to non-root user
USER pwuser

# Expose port (Cloud Run expects 8080 by default)
EXPOSE 8080

# Set environment to production
ENV NODE_ENV=production

# Playwright optimizations for Cloud Run
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/src/index.js"] 