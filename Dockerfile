# ─────────────── deps ───────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Installe uniquement les dépendances de production à partir du lockfile
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ─────────────── runtime ───────────────
FROM node:20-alpine

# Pull patched Alpine packages. The base image lags behind openssl
# security releases, and Trivy fails the build on fixable CVEs.
RUN apk upgrade --no-cache

ENV NODE_ENV=production
ENV PORT=4000

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json server.js ./
COPY public ./public

# Numeric uid: the 'node' user is 1000 in the official images, and a numeric id
# is resolvable by hosts that enforce runAsNonRoot (hadolint DL3066).
USER 1000:1000

EXPOSE 4000

# JSON form (hadolint DL3025); /bin/sh -c is what expands ${PORT}.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["/bin/sh", "-c", "wget -qO- \"http://127.0.0.1:${PORT}/\" > /dev/null || exit 1"]

CMD ["node", "server.js"]
