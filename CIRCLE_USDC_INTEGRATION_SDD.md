# Circle USDC 통합 설계 문서 (SDD)
**Software Design Document for Circle USDC Payment & Transfer Integration**

---

## 📋 문서 정보

| 항목 | 내용 |
|------|------|
| 프로젝트명 | Deeps Mock - Circle USDC 결제 통합 |
| 작성일 | 2025-12-02 |
| 버전 | 1.0.0 |
| 상태 | 설계 단계 |
| 작성자 | Antigravity AI |

---

## 🎯 1. 프로젝트 개요

### 1.1 목적
기존 테트리스 게임 플랫폼에 Circle USDC 기반 결제 시스템을 통합하여, 다이아몬드 구매 시 실제 암호화폐(USDC)로 결제하고, 사용자 간 USDC 송금 기능을 제공합니다.

### 1.2 범위
- ✅ Circle Developer-Controlled Wallet 생성 및 관리
- ✅ USDC 결제를 통한 다이아몬드 구매
- ✅ 사용자 간 USDC 송금 (P2P Transfer)
- ✅ USDC 잔액 조회 및 거래 내역 추적
- ✅ Webhook을 통한 실시간 트랜잭션 상태 업데이트
- ⚠️ 본 SDD는 **Developer-Controlled Wallet** 방식을 채택합니다 (사용자가 키 관리 안함)

### 1.3 제외 범위
- ❌ User-Controlled Wallet (사용자 직접 키 관리)
- ❌ Smart Contract Account (SCA) 사용
- ❌ 환율 변동 헤지 기능
- ❌ KYC/AML 자동화 (향후 고려)

---

## 🏗️ 2. 시스템 아키텍처

### 2.1 전체 구조도

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Next.js)                        │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Diamond Purchase│  │ USDC Transfer   │  │ Balance View │ │
│  │ Modal (USDC)   │  │ Modal           │  │              │ │
│  └────────────────┘  └─────────────────┘  └──────────────┘ │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js API Routes (Backend)                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ /api/circle/wallet/create      - 지갑 생성             │ │
│  │ /api/circle/payment/diamond    - 다이아몬드 구매       │ │
│  │ /api/circle/transfer/send      - USDC 송금            │ │
│  │ /api/circle/balance            - 잔액 조회            │ │
│  │ /api/circle/transactions       - 거래 내역 조회        │ │
│  │ /api/circle/webhook            - Webhook 수신         │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  Circle Service Layer                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ src/lib/circle/                                        │ │
│  │   ├── CircleWalletService.ts   - 지갑 관리            │ │
│  │   ├── CirclePaymentService.ts  - 결제 처리            │ │
│  │   ├── CircleTransferService.ts - 송금 처리            │ │
│  │   ├── CircleWebhookService.ts  - Webhook 처리         │ │
│  │   └── circle-client.ts         - API 클라이언트       │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Circle API (External)                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ - Wallet Management API                                │ │
│  │ - Transaction API                                      │ │
│  │ - Balance API                                          │ │
│  │ - Webhook Notifications                                │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Database (MySQL via Prisma)                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ - CircleWallet        - 사용자 지갑 매핑              │ │
│  │ - CircleTransaction   - 트랜잭션 내역                │ │
│  │ - USDCBalance         - USDC 잔액 캐시               │ │
│  │ - PaymentHistory      - 결제 내역                    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 데이터 플로우

#### **2.2.1 다이아몬드 구매 플로우 (USDC 결제)**

```
User → Click "Buy Diamond" 
    → DiamondPurchaseModal (USDC 옵션 선택)
    → POST /api/circle/payment/diamond
        {
          gameUuid: 123,
          diamondAmount: 100,
          usdcAmount: 1.00,
          blockchain: "MATIC-AMOY"
        }
    → CirclePaymentService.createPayment()
        → Circle API: GET /v1/w3s/wallets/{fromWalletId}/balances
        → 잔액 확인
        → Circle API: POST /v1/w3s/developer/transactions/transfer
            {
              amounts: ["1.00"],
              destinationAddress: "0x...(Treasury Wallet)",
              tokenId: "USDC-AMOY"
            }
        → DB: CircleTransaction 생성 (status: PENDING)
        → DB: PaymentHistory 생성
    → Response: { transactionId, status: "PENDING" }
    → Client: 폴링 또는 Webhook 대기
    → Circle Webhook: POST /api/circle/webhook
        {
          transactionId: "...",
          status: "COMPLETE"
        }
    → DB: CircleTransaction 업데이트 (status: COMPLETE)
    → DB: UserCurrency.diamond += 100
    → UI: 구매 완료 알림
```

