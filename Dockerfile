# Kids English Player — Mac mini 로컬 서버용 이미지
FROM node:24-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# 런타임에 필요한 의존성만 따로 설치한다. (Prisma Client + prisma CLI)
FROM node:24-alpine AS prod-deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

FROM node:24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npx next build

FROM node:24-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3200 \
    HOSTNAME=0.0.0.0 \
    TZ=Asia/Seoul \
    DATABASE_URL=file:/app/data/app.db

# 1) Prisma 실행에 필요한 런타임 의존성
COPY --from=prod-deps /app/node_modules ./node_modules
# 2) Next.js standalone 산출물 (자체 node_modules 를 위에 덮어쓴다)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && mkdir -p /app/data

EXPOSE 3200
ENTRYPOINT ["./docker-entrypoint.sh"]
