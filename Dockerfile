# syntax=docker/dockerfile:1
# Ítem 3.3 — Imagen candidata del backend (proxy OIJ).
# El frontend se publica como sitio estático; esta imagen contiene solo la API.

ARG NODE_VERSION=22-alpine

# --- Etapa 1: compilar el backend TypeScript a JavaScript ---
FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.server.json tsconfig.server.build.json ./
COPY server ./server
RUN npm run build:server

# --- Etapa 2: instalar solo las dependencias de producción ---
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# --- Etapa 3: imagen final ---
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production \
    PORT=3001
# La app no usa npm, npx, corepack ni yarn en ejecución. Se eliminan porque traen
# dependencias propias con vulnerabilidades (detectadas por Trivy) y no aportan nada.
RUN rm -rf /usr/local/lib/node_modules \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
           /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*
WORKDIR /app
COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build/server ./server

# Usuario sin privilegios (el usuario "node" ya existe en la imagen base).
USER node
EXPOSE 3001
CMD ["node", "server/index.js"]