#### **2.2.2 USDC 송금 플로우**

```
User A → Click "Send USDC"
    → USDCTransferModal
        → Input: recipientGameUuid, amount
    → POST /api/circle/transfer/send
        {
          fromGameUuid: 123,
          toGameUuid: 456,
          usdcAmount: 5.00
        }
    → CircleTransferService.sendTransfer()
        → DB: CircleWallet 조회 (from, to)
        → Circle API: POST /v1/w3s/developer/transactions/transfer
            {
              sourceWalletId: "wallet-123",
              destinationAddress: "0x...(User B Wallet)",
              amounts: ["5.00"],
              tokenId: "USDC-AMOY"
            }
        → DB: CircleTransaction 생성 (type: P2P_TRANSFER)
    → Webhook: 트랜잭션 완료 시 양측 잔액 업데이트
```

---

## 📊 3. 데이터베이스 스키마 설계

### 3.1 새로운 Prisma 모델

```prisma
// Circle 지갑 모델
model CircleWallet {
  id              String   @id @default(uuid())
  userId          Int      @unique // User.uuid 참조
  walletSetId     String   // Circle Wallet Set ID
  walletId        String   @unique // Circle Wallet ID
  address         String   // 블록체인 주소 (0x...)
  blockchain      String   // MATIC-AMOY, MATIC-MAINNET 등
  accountType     String   @default("EOA") // EOA or SCA
  state           String   // LIVE, FROZEN 등
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user            User     @relation(fields: [userId], references: [uuid], onDelete: Cascade)
  transactions    CircleTransaction[]

  @@map("circle_wallets")
}

// Circle 트랜잭션 모델
model CircleTransaction {
  id                String   @id @default(uuid())
  userId            Int      // User.uuid 참조
  walletId          String   // CircleWallet.walletId
  circleTransactionId String @unique // Circle API 트랜잭션 ID
  type              CircleTransactionType
  status            CircleTransactionStatus
  amount            String   // USDC 금액 (문자열로 저장, 정확성)
  tokenId           String   // USDC-AMOY, USDC 등
  blockchain        String   // MATIC-AMOY 등
  fromAddress       String?  // 송신자 주소
  toAddress         String   // 수신자 주소
  txHash            String?  // 블록체인 트랜잭션 해시
  relatedGameUuid   Int?     // 관련 사용자 (송금 시)
  metadata          Json?    // 추가 메타데이터
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  wallet            CircleWallet @relation(fields: [walletId], references: [walletId], onDelete: Cascade)

  @@map("circle_transactions")
}

// USDC 잔액 캐시 (성능 최적화용)
model USDCBalance {
  id        String   @id @default(uuid())
  userId    Int      @unique // User.uuid 참조
  walletId  String   // CircleWallet.walletId
  balance   String   // USDC 잔액 (문자열)
  updatedAt DateTime @updatedAt

  @@map("usdc_balances")
}

// 결제 내역 (다이아몬드 구매)
model PaymentHistory {
  id                  String   @id @default(uuid())
  userId              Int      // User.uuid 참조
  circleTransactionId String?  // CircleTransaction.id
  diamondAmount       Int      // 구매한 다이아몬드 수량
  usdcAmount          String   // 지불한 USDC
  status              PaymentStatus
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@map("payment_history")
}

enum CircleTransactionType {
  DIAMOND_PURCHASE  // 다이아몬드 구매
  P2P_TRANSFER      // P2P 송금
  DEPOSIT           // 입금
  WITHDRAWAL        // 출금
}

enum CircleTransactionStatus {
  PENDING           // 대기 중
  QUEUED            // 큐에 추가됨
  SENT              // 전송됨
  COMPLETE          // 완료
  FAILED            // 실패
  CANCELLED         // 취소됨
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}
```

### 3.2 User 모델 확장

