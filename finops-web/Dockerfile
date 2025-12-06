# --- Build Angular ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Set the API base for prod build (change at build-time)
ARG API_BASE=https://api.yourdomain.com
# Replace environment.prod.ts apiBase in-place
RUN sed -i "s#apiBase: '.*'#apiBase: '${API_BASE}'#g" src/environments/environment.prod.ts

RUN npm run build -- --configuration production

# --- Serve with Nginx ---
FROM nginx:alpine
# Basic gzip + single-page app fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/finops-web/browser /usr/share/nginx/html
EXPOSE 80