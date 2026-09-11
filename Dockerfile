FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package.json y package-lock.json explícitamente desde backend
COPY backend/package.json backend/package-lock.json ./

RUN npm ci

# Copiar todo el contenido del backend
COPY backend/ ./

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY backend/package.json backend/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["npm", "start"]