```prisma
model User {
  // ... 기존 필드들
  
  // Circle 관계 추가
  circleWallet     CircleWallet?
  
  @@map("users")
}
```

---

## 🔧 4. API 엔드포인트 설계

### 4.1 지갑 관리

#### **POST /api/circle/wallet/create**
사용자 최초 로그인 시 자동으로 Circle 지갑 생성

**Request:**
```typescript
{
  gameUuid: number;
  blockchain?: string; // default: "MATIC-AMOY"
}
```

**Response:**
```typescript
{
  success: true,
  payload: {
    walletId: string;
    address: string;
    blockchain: string;
    state: string;
  }
}
```

#### **GET /api/circle/wallet/info**
사용자 지갑 정보 조회

**Query Params:**
- `gameUuid`: number

**Response:**
```typescript
{
  success: true,
  payload: {
    walletId: string;
    address: string;
    blockchain: string;
    balance: {
      usdc: string;
    }
  }
}
```

---

### 4.2 결제 (다이아몬드 구매)

#### **POST /api/circle/payment/diamond**
USDC로 다이아몬드 구매

**Request:**
```typescript
{
  gameUuid: number;
  diamondAmount: number;    // 구매할 다이아몬드 수
  usdcAmount: string;       // 지불할 USDC (예: "1.00")
}
```

**Response:**
```typescript
{
  success: true,
  payload: {
    transactionId: string;
    status: "PENDING" | "COMPLETE";
    diamondAmount: number;
    usdcAmount: string;
  }
}
```

**비즈니스 로직:**
1. 사용자 지갑 잔액 확인 (`usdcAmount` >= 필요 금액)
2. Treasury Wallet로 USDC 전송
3. 트랜잭션 상태 추적
4. 완료 시 다이아몬드 지급

---

### 4.3 송금

#### **POST /api/circle/transfer/send**
사용자 간 USDC 송금

**Request:**
```typescript
{
  fromGameUuid: number;
  toGameUuid: number;
  usdcAmount: string;      // 예: "5.00"
  memo?: string;           // 메모 (선택)
}
```

**Response:**
```typescript
{
  success: true,
  payload: {
    transactionId: string;
    status: "PENDING";
    fromAddress: string;
    toAddress: string;
    amount: string;
  }
}
```

**검증:**
- 송신자 잔액 충분 여부
- 수신자 지갑 존재 여부
- 최소/최대 송금 금액 제한

---

### 4.4 잔액 및 거래 내역

#### **GET /api/circle/balance**
USDC 잔액 조회

**Query Params:**
- `gameUuid`: number

**Response:**
```typescript
{
  success: true,
  payload: {
    usdc: string;        // "10.50"
    updatedAt: string;
  }
}
```

#### **GET /api/circle/transactions**
거래 내역 조회

**Query Params:**
- `gameUuid`: number
- `limit`: number (default: 20)
- `type`: "all" | "diamond_purchase" | "p2p_transfer"

**Response:**
```typescript
{
  success: true,
  payload: [
    {
      id: string;
      type: "DIAMOND_PURCHASE" | "P2P_TRANSFER";
      amount: string;
      status: "COMPLETE";
      txHash: string;
      createdAt: string;
      metadata: {
        diamondAmount?: number;
        relatedUser?: string;
      }
    }
  ]
}
```

---

### 4.5 Webhook

#### **POST /api/circle/webhook**
Circle의 트랜잭션 상태 업데이트 수신

**Request (Circle → 서버):**
```typescript
{
  id: string;
  type: "transaction.confirmed" | "transaction.failed";
  data: {
    transaction: {
      id: string;
      state: "COMPLETE" | "FAILED";
      txHash: string;
    }
  }
}
```

**처리:**
1. Webhook 서명 검증 (Circle Secret 사용)
2. DB에서 해당 트랜잭션 조회
3. 상태 업데이트
4. 다이아몬드 구매일 경우 → UserCurrency 업데이트
5. 송금일 경우 → 양측 USDCBalance 업데이트

---

## 💻 5. 서비스 레이어 구현

### 5.1 Circle Client (`src/lib/circle/circle-client.ts`)

