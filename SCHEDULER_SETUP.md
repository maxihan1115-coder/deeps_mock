# Daily Quest Reset 스케줄러 설정 가이드

## 📋 개요
한국시간 00:00에 매일 자동으로 9번, 10번 퀘스트를 모든 유저에게 초기화하는 스케줄러입니다.

## 🔧 설정 방법

### 1. 환경변수 설정
`.env` 파일에 다음 환경변수를 추가하세요:

```env
# Database
DATABASE_URL="mysql://username:password@host:3306/deeps_mock?planetscale_mode=true"

# BApp API Keys
BAPP_API_KEY=Basic SjNOZDRxcW5mWXFMWTNQYzogUVBhUlJkYVFmSGtBTGRidml1cmMxbVdYVFZ1a3g3Yzc=
BAPP_AUTH_TOKEN=your-bapp-auth-token-here

# Scheduler Configuration
SCHEDULER_API_KEY=your-very-secure-random-key-here
APP_URL=http://localhost:3000  # 로컬 개발용
# APP_URL=https://yourdomain.com  # 프로덕션용

# Development
NODE_ENV=development
```

**중요**: `SCHEDULER_API_KEY`는 강력한 랜덤 키를 사용하세요. 예시:
```bash
# 랜덤 키 생성 (32자리)
openssl rand -hex 32
```

### 2. 크론잡 설정
서버에서 다음 명령어를 실행하세요:

```bash
# 환경변수 설정
export SCHEDULER_API_KEY="your-very-secure-random-key-here"
export APP_URL="https://yourdomain.com"

# 크론잡 설정 스크립트 실행
./scripts/setup-cron.sh
```

### 3. 수동 테스트
스케줄러가 정상 작동하는지 테스트:

```bash
# POST 요청으로 테스트
curl -X POST 'http://localhost:3000/api/scheduler/daily-quest-reset' \
  -H 'Authorization: Bearer your-very-secure-random-key-here' \
  -H 'Content-Type: application/json'

# GET 요청으로 테스트 (간단한 테스트용)
curl 'http://localhost:3000/api/scheduler/daily-quest-reset?auth=your-very-secure-random-key-here'
```

## 📅 실행 시간
- **한국시간**: 매일 00:00
- **UTC 시간**: 매일 15:00
- **크론 표현식**: `0 15 * * *`

## 📊 로그 확인
```bash
# 크론잡 실행 로그 확인
tail -f /var/log/daily-quest-reset.log

# 현재 설정된 크론잡 확인
crontab -l
```

## 🔒 보안 고려사항
1. `SCHEDULER_API_KEY`는 강력한 랜덤 키를 사용하세요
2. 프로덕션에서는 HTTPS를 사용하세요
3. API 키는 환경변수로만 관리하고 코드에 하드코딩하지 마세요

## 🚨 문제 해결
- **401 Unauthorized**: `SCHEDULER_API_KEY`가 올바르게 설정되었는지 확인
- **크론잡이 실행되지 않음**: 서버 시간대와 크론잡 시간 설정 확인
- **API 호출 실패**: `APP_URL`이 올바른지 확인

## 📝 API 응답 예시
```json
{
  "success": true,
  "message": "Daily Quest 초기화 완료",
  "resetCount": 150,
  "resetTime": "2024-01-15T15:00:00.000Z"
}
```
