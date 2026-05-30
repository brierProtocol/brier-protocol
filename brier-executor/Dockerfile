FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
# Usuario sin privilegios para no correr como root
RUN addgroup -S brier && adduser -S brier -G brier
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
USER brier
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1
CMD ["node", "dist/server.js"]