```typescript
import axios, { AxiosInstance } from 'axios';

export class CircleClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.CIRCLE_API_KEY!;
    this.client = axios.create({
      baseURL: 'https://api.circle.com/v1',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // Wallet Set 생성
  async createWalletSet(name: string) {
    const response = await this.client.post('/w3s/developer/walletSets', {
      name,
    });
    return response.data.data;
  }

  // Wallet 생성
  async createWallet(walletSetId: string, blockchains: string[]) {
    const response = await this.client.post('/w3s/developer/wallets', {
      walletSetId,
      blockchains,
      count: 1,
      accountType: 'EOA',
    });
    return response.data.data;
  }

  // 잔액 조회
  async getBalance(walletId: string) {
    const response = await this.client.get(
      `/w3s/wallets/${walletId}/balances`
    );
    return response.data.data;
  }

  // 트랜잭션 생성 (전송)
  async createTransfer(params: {
    walletId: string;
    destinationAddress: string;
    amounts: string[];
    tokenId: string;
  }) {
    const response = await this.client.post(
      '/w3s/developer/transactions/transfer',
      {
        walletId: params.walletId,
        destinationAddress: params.destinationAddress,
        amounts: params.amounts,
        tokenId: params.tokenId,
      }
    );
    return response.data.data;
  }

  // 트랜잭션 상태 조회
  async getTransaction(transactionId: string) {
    const response = await this.client.get(
      `/w3s/transactions/${transactionId}`
    );
    return response.data.data;
  }
}

export const circleClient = new CircleClient();
```

---

### 5.2 Wallet Service (`src/lib/circle/CircleWalletService.ts`)

```typescript
import { prisma } from '@/lib/prisma';
import { circleClient } from './circle-client';

export class CircleWalletService {
  /**
   * 사용자를 위한 Circle 지갑 생성
   */
  async createWalletForUser(userId: number, blockchain: string = 'MATIC-AMOY') {
    // 이미 지갑이 있는지 확인
    const existingWallet = await prisma.circleWallet.findUnique({
      where: { userId },
    });

    if (existingWallet) {
      return existingWallet;
    }

    // Wallet Set 생성 (사용자당 1개)
    const walletSet = await circleClient.createWalletSet(
      `user-${userId}-walletset`
    );

    // Wallet 생성
    const wallet = await circleClient.createWallet(
      walletSet.walletSetId,
      [blockchain]
    );

    // DB에 저장
    const newWallet = await prisma.circleWallet.create({
      data: {
        userId,
        walletSetId: walletSet.walletSetId,
        walletId: wallet.wallets[0].id,
        address: wallet.wallets[0].address,
        blockchain,
        accountType: 'EOA',
        state: wallet.wallets[0].state,
      },
    });

    return newWallet;
  }

  /**
   * 사용자 지갑 조회
   */
  async getWalletByUserId(userId: number) {
    return await prisma.circleWallet.findUnique({
      where: { userId },
    });
  }

  /**
   * 지갑 잔액 조회 (Circle API)
   */
  async getWalletBalance(walletId: string) {
    const balances = await circleClient.getBalance(walletId);
    const usdcBalance = balances.tokenBalances.find(
      (b: any) => b.token.symbol === 'USDC'
    );
    
    return {
      usdc: usdcBalance?.amount || '0',
    };
  }
}

export const circleWalletService = new CircleWalletService();
```

---

### 5.3 Payment Service (`src/lib/circle/CirclePaymentService.ts`)

