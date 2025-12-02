# Circle USDC 통합 - 환경 변수 설정 가이드

## 📝 .env.local 파일에 추가할 내용

다음 환경 변수들을 `.env.local` 파일에 추가해주세요:

```bash
# Circle API (Testnet)
CIRCLE_API_KEY="TEST_API_KEY:6c3e611b61ce127ca6fb98a9e1a5bf61:44a9ace210bbf6f6cd1393777d2a81e2"
CIRCLE_CLIENT_KEY="TEST_CLIENT_KEY:43b485bdf604a0b0b540f4357d53ae4f:379007da1182a5e5199dea6899a734db"
CIRCLE_WEBHOOK_SECRET="circle-webhook-secret-testnet"
CIRCLE_TREASURY_ADDRESS="0x0000000000000000000000000000000000000000"
CIRCLE_TESTNET=true
```

## ⚙️ 설정 설명

- **CIRCLE_API_KEY**: Circle API 인증 키 (Testnet)
- **CIRCLE_CLIENT_KEY**: Circle 클라이언트 키
- **CIRCLE_WEBHOOK_SECRET**: Webhook 서명 검증용 시크릿
- **CIRCLE_TREASURY_ADDRESS**: 다이아몬드 구매 시 USDC를 받을 Treasury 지갑 주소
  - 현재는 임시 주소. 실제 구현 시 Circle에서 생성한 지갑 주소로 교체 필요
- **CIRCLE_TESTNET**: Testnet 모드 활성화 (true/false)

## 🔐 보안 주의사항

- `.env.local` 파일은 절대 Git에 커밋하지 마세요
- API 키는 클라이언트 코드에 노출되지 않도록 주의하세요
- 프로덕션 배포 시 환경 변수를 안전하게 관리하세요

## ✅ 설정 확인

환경 변수가 제대로 로드되는지 확인:

```bash
npm run dev
```

서버 시작 시 로그에 Circle API 초기화 메시지가 표시되어야 합니다.
