#!/bin/bash

echo "🔄 서버 재빌드 및 재시작 시작..."

# 1. 기존 서버 중지
echo "⏹️ 기존 서버 중지 중..."
docker-compose down

# 2. 사용하지 않는 이미지 정리 (선택사항)
echo "🧹 사용하지 않는 Docker 리소스 정리..."
docker system prune -f

# 3. 새로 빌드 및 서버 시작
echo "🔨 새로 빌드 및 서버 시작..."
docker-compose up --build --no-cache -d

# 4. 서버 상태 확인
echo "✅ 서버 상태 확인..."
sleep 5
docker-compose ps

# 5. 로그 확인
echo "📋 서버 로그 확인..."
docker-compose logs --tail=10

echo "🎉 재빌드 및 재시작 완료!"
