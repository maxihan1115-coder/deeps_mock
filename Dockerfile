# Node.js 18 Alpine 이미지 사용 (메모리 최적화)
FROM node:18-alpine AS base

# 메모리 및 스왑 설정
ENV NODE_OPTIONS="--max-old-space-size=4096"

# 의존성 설치 단계
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# package.json과 package-lock.json 복사
COPY package.json package-lock.json* ./

# prisma 스키마를 먼저 복사 (postinstall에서 prisma generate가 실행되므로 필요)
COPY prisma ./prisma/

# 의존성 설치 (postinstall 포함, 메모리 제한 설정)
RUN NODE_OPTIONS="--max-old-space-size=2048" npm ci --legacy-peer-deps

# 빌드 단계
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma 클라이언트 생성 (메모리 제한 설정)
RUN NODE_OPTIONS="--max-old-space-size=2048" npx prisma generate

# Next.js 빌드 (메모리 제한 설정)
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build

# 프로덕션 단계
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# 시스템 사용자 생성
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 빌드된 애플리케이션 복사
COPY --from=builder /app/public ./public

# 자동으로 활용되는 출력 디렉토리를 설정하여 next.js가 정적 파일을 복사하도록 합니다.
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]