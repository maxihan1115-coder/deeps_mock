#!/bin/bash

# 스케줄러 API 키 생성 스크립트

echo "🔐 Daily Quest Reset 스케줄러 API 키 생성"
echo "=========================================="

# 32바이트 랜덤 키 생성
SCHEDULER_KEY=$(openssl rand -hex 32)

echo "생성된 SCHEDULER_API_KEY:"
echo "SCHEDULER_API_KEY=$SCHEDULER_KEY"
echo ""
echo "이 키를 .env 파일에 추가하세요:"
echo "echo 'SCHEDULER_API_KEY=$SCHEDULER_KEY' >> .env"
echo ""
echo "또는 직접 복사해서 사용하세요:"
echo "$SCHEDULER_KEY"