```typescript
import { prisma } from '@/lib/prisma';
import { circleClient } from './circle-client';
import { circleWalletService } from './CircleWalletService';

export class CirclePaymentService {
  private readonly TREASURY_WALLET_ADDRESS = process.env.CIRCLE_TREASURY_ADDRESS!;

  /**
   * 다이아몬드 구매 (USDC 결제)
   */
  async purchaseDiamond(params: {
    gameUuid: number;
    diamondAmount: number;
    usdcAmount: string;
  }) {
    const { gameUuid, diamondAmount, usdcAmount } = params;

    // 1. 사용자 지갑 조회
    const wallet = await circleWalletService.getWalletByUserId(gameUuid);
    if (!wallet) {
      throw new Error('사용자 지갑이 없습니다. 먼저 지갑을 생성해주세요.');
    }

    // 2. 잔액 확인
    const balance = await circleWalletService.getWalletBalance(wallet.walletId);
    if (parseFloat(balance.usdc) < parseFloat(usdcAmount)) {
      throw new Error('USDC 잔액이 부족합니다.');
    }

    // 3. Circle API를 통해 트랜잭션 생성
    const transfer = await circleClient.createTransfer({
      walletId: wallet.walletId,
      destinationAddress: this.TREASURY_WALLET_ADDRESS,
      amounts: [usdcAmount],
      tokenId: `USDC-${wallet.blockchain.split('-')[1]}`, // USDC-AMOY
    });

    // 4. DB에 트랜잭션 및 결제 내역 저장
    const transaction = await prisma.circleTransaction.create({
      data: {
        userId: gameUuid,
        walletId: wallet.walletId,
        circleTransactionId: transfer.id,
        type: 'DIAMOND_PURCHASE',
        status: transfer.state as any,
        amount: usdcAmount,
        tokenId: `USDC-${wallet.blockchain.split('-')[1]}`,
        blockchain: wallet.blockchain,
        fromAddress: wallet.address,
        toAddress: this.TREASURY_WALLET_ADDRESS,
        metadata: {
          diamondAmount,
        },
      },
    });

    await prisma.paymentHistory.create({
      data: {
        userId: gameUuid,
        circleTransactionId: transaction.id,
        diamondAmount,
        usdcAmount,
        status: 'PENDING',
      },
    });

    return {
      transactionId: transfer.id,
      status: transfer.state,
      diamondAmount,
      usdcAmount,
    };
  }

  /**
   * 트랜잭션 완료 처리 (Webhook 호출 시)
   */
  async completePayment(circleTransactionId: string) {
    // 1. DB에서 트랜잭션 조회
    const transaction = await prisma.circleTransaction.findUnique({
      where: { circleTransactionId },
    });

    if (!transaction || transaction.type !== 'DIAMOND_PURCHASE') {
      return;
    }

    // 2. 상태 업데이트
    await prisma.circleTransaction.update({
      where: { id: transaction.id },
      data: { status: 'COMPLETE' },
    });

    // 3. 결제 내역 업데이트
    const payment = await prisma.paymentHistory.findFirst({
      where: { circleTransactionId: transaction.id },
    });

    if (payment) {
      await prisma.paymentHistory.update({
        where: { id: payment.id },
        data: { status: 'COMPLETED' },
      });

      // 4. 다이아몬드 지급
      await prisma.userCurrency.upsert({
        where: { userId: transaction.userId },
        update: {
          diamond: { increment: payment.diamondAmount },
        },
        create: {
          userId: transaction.userId,
          gold: 0,
          diamond: payment.diamondAmount,
        },
      });

      console.log(`✅ 다이아몬드 지급 완료: User ${transaction.userId}, ${payment.diamondAmount}개`);
    }
  }
}

export const circlePaymentService = new CirclePaymentService();
```

---

### 5.4 Transfer Service (`src/lib/circle/CircleTransferService.ts`)

```typescript
import { prisma } from '@/lib/prisma';
import { circleClient } from './circle-client';
import { circleWalletService } from './CircleWalletService';

export class CircleTransferService {
  /**
   * P2P USDC 송금
   */
  async sendTransfer(params: {
    fromGameUuid: number;
    toGameUuid: number;
    usdcAmount: string;
    memo?: string;
  }) {
    const { fromGameUuid, toGameUuid, usdcAmount, memo } = params;

    // 1. 송신자 지갑 조회
    const fromWallet = await circleWalletService.getWalletByUserId(fromGameUuid);
    if (!fromWallet) {
      throw new Error('송신자 지갑이 없습니다.');
    }

    // 2. 수신자 지갑 조회
    const toWallet = await circleWalletService.getWalletByUserId(toGameUuid);
    if (!toWallet) {
      throw new Error('수신자 지갑이 없습니다.');
    }

    // 3. 잔액 확인
    const balance = await circleWalletService.getWalletBalance(fromWallet.walletId);
    if (parseFloat(balance.usdc) < parseFloat(usdcAmount)) {
      throw new Error('USDC 잔액이 부족합니다.');
    }

    // 4. Circle API를 통해 전송
    const transfer = await circleClient.createTransfer({
      walletId: fromWallet.walletId,
      destinationAddress: toWallet.address,
      amounts: [usdcAmount],
      tokenId: `USDC-${fromWallet.blockchain.split('-')[1]}`,
    });

    // 5. DB에 트랜잭션 저장
    await prisma.circleTransaction.create({
      data: {
        userId: fromGameUuid,
        walletId: fromWallet.walletId,
        circleTransactionId: transfer.id,
        type: 'P2P_TRANSFER',
        status: transfer.state as any,
        amount: usdcAmount,
        tokenId: `USDC-${fromWallet.blockchain.split('-')[1]}`,
        blockchain: fromWallet.blockchain,
        fromAddress: fromWallet.address,
        toAddress: toWallet.address,
        relatedGameUuid: toGameUuid,
        metadata: { memo },
      },
    });

    return {
      transactionId: transfer.id,
      status: transfer.state,
      fromAddress: fromWallet.address,
      toAddress: toWallet.address,
      amount: usdcAmount,
    };
  }
}

export const circleTransferService = new CircleTransferService();
```

