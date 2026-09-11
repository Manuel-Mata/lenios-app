FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos package del backend
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

RUN npm ci

# Copiar todo el backend
COPY backend/ ./

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY backend/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["npm", "start"]
