#!/bin/bash

# 설정
EC2_HOST="54.254.104.81"
EC2_USER="ubuntu"
KEY_PATH="~/Downloads/maxi.pem"
REMOTE_DIR="/home/ubuntu/deeps_mock"

echo "🚀 배포 시작: 로컬 빌드 -> EC2 전송 방식"

# 1. 로컬 빌드
echo "📦 로컬에서 빌드 중..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 빌드 실패! 배포를 중단합니다."
    exit 1
fi

# 2. 불필요한 파일 정리 (선택 사항)
# echo "🧹 정리 중..."
# rm -rf .next/cache

# 3. 파일 전송 (rsync 사용)
echo "📤 EC2로 파일 전송 중..."
# .next, public, package.json, prisma, .env 등 실행에 필요한 파일만 전송
rsync -avz -e "ssh -i $KEY_PATH" \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env.local' \
    .next public package.json package-lock.json prisma next.config.mjs \
    $EC2_USER@$EC2_HOST:$REMOTE_DIR

# 4. EC2에서 의존성 설치 및 재시작
echo "🔄 EC2에서 서비스 재시작 중..."
ssh -i $KEY_PATH $EC2_USER@$EC2_HOST << EOF
    cd $REMOTE_DIR
    
    # 의존성 설치 (프로덕션용만)
    echo "📦 의존성 설치..."
    npm ci --production --legacy-peer-deps

    # PM2로 재시작 (또는 npm start)
    echo "🚀 서비스 재시작..."
    pm2 reload deeps-mock || pm2 start npm --name "deeps-mock" -- start
    
    echo "✅ 배포 완료!"
EOF
