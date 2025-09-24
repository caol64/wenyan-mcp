# Build stage
FROM node:22-alpine AS builder

ARG NPM_REGISTRY=https://registry.npmjs.org/
WORKDIR /app

# Configure registry and install dependencies
RUN npm config set registry ${NPM_REGISTRY}

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@10.7.1 && pnpm install --frozen-lockfile

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# Production stage
FROM node:22-alpine AS production
ENV NODE_ENV=production

WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/node_modules ./node_modules/
COPY --from=builder /app/dist ./dist/

# Set the entrypoint
CMD ["node", "dist/index.js"]