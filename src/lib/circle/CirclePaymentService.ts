import { prisma } from '@/lib/prisma';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { circleWalletService } from './CircleWalletService';

/**
 * Circle SDK 클라이언트 래퍼
 */
const getCircleClient = () => {
    const apiKey = process.env.CIRCLE_API_KEY || '';
    const entitySecret = process.env.CIRCLE_ENTITY_SECRET || '';

    if (!apiKey || !entitySecret) {
        throw new Error('Circle API 키 또는 Entity Secret이 설정되지 않았습니다.');
    }

    return initiateDeveloperControlledWalletsClient({
        apiKey,
        entitySecret,
    });
};

/**
 * Circle USDC 결제 서비스 (SDK 기반)
 */
export class CirclePaymentService {
    private readonly TREASURY_WALLET_ADDRESS: string;

    constructor() {
        this.TREASURY_WALLET_ADDRESS = process.env.CIRCLE_TREASURY_ADDRESS || '';

        if (!this.TREASURY_WALLET_ADDRESS || this.TREASURY_WALLET_ADDRESS === '0x0000000000000000000000000000000000000000') {
            console.warn('⚠️ CIRCLE_TREASURY_ADDRESS가 설정되지 않았거나 기본값입니다.');
        }
    }

    /**
     * 다이아몬드 구매 (USDC 결제)
     */
    async purchaseDiamond(params: {
        gameUuid: number;
        diamondAmount: number;
        usdcAmount: string;
    }) {
        const { gameUuid, diamondAmount, usdcAmount } = params;

        try {
            console.log(`💎 다이아몬드 구매 시작: User ${gameUuid}, ${diamondAmount}개, ${usdcAmount} USDC`);

            // 1. 사용자 지갑 조회 (없으면 생성)
            const wallet = await circleWalletService.ensureWalletExists(gameUuid);
            console.log(`✅ 사용자 지갑:`, wallet.walletId);

            // 2. 잔액 확인
            const balance = await circleWalletService.getWalletBalance(wallet.walletId);
            const balanceNum = parseFloat(balance.usdc);
            const amountNum = parseFloat(usdcAmount);

            console.log(`💰 현재 잔액: ${balance.usdc} USDC, 필요 금액: ${usdcAmount} USDC`);

            if (balanceNum < amountNum) {
                throw new Error(`USDC 잔액이 부족합니다. (현재: ${balance.usdc} USDC, 필요: ${usdcAmount} USDC)`);
            }

            // 3. Treasury 주소 검증
            if (!this.TREASURY_WALLET_ADDRESS || this.TREASURY_WALLET_ADDRESS === '0x0000000000000000000000000000000000000000') {
                throw new Error('Treasury 지갑 주소가 설정되지 않았습니다. 관리자에게 문의하세요.');
            }

            // 4. Circle SDK를 통해 트랜잭션 생성
            const tokenId = `USDC-${wallet.blockchain.split('-')[1]}`; // USDC-AMOY
            console.log(`🔵 트랜잭션 생성 중... (Token: ${tokenId})`);

            const client = getCircleClient();
            const response = await client.createTransaction({
                walletId: wallet.walletId,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                blockchain: wallet.blockchain as any, // 타입 호환성 문제 우회
                tokenId,
                destinationAddress: this.TREASURY_WALLET_ADDRESS,
                amount: [usdcAmount],
                fee: {
                    type: 'level',
                    config: {
                        feeLevel: 'MEDIUM',
                    },
                },
            });

            const transfer = response.data;
            if (!transfer) {
                throw new Error('트랜잭션 생성 실패');
            }

            console.log(`✅ Circle 트랜잭션 생성 완료:`, transfer.id);

            // 5. DB에 트랜잭션 저장
            const transaction = await prisma.circleTransaction.create({
                data: {
                    userId: gameUuid,
                    walletId: wallet.walletId,
                    circleTransactionId: transfer.id || '',
                    type: 'DIAMOND_PURCHASE',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    status: (transfer.state as any) || 'PENDING',
                    amount: usdcAmount,
                    tokenId,
                    blockchain: wallet.blockchain,
                    fromAddress: wallet.address,
                    toAddress: this.TREASURY_WALLET_ADDRESS,
                    metadata: {
                        diamondAmount,
                    },
                },
            });

            console.log(`✅ DB에 트랜잭션 저장:`, transaction.id);

            // 6. 결제 내역 저장
            const payment = await prisma.paymentHistory.create({
                data: {
                    userId: gameUuid,
                    paymentMethod: 'USDC',
                    circleTransactionId: transaction.id,
                    diamondAmount,
                    usdcAmount,
                    txHash: null, // 초기에는 null, webhook에서 업데이트
                    status: 'PENDING',
                },
            });

            console.log(`✅ 결제 내역 저장:`, payment.id);

            return {
                transactionId: transfer.id || '',
                status: transfer.state || 'PENDING',
                diamondAmount,
                usdcAmount,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                txHash: (transfer as any).txHash,
            };
        } catch (error) {
            console.error(`❌ 다이아몬드 구매 실패:`, error);
            throw error;
        }
    }
    /**
     * 카드 결제 및 USDC 충전 처리
     */
    async processCardPayment(params: {
        userId: number;
        amount: string; // USD 금액
        encryptedData: string; // 암호화된 카드 정보
        keyId: string; // 암호화 키 ID
        toAddress: string; // 충전할 지갑 주소
        ipAddress: string;
        sessionId: string;
    }) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { userId, amount, encryptedData, keyId, toAddress, ipAddress, sessionId } = params;

        try {
            console.log(`💳 카드 결제 시작: User ${userId}, $${amount} -> ${toAddress}`);

            // 1. Circle Payments API 호출을 위한 axios 인스턴스 생성
            const axios = (await import('axios')).default;
            const paymentsClient = axios.create({
                baseURL: process.env.CIRCLE_TESTNET === 'true'
                    ? 'https://api-sandbox.circle.com/v1'
                    : 'https://api.circle.com/v1',
                headers: {
                    'Authorization': `Bearer ${process.env.CIRCLE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            });

            // 2. 결제 생성 (Create Payment)
            const idempotencyKey = crypto.randomUUID();
            const paymentResponse = await paymentsClient.post('/payments', {
                idempotencyKey,
                amount: {
                    amount: amount,
                    currency: 'USD'
                },
                source: {
                    id: 'card-id-placeholder', // 실제로는 createCard를 먼저 호출해서 cardId를 받아야 함
                    type: 'card'
                },
                description: `USDC Top-up for User ${userId}`,
                channel: 'card_not_present',
                metadata: {
                    userId: userId.toString(),
                    sessionId,
                    ipAddress
                }
            });

            // NOTE: 실제 구현에서는 createCard -> createPayment 순서로 진행해야 합니다.
            // 여기서는 흐름만 구현하고, 실제 API 연동 시에는 createCard 로직이 필요합니다.
            // 하지만 Circle Sandbox에서는 테스트 카드를 사용하므로, 
            // 프론트엔드에서 암호화된 데이터를 받아 createCard를 호출하는 부분이 선행되어야 합니다.

            // 3. DB에 결제 내역 저장
            const paymentData = paymentResponse.data.data;

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore: Prisma 클라이언트가 아직 업데이트되지 않았을 수 있음
            await prisma.cardPayment.create({
                data: {
                    userId,
                    circlePaymentId: paymentData.id,
                    amount: amount,
                    usdcAmount: amount, // 1:1 비율 가정 (수수료 제외)
                    status: paymentData.status,
                    toAddress,
                }
            });

            console.log(`✅ 카드 결제 요청 완료: ${paymentData.id}`);

            // 4. (결제 성공 시) USDC 전송은 Webhook에서 처리하거나, 
            // 여기서 즉시 처리할 수도 있지만(Sandbox), 비동기로 처리하는 것이 안전합니다.

            return {
                paymentId: paymentData.id,
                status: paymentData.status,
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('❌ 카드 결제 실패:', error.response?.data || error.message);
            throw new Error(`카드 결제 실패: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * 결제 내역 조회 (USDC 구매 + Diamond 환전 통합)
     */
    async getPaymentHistory(userId: number, limit: number = 20) {
        // 1. PaymentHistory (USDC -> Diamond purchases)
        const purchases = await prisma.paymentHistory.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        // 2. CurrencyTransaction (Diamond -> USDC exchanges)
        const exchanges = await prisma.currencyTransaction.findMany({
            where: {
                userId,
                reason: 'EXCHANGE_TO_USDC'
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        // 3. Merge and format
        const formattedPurchases = purchases.map(p => ({
            id: p.id,
            type: 'PURCHASE' as const,
            paymentMethod: p.paymentMethod,
            diamondAmount: p.diamondAmount,
            usdcAmount: p.usdcAmount,
            fiatAmount: p.fiatAmount,
            currency: p.currency,
            txHash: p.txHash,
            status: p.status,
            createdAt: p.createdAt.toISOString(),
        }));

        // Format exchanges and fetch txHash if needed
        const formattedExchanges = await Promise.all(exchanges.map(async (e) => {
            // Use 'as any' to access new schema fields
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const exchange = e as any;
            let txHash = exchange.txHash;
            const circleTransactionId = exchange.circleTransactionId;

            // If no txHash but has circleTransactionId, try to fetch from Circle API
            if (!txHash && circleTransactionId) {
                try {
                    const client = getCircleClient();
                    const response = await client.getTransaction({ id: circleTransactionId });
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const txData = response.data as any;

                    // Circle API returns { transaction: { txHash, ... } }
                    if (txData?.transaction?.txHash) {
                        txHash = txData.transaction.txHash;
                        console.log(`✅ Fetched txHash for ${circleTransactionId}: ${txHash}`);
                        // Update database with the fetched txHash
                        await prisma.currencyTransaction.update({
                            where: { id: e.id },
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            data: { txHash } as any,
                        });
                    }
                } catch (err) {
                    console.warn(`Failed to fetch txHash for circleTransactionId: ${circleTransactionId}`, err);
                }
            }

            return {
                id: e.id,
                type: 'EXCHANGE' as const,
                paymentMethod: 'DIAMOND' as const,
                diamondAmount: Math.abs(e.amount),
                usdcAmount: (Math.abs(e.amount) * 0.0001).toFixed(4),
                fiatAmount: null,
                currency: null,
                txHash,
                circleTransactionId,
                status: 'COMPLETED',
                createdAt: e.createdAt.toISOString(),
            };
        }));

        // 4. Combined and sorted by date
        const combined = [...formattedPurchases, ...formattedExchanges];
        combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return combined.slice(0, limit);
    }

    /**
     * 결제 완료 처리 (Webhook)
     */
    async completePayment(circleTransactionId: string, txHash?: string) {
        let finalTxHash = txHash;

        // txHash가 없으면 Circle API로 조회 시도
        if (!finalTxHash) {
            try {
                console.log(`🔍 txHash 누락됨. Circle API로 트랜잭션 조회 시도: ${circleTransactionId}`);
                const client = getCircleClient();
                const response = await client.getTransaction({ id: circleTransactionId });

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const txData = response.data as any;

                if (txData && txData.txHash) {
                    finalTxHash = txData.txHash;
                    console.log(`✅ Circle API 조회로 txHash 확보: ${finalTxHash}`);
                } else {
                    console.log(`⚠️ Circle API 조회 결과에도 txHash가 없습니다.`);
                }
            } catch (error) {
                console.warn(`⚠️ 트랜잭션 조회 실패 (txHash 확보 불가):`, error);
            }
        }

        // 1. CircleTransaction 업데이트 (txHash 포함)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: { status: any; txHash?: string } = { status: 'COMPLETE' };
        if (finalTxHash) {
            updateData.txHash = finalTxHash;
        }

        const transaction = await prisma.circleTransaction.update({
            where: { circleTransactionId },
            data: updateData,
        });

        // 2. PaymentHistory 업데이트 (txHash 포함)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const paymentUpdateData: { status: any; txHash?: string } = { status: 'COMPLETED' };
        if (finalTxHash) {
            paymentUpdateData.txHash = finalTxHash;
        }

        await prisma.paymentHistory.updateMany({
            where: { circleTransactionId: transaction.id },
            data: paymentUpdateData,
        });
    }

    /**
     * 결제 실패 처리 (Webhook)
     */
    async failPayment(circleTransactionId: string) {
        // 1. CircleTransaction 업데이트
        const transaction = await prisma.circleTransaction.update({
            where: { circleTransactionId },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: { status: 'FAILED' as any },
        });

        // 2. PaymentHistory 업데이트
        await prisma.paymentHistory.updateMany({
            where: { circleTransactionId: transaction.id },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: { status: 'FAILED' as any },
        });
    }
}

// 싱글톤 인스턴스
export const circlePaymentService = new CirclePaymentService();
