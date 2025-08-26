#!/bin/bash

# AWS EC2 Docker 배포 스크립트
echo "🚀 Starting deployment..."

# 환경 변수 확인
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set"
    exit 1
fi

if [ -z "$BAPP_API_KEY" ]; then
    echo "❌ BAPP_API_KEY is not set"
    exit 1
fi

# 기존 컨테이너 중지 및 제거
echo "🛑 Stopping existing containers..."
docker-compose down

# 기존 이미지 제거 (선택사항)
echo "🧹 Cleaning up old images..."
docker system prune -f

# 새 이미지 빌드
echo "🔨 Building new Docker image..."
docker-compose build --no-cache

# 컨테이너 시작
echo "🚀 Starting containers..."
docker-compose up -d

# 헬스체크 대기
echo "⏳ Waiting for health check..."
sleep 30

# 헬스체크 확인
echo "🏥 Checking application health..."
curl -f http://localhost:3000/api/health

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "🌐 Application is running on http://localhost:3000"
else
    echo "❌ Deployment failed!"
    echo "📋 Checking logs..."
    docker-compose logs
    exit 1
fi
