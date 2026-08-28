# Kids English Player V2 — 가정용 단일 서버 이미지
FROM node:24-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# 런타임에 필요한 의존성만 별도로 설치한다 (Prisma Client + CLI + seed 실행용 tsx)
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

# 1) Prisma / seed 실행용 런타임 의존성
COPY --from=prod-deps /app/node_modules ./node_modules
# 2) Next.js standalone 산출물
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
# seed 가 사용하는 공용 상수/유틸
COPY --from=builder /app/src/lib ./src/lib
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && mkdir -p /app/data

EXPOSE 3200
ENTRYPOINT ["./docker-entrypoint.sh"]
