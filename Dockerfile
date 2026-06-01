# --- build the static site -------------------------------------------------
FROM node:22.11-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# --- serve it (non-root, unprivileged nginx on :8080) ----------------------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS run
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["wget", "-qO-", "http://127.0.0.1:8080/index.html"]
