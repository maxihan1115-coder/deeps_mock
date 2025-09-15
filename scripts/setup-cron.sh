#!/bin/bash

# Daily Quest Reset 크론잡 설정 스크립트
# 한국시간 00:00에 매일 실행

# 환경변수 확인
if [ -z "$SCHEDULER_API_KEY" ]; then
    echo "❌ SCHEDULER_API_KEY 환경변수가 설정되지 않았습니다."
    echo "예시: export SCHEDULER_API_KEY='your-secret-key-here'"
    exit 1
fi

if [ -z "$APP_URL" ]; then
    echo "❌ APP_URL 환경변수가 설정되지 않았습니다."
    echo "예시: export APP_URL='http://localhost:3000' 또는 'https://yourdomain.com'"
    exit 1
fi

# 크론잡 추가 (한국시간 00:00 = UTC 15:00)
CRON_JOB="0 15 * * * curl -X POST '$APP_URL/api/scheduler/daily-quest-reset' -H 'Authorization: Bearer $SCHEDULER_API_KEY' -H 'Content-Type: application/json' >> /var/log/daily-quest-reset.log 2>&1"

# 기존 크론잡 제거 (중복 방지)
(crontab -l 2>/dev/null | grep -v "daily-quest-reset") | crontab -

# 새 크론잡 추가
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Daily Quest Reset 크론잡이 설정되었습니다."
echo "📅 실행 시간: 매일 한국시간 00:00 (UTC 15:00)"
echo "🔗 API 엔드포인트: $APP_URL/api/scheduler/daily-quest-reset"
echo ""
echo "현재 설정된 크론잡:"
crontab -l | grep "daily-quest-reset"
echo ""
echo "로그 확인: tail -f /var/log/daily-quest-reset.log"
