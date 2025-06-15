# Use the official Microsoft Playwright image which includes all necessary dependencies
FROM mcr.microsoft.com/playwright:v1.42.1-jammy

# Set the working directory
WORKDIR /app

# Copy package.json and yarn.lock
COPY package.json yarn.lock ./

# Install app dependencies
RUN yarn install

# The official Playwright Docker image already has browsers installed
# No need to install them again

# Copy app source
COPY . .

# Build the application
RUN yarn build

# Set environment variables
ENV NODE_ENV=production
# No need to set PLAYWRIGHT_BROWSERS_PATH as it's already configured in the base image

# Expose the port the app will run on
EXPOSE 9090

# Command to start the application
CMD ["node", "-r", "dotenv/config", "./dist/src/index.js"]