---

### 5.5 Webhook Service (`src/lib/circle/CircleWebhookService.ts`)

```typescript
import crypto from 'crypto';
import { circlePaymentService } from './CirclePaymentService';
import { prisma } from '@/lib/prisma';

export class CircleWebhookService {
  private readonly WEBHOOK_SECRET = process.env.CIRCLE_WEBHOOK_SECRET!;

  /**
   * Webhook 서명 검증
   */
  verifySignature(payload: string, signature: string): boolean {
    const hmac = crypto.createHmac('sha256', this.WEBHOOK_SECRET);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Webhook 이벤트 처리
   */
  async handleWebhook(event: any) {
    const { type, data } = event;

    switch (type) {
      case 'transaction.confirmed':
        await this.handleTransactionConfirmed(data.transaction);
        break;
      case 'transaction.failed':
        await this.handleTransactionFailed(data.transaction);
        break;
      default:
        console.log(`⚠️ 처리되지 않은 Webhook 이벤트: ${type}`);
    }
  }

  /**
   * 트랜잭션 완료 처리
   */
  private async handleTransactionConfirmed(transaction: any) {
    const { id, txHash } = transaction;

    // DB 업데이트
    const dbTransaction = await prisma.circleTransaction.findUnique({
      where: { circleTransactionId: id },
    });

    if (!dbTransaction) {
      console.warn(`⚠️ 트랜잭션을 찾을 수 없음: ${id}`);
      return;
    }

    await prisma.circleTransaction.update({
      where: { id: dbTransaction.id },
      data: {
        status: 'COMPLETE',
        txHash,
      },
    });

    // 다이아몬드 구매인 경우 처리
    if (dbTransaction.type === 'DIAMOND_PURCHASE') {
      await circlePaymentService.completePayment(id);
    }

    // P2P 송금인 경우 잔액 캐시 업데이트
    if (dbTransaction.type === 'P2P_TRANSFER') {
      // TODO: 양측 사용자 잔액 캐시 갱신
    }

    console.log(`✅ 트랜잭션 완료: ${id}`);
  }

  /**
   * 트랜잭션 실패 처리
   */
  private async handleTransactionFailed(transaction: any) {
    const { id } = transaction;

    await prisma.circleTransaction.update({
      where: { circleTransactionId: id },
      data: { status: 'FAILED' },
    });

    // 결제 내역도 실패로 업데이트
    const payment = await prisma.paymentHistory.findFirst({
      where: { 
        circleTransactionId: {
          contains: id
        }
      },
    });

    if (payment) {
      await prisma.paymentHistory.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
    }

    console.error(`❌ 트랜잭션 실패: ${id}`);
  }
}

export const circleWebhookService = new CircleWebhookService();
```

---

## 🎨 6. UI/UX 설계

### 6.1 수정된 DiamondPurchaseModal

**변경 사항:**
- 기존: "실제 결제는 되지 않으며, 다이아몬드만 획득됩니다"
- 신규: **USDC 결제 옵션 추가**

```tsx
{
  amount: 100,
  price: 1000,
  usdcPrice: "1.00 USDC" // 추가
}
```

