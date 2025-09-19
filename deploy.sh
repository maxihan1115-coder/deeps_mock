#!/bin/bash

echo "🚀 EC2 배포 스크립트 시작..."

# 1. 최신 코드 가져오기 (Git 사용 시)
echo "📥 최신 코드 가져오기..."
git pull origin main

# 2. Docker Compose로 빌드 및 실행
echo "🔨 Docker 이미지 빌드 및 서버 실행..."
docker-compose up --build --no-cache -d

# 3. 실행 상태 확인
echo "✅ 서버 상태 확인..."
docker-compose ps

# 4. 로그 확인 (선택사항)
echo "📋 최근 로그 확인..."
docker-compose logs --tail=20

echo "🎉 배포 완료!"