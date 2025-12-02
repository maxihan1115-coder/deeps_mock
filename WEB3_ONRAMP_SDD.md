# Web3 Wallet & USDC On-Ramp Integration SDD

## 1. 개요
사용자가 자신의 외부 지갑(MetaMask, WalletConnect 등)을 게임에 연결하고, 신용카드를 사용하여 USDC를 구매하여 해당 지갑으로 바로 충전(On-Ramp)하는 기능을 구현한다.

## 2. 기술 스택
- **Wallet Connection**: `wagmi` (React Hooks for Ethereum), `ConnectKit` (UI Component), `viem` (Ethereum Interface)
- **Payments**: Circle Payments API (Card Processing)
- **Encryption**: `openpgp` (Client-side Card Data Encryption)

## 3. 기능 명세

### 3.1. 지갑 연결 (Wallet Connection)
- **지원 지갑**: MetaMask, WalletConnect (모바일 지갑 등)
- **기능**:
  - 지갑 연결 버튼 제공
  - 연결된 지갑 주소 및 네트워크 표시
  - 지갑 연결 시 서명(Sign Message)을 통해 본인 인증 및 DB 저장

### 3.2. USDC 충전 (On-Ramp)
- **카드 등록 및 결제**:
  - 사용자가 카드 정보(번호, CVC, 유효기간) 입력
  - 프론트엔드에서 Circle Public Key로 카드 정보 암호화
  - 암호화된 정보를 백엔드로 전송
- **결제 처리 (Backend)**:
  - Circle `createCard` API로 카드 토큰 생성 (최초 1회)
  - Circle `createPayment` API로 결제 요청
- **USDC 전송 (Settlement)**:
  - 결제 성공(Confirmed) 시, Treasury 지갑에서 사용자의 연결된 외부 지갑으로 USDC 전송
  - Circle `createTransfer` API 사용

## 4. 데이터베이스 스키마 변경
`prisma/schema.prisma`에 다음 모델 추가/수정:

```prisma
// 외부 지갑 정보
model ExternalWallet {
  id        String   @id @default(uuid())
  userId    Int
  user      User     @relation(fields: [userId], references: [uuid])
  address   String   // 지갑 주소 (0x...)
  chain     String   // 연결된 체인 (e.g., "MATIC-AMOY")
  label     String?  // 지갑 별칭 (e.g., "MetaMask")
  isPrimary Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, address])
  @@map("external_wallets")
}

// 카드 결제 내역
model CardPayment {
  id                  String   @id @default(uuid())
  userId              Int
  circlePaymentId     String   @unique // Circle Payment ID
  amount              String   // 결제 금액 (USD)
  usdcAmount          String   // 지급된 USDC 양
  status              String   // PENDING, CONFIRMED, FAILED
  cardId              String?  // Circle Card ID
  toAddress           String   // 지급된 지갑 주소
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@map("card_payments")
}
```

## 5. API 엔드포인트

### 5.1. 지갑 관리
- `POST /api/wallet/connect`: 지갑 연결 및 서명 검증
- `GET /api/wallet/list`: 연결된 지갑 목록 조회

### 5.2. 결제 및 충전
- `GET /api/circle/public-key`: 카드 암호화용 Public Key 조회
- `POST /api/circle/payment/card`: 카드 결제 및 USDC 충전 요청

## 6. 구현 단계

### Phase 1: Web3 환경 설정
1. `wagmi`, `connectkit`, `viem` 설치
2. `Web3Provider` 컴포넌트 구현 및 `layout.tsx`에 적용

### Phase 2: 지갑 연결 UI
1. `ConnectWalletButton` 컴포넌트 구현
2. 지갑 연결 상태 관리 및 DB 연동

### Phase 3: 카드 결제 백엔드
1. Prisma 스키마 업데이트
2. Circle Public Key 조회 API 구현
3. 카드 결제 및 전송 서비스 (`CircleCardService`) 구현

### Phase 4: 충전 UI (TopUpModal)
1. `TopUpModal` 컴포넌트 구현
2. 카드 정보 입력 폼 및 암호화 로직 구현
3. 결제 요청 및 상태 표시

## 7. 보안 고려사항
- **카드 정보**: 절대 서버에 평문으로 전송하거나 저장하지 않음. 클라이언트에서 암호화하여 Circle로 직접 전송되는 효과.
- **지갑 소유권**: 서명(Signature)을 통해서만 지갑 등록 허용.