**UI 예시:**
```
┌─────────────────────────────────────┐
│  💎 다이아몬드 구매                  │
├─────────────────────────────────────┤
│  💎 100 Diamond                     │
│  💰 1,000원 또는 1.00 USDC          │
│                         [구매 (USDC)]│
├─────────────────────────────────────┤
│  💎 500 Diamond                     │
│  💰 4,500원 또는 4.50 USDC          │
│                         [구매 (USDC)]│
└─────────────────────────────────────┘
```

---

### 6.2 신규: USDCTransferModal

**컴포넌트:** `src/components/USDCTransferModal.tsx`

```tsx
interface USDCTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameUuid: number;
  currentBalance: string;
}

// UI 구조:
// - 수신자 gameUuid 입력
// - USDC 금액 입력 (현재 잔액 표시)
// - 메모 입력 (선택)
// - [전송] 버튼
```

---

### 6.3 신규: USDCBalanceCard

**컴포넌트:** `src/components/USDCBalanceCard.tsx`

```tsx
// 게임 메인 화면에 표시
┌──────────────────────┐
│  💰 USDC 잔액         │
│  10.50 USDC          │
│  [충전] [송금] [내역] │
└──────────────────────┘
```

---

## 🔒 7. 보안 고려사항

### 7.1 API 키 관리
- ✅ `.env`에 `CIRCLE_API_KEY` 저장
- ✅ `.env`에 `CIRCLE_WEBHOOK_SECRET` 저장
- ✅ Treasury Wallet 주소도 환경 변수로 관리
- ⚠️ 절대 클라이언트에 노출 금지

### 7.2 Webhook 보안
- ✅ HMAC SHA-256 서명 검증 필수
- ✅ HTTPS only
- ✅ IP 화이트리스트 (Circle IP만 허용)

### 7.3 Rate Limiting
- ✅ 결제 API: 사용자당 분당 5회 제한
- ✅ 송금 API: 사용자당 분당 10회 제한
- ✅ 잔액 조회: 사용자당 분당 30회 제한

### 7.4 트랜잭션 검증
- ✅ 이중 지출 방지: DB 트랜잭션 사용
- ✅ 최소 송금 금액: 0.01 USDC
- ✅ 최대 송금 금액: 1000 USDC (일일)

---

## 📈 8. 성능 최적화

### 8.1 캐싱 전략
```typescript
// USDCBalance 테이블을 통한 잔액 캐싱
// - Circle API 호출 최소화
// - Webhook 수신 시 즉시 업데이트
// - TTL: 5분 (필요 시 재조회)
```

### 8.2 비동기 처리
```typescript
// 결제 플로우
// 1. 트랜잭션 생성 → 즉시 응답 (PENDING)
// 2. Webhook으로 완료 알림 수신
// 3. 클라이언트는 폴링 또는 WebSocket으로 상태 확인
```

---

## 🧪 9. 테스트 전략

### 9.1 Testnet 환경
- **Polygon Amoy Testnet** 사용
- Faucet: https://faucet.circle.com
- 무료 테스트 USDC 획득 가능

### 9.2 테스트 시나리오

#### **시나리오 1: 다이아몬드 구매 (성공)**
1. 사용자 A가 1.00 USDC로 100 다이아몬드 구매
2. Circle API 호출 성공
3. Webhook 수신 (COMPLETE)
4. 다이아몬드 100개 지급 확인

#### **시나리오 2: 다이아몬드 구매 (실패 - 잔액 부족)**
1. 사용자 B가 10.00 USDC로 구매 시도 (잔액: 5.00 USDC)
2. 에러 메시지: "USDC 잔액이 부족합니다."
3. 트랜잭션 생성 안됨

#### **시나리오 3: P2P 송금**
1. 사용자 A → 사용자 B로 2.00 USDC 전송
2. Circle API 호출 성공
3. Webhook 수신
4. 양측 잔액 업데이트 확인

#### **시나리오 4: Webhook 재시도**
1. Webhook 수신 실패 (서버 다운)
2. Circle이 자동 재시도 (exponential backoff)
3. 복구 후 정상 처리 확인

---

## 📅 10. 구현 로드맵

### **Phase 1: 기반 구축 (1-2주)**
- [ ] Prisma 스키마 업데이트 및 마이그레이션
- [ ] Circle API 클라이언트 구현
- [ ] 환경 변수 설정 (API 키, Webhook Secret)
- [ ] 지갑 생성 API 구현
- [ ] 테스트넷 환경 구성

