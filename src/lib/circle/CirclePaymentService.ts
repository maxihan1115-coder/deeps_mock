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
            const transferResponse = await client.createTransaction({
                walletId: wallet.walletId,
                blockchain: wallet.blockchain,
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

            const transfer = transferResponse.data;
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
                    circleTransactionId: transaction.id,
                    diamondAmount,
                    usdcAmount,
                    status: 'PENDING',
                },
            });

            console.log(`✅ 결제 내역 저장:`, payment.id);

            return {
                transactionId: transfer.id || '',
                status: transfer.state || 'PENDING',
                diamondAmount,
                usdcAmount,
                txHash: (transfer as any).txHash,
            };
        } catch (error) {
            console.error(`❌ 다이아몬드 구매 실패:`, error);
            throw error;
        }
    }

    /**
     * 트랜잭션 완료 처리 (Webhook 호출 시)
     */
    async completePayment(circleTransactionId: string, txHash?: string) {
        try {
            console.log(`🎉 결제 완료 처리 시작: ${circleTransactionId}`);

            const transaction = await prisma.circleTransaction.findUnique({
                where: { circleTransactionId },
            });

            if (!transaction) {
                console.warn(`⚠️ 트랜잭션을 찾을 수 없음: ${circleTransactionId}`);
                return;
            }

            if (transaction.type !== 'DIAMOND_PURCHASE') {
                console.warn(`⚠️ 다이아몬드 구매 트랜잭션이 아님: ${transaction.type}`);
                return;
            }

            if (transaction.status === 'COMPLETE') {
                console.log(`⚠️ 이미 완료된 트랜잭션: ${circleTransactionId}`);
                return;
            }

            // 트랜잭션 상태 업데이트
            await prisma.circleTransaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'COMPLETE',
                    txHash: txHash || transaction.txHash,
                },
            });

            console.log(`✅ 트랜잭션 상태 업데이트: COMPLETE`);

            // 결제 내역 조회 및 업데이트
            const payment = await prisma.paymentHistory.findFirst({
                where: { circleTransactionId: transaction.id },
            });

            if (!payment) {
                console.error(`❌ 결제 내역을 찾을 수 없음`);
                return;
            }

            await prisma.paymentHistory.update({
                where: { id: payment.id },
                data: { status: 'COMPLETED' },
            });

            console.log(`✅ 결제 내역 상태 업데이트: COMPLETED`);

            // 다이아몬드 지급
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

            console.log(`💎 다이아몬드 지급 완료: User ${transaction.userId}, ${payment.diamondAmount}개`);

            // 퀘스트 진행도 업데이트
            try {
                const { mysqlGameStore } = await import('@/lib/mysql-store');
                const platformLink = await prisma.platformLink.findUnique({
                    where: { gameUuid: transaction.userId }
                });
                const isLinked = !!platformLink;

                await mysqlGameStore.updateDiamondPurchaseQuestProgress(
                    transaction.userId,
                    payment.diamondAmount,
                    isLinked
                );
                console.log(`✅ 다이아몬드 구매 퀘스트 진행도 업데이트 완료`);
            } catch (error) {
                console.error(`⚠️ 퀘스트 진행도 업데이트 실패 (비치명적):`, error);
            }

            return {
                userId: transaction.userId,
                diamondAmount: payment.diamondAmount,
                usdcAmount: payment.usdcAmount,
            };
        } catch (error) {
            console.error(`❌ 결제 완료 처리 실패:`, error);
            throw error;
        }
    }

    /**
     * 트랜잭션 실패 처리
     */
    async failPayment(circleTransactionId: string) {
        try {
            console.log(`❌ 결제 실패 처리: ${circleTransactionId}`);

            await prisma.circleTransaction.update({
                where: { circleTransactionId },
                data: { status: 'FAILED' },
            });

            const transaction = await prisma.circleTransaction.findUnique({
                where: { circleTransactionId },
            });

            if (transaction) {
                await prisma.paymentHistory.updateMany({
                    where: { circleTransactionId: transaction.id },
                    data: { status: 'FAILED' },
                });
            }

            console.log(`✅ 결제 실패 처리 완료`);
        } catch (error) {
            console.error(`❌ 결제 실패 처리 중 오류:`, error);
            throw error;
        }
    }

    /**
     * 결제 내역 조회
     */
    async getPaymentHistory(userId: number, limit: number = 20) {
        return await prisma.paymentHistory.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    /**
     * 트랜잭션 상태 조회 (Circle SDK)
     */
    async getTransactionStatus(circleTransactionId: string) {
        try {
            const client = getCircleClient();
            const response = await client.getTransaction({
                id: circleTransactionId,
            });

            const transaction = response.data;
            return {
                id: transaction?.id,
                state: transaction?.state,
                txHash: (transaction as any)?.txHash,
            };
        } catch (error) {
            console.error(`❌ 트랜잭션 상태 조회 실패:`, error);
            throw error;
        }
    }
}

// 싱글톤 인스턴스
export const circlePaymentService = new CirclePaymentService();
