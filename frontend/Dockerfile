# Multi-stage build for optimal image size
# Stage 1: Build the app
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --silent

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Stage 2: Production image
FROM node:18-alpine AS production

# Install serve globally
RUN npm install -g serve

# Create app directory
WORKDIR /app

# Copy built files from builder stage
COPY --from=builder /app/build ./build

# Expose port
EXPOSE 3000

# Serve the built app
CMD ["serve", "-s", "build", "-l", "3000"]