### **Phase 2: 결제 기능 (2-3주)**
- [ ] CirclePaymentService 구현
- [ ] `/api/circle/payment/diamond` 엔드포인트 구현
- [ ] DiamondPurchaseModal USDC 옵션 추가
- [ ] Webhook 수신 및 검증 구현
- [ ] 다이아몬드 자동 지급 로직

### **Phase 3: 송금 기능 (1-2주)**
- [ ] CircleTransferService 구현
- [ ] `/api/circle/transfer/send` 엔드포인트 구현
- [ ] USDCTransferModal 컴포넌트 개발
- [ ] 거래 내역 조회 API 구현
- [ ] USDCBalanceCard 컴포넌트 개발

### **Phase 4: 테스트 및 최적화 (1주)**
- [ ] 통합 테스트 작성
- [ ] 성능 테스트 (부하 테스트)
- [ ] 에러 핸들링 강화
- [ ] UI/UX 피드백 반영
- [ ] 보안 감사

### **Phase 5: 프로덕션 배포 (1주)**
- [ ] Mainnet 환경 설정 (Polygon Mainnet)
- [ ] Treasury Wallet 준비 및 USDC 예치
- [ ] 모니터링 및 알림 설정
- [ ] 문서화 완료
- [ ] 프로덕션 배포

**총 예상 기간: 6-9주**

---

## 💰 11. 비용 추정

### 11.1 Circle API 비용
- **Developer Plan**: 
  - 월 $500 (기본)
  - 트랜잭션당 추가 비용 없음
  - Testnet 무료

### 11.2 가스비 (Polygon)
- **Amoy Testnet**: 무료 (Faucet)
- **Mainnet**: ~$0.01-0.05 per transaction
- Circle이 가스비 대납 (Developer-Controlled Wallet)

### 11.3 인프라 비용
- **추가 DB 스토리지**: ~$10/월
- **Webhook 처리**: 기존 서버 사용 (추가 비용 없음)

**월 예상 비용: $500-600**

---

## 🚨 12. 리스크 관리

| 리스크 | 영향도 | 확률 | 대응 방안 |
|--------|--------|------|-----------|
| Circle API 장애 | 높음 | 낮음 | Fallback 메커니즘, 재시도 로직 |
| Webhook 유실 | 중간 | 중간 | 폴링 백업, 수동 동기화 스크립트 |
| 가스비 급등 | 낮음 | 낮음 | Circle이 가스비 관리 (Dev Wallet) |
| 사용자 지갑 생성 실패 | 중간 | 낮음 | 자동 재시도, 에러 로깅 |
| USDC 환율 변동 | 중간 | 높음 | 실시간 환율 API 연동 고려 |

---

## 📚 13. 참고 자료

- [Circle Developer Docs](https://developers.circle.com/)
- [Circle Wallets API Reference](https://developers.circle.com/api-reference/wallets)
- [Polygon Amoy Testnet Faucet](https://faucet.circle.com)
- [Circle Webhook Guide](https://developers.circle.com/wallets/webhooks)
- [USDC on Polygon](https://www.circle.com/usdc-multichain/polygon)

---

## ✅ 14. 승인 및 다음 단계

### 승인 필요 사항
- [ ] 기술 스택 승인 (Circle Developer-Controlled Wallet)
- [ ] 데이터베이스 스키마 승인
- [ ] API 설계 승인
- [ ] 예산 승인 (월 $500-600)
- [ ] 구현 일정 승인

### 다음 단계
1. **환경 설정**: Circle Console에서 API 키 발급
2. **Testnet 테스트**: Amoy Testnet에서 지갑 생성 및 트랜잭션 테스트
3. **Phase 1 개발 시작**: Prisma 마이그레이션 및 기본 API 구현

---

## 📞 연락처

**문의 사항이나 추가 논의가 필요한 경우:**
- 이 SDD에 대한 피드백 제공
- 특정 기능에 대한 상세 설계 요청
- 보안 리뷰 또는 코드 리뷰 요청

---

**문서 버전**: 1.0.0  
**최종 업데이트**: 2025-12-02  
**상태**: ✅ 리뷰 대기 중
