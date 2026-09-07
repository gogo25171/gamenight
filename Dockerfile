# ─────────────── deps ───────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Installe uniquement les dépendances de production à partir du lockfile
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ─────────────── runtime ───────────────
FROM node:20-alpine

ENV NODE_ENV=production
ENV PORT=4000

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json server.js ./
COPY public ./public

USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/" > /dev/null || exit 1

CMD ["node", "server.js"]
