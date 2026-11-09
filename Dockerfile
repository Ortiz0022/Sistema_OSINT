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

# --- Etapa 2: imagen final, solo dependencias de producción ---
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production \
    PORT=3001
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/build/server ./server

# Usuario sin privilegios (el usuario "node" ya existe en la imagen base).
USER node
EXPOSE 3001
CMD ["node", "server/index.js"]
