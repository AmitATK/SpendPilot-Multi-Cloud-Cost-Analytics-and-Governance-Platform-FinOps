# --- Build stage ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# optional: faster nest build if you have a build script
RUN npm run build

# --- Runtime stage ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# only runtime deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
# copy compiled code + any migrations
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./db
EXPOSE 3000
CMD ["node", "dist/main.js"]