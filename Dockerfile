# Multistage build for Node.js Fullstack application
FROM node:24-slim AS base
RUN npm install -g pnpm
WORKDIR /app

# Stage 2: Install dependencies
FROM base AS dependencies
# Copy package manifest files to cache install layer
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/ai-agent/package.json ./artifacts/ai-agent/
COPY artifacts/mockup-sandbox/package.json ./artifacts/mockup-sandbox/
COPY lib/db/package.json ./lib/db/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY scripts/package.json ./scripts/

# Install all dependencies (including devDependencies) for build stage
RUN pnpm install --ignore-scripts

# Stage 3: Build application
FROM dependencies AS builder
COPY . .

# Set environment variables for build time
ENV NODE_ENV=production
ENV PORT=5000
ENV BASE_PATH=/

# Allow Supabase keys to be embedded at build time for the React frontend
ARG VITE_SUPABASE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build all workspaces
RUN pnpm run build

# Stage 4: Run application
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=5000

# Copy root manifest files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy built code
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/api-server/package.json ./artifacts/api-server/package.json
COPY --from=builder /app/artifacts/ai-agent/dist ./artifacts/ai-agent/dist
COPY --from=builder /app/artifacts/ai-agent/package.json ./artifacts/ai-agent/package.json

# Copy workspaces needed for DB migrations and runtime packages
COPY --from=builder /app/lib/db ./lib/db
COPY --from=builder /app/lib/api-zod ./lib/api-zod

# Copy node_modules to run code and run database push migrations
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/artifacts/api-server/node_modules ./artifacts/api-server/node_modules
COPY --from=dependencies /app/lib/db/node_modules ./lib/db/node_modules
COPY --from=dependencies /app/lib/api-zod/node_modules ./lib/api-zod/node_modules

EXPOSE 5000

# Push DB schema changes at startup, then launch the API Server (which serves the frontend SPA)
CMD ["sh", "-c", "pnpm --filter @workspace/db run push && node artifacts/api-server/dist/index.mjs"]
