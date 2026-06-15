# --- Stage 1: install production dependencies ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

# --- Stage 2: runtime image ---
FROM node:20-alpine
WORKDIR /app

# Bring in the already-installed node_modules from the deps stage.
COPY --from=deps /app/node_modules ./node_modules

# Copy application source.
COPY . .

# Run as the built-in non-root "node" user for safety.
USER node

EXPOSE 3000

CMD ["npm", "start"]
