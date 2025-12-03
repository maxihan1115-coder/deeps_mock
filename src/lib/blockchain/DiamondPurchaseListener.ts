import { createPublicClient, http, parseAbiItem } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { prisma } from '@/lib/prisma';
import { DIAMOND_PURCHASE_ADDRESS } from './abis';

// 이벤트 ABI
const EVENT_ABI = parseAbiItem(
    'event DiamondPurchased(address indexed user, uint256 indexed gameUuid, uint256 diamondAmount, uint256 usdcAmount, uint256 timestamp)'
);

export class DiamondPurchaseListener {
    private client;
    private isListening = false;

    constructor() {
        this.client = createPublicClient({
            chain: polygonAmoy,
            transport: http(),
        });
    }

    /**
     * 이벤트 리스닝 시작 (Polling 방식)
     */
    public startListening() {
        if (this.isListening) {
            console.log('⚠️ DiamondPurchaseListener is already listening.');
            return;
        }

        console.log('🚀 Starting DiamondPurchaseListener (Polling Mode)...');
        this.isListening = true;

        this.pollEvents();
    }

    private async pollEvents() {
        // 최근 1000 블록부터 다시 스캔 (놓친 이벤트 감지용)
        let lastBlockNumber = await this.client.getBlockNumber() - BigInt(1000);
        console.log(`Starting poll from block: ${lastBlockNumber}`);

        setInterval(async () => {
            try {
                const currentBlockNumber = await this.client.getBlockNumber();

                if (currentBlockNumber > lastBlockNumber) {
                    const logs = await this.client.getLogs({
                        address: DIAMOND_PURCHASE_ADDRESS as `0x${string}`,
                        event: EVENT_ABI,
                        fromBlock: lastBlockNumber + BigInt(1),
                        toBlock: currentBlockNumber
                    });

                    for (const log of logs) {
                        await this.processLog(log);
                    }

                    lastBlockNumber = currentBlockNumber;
                }
            } catch (error) {
                console.error('❌ Polling Error:', error);
            }
        }, 5000); // 5초마다 폴링
    }

    /**
     * 로그 처리 및 다이아몬드 지급
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async processLog(log: any) {
        try {
            const { args, transactionHash } = log;
            const { user, gameUuid, diamondAmount, usdcAmount } = args;

            console.log(`💎 New Diamond Purchase Event Detected! Tx: ${transactionHash}`);
            console.log(`   User: ${user}, GameUUID: ${gameUuid}, Amount: ${diamondAmount}`);

            // 이미 처리된 트랜잭션인지 확인
            const existingTx = await prisma.paymentHistory.findFirst({
                where: {
                    circleTransactionId: transactionHash // txHash를 여기에 저장
                }
            });

            if (existingTx) {
                console.log('⚠️ Transaction already processed:', transactionHash);
                return;
            }

            // DB 트랜잭션으로 처리
            await prisma.$transaction(async (tx) => {
                // 1. 결제 내역 저장
                await tx.paymentHistory.create({
                    data: {
                        userId: Number(gameUuid),
                        circleTransactionId: transactionHash,
                        txHash: transactionHash,
                        diamondAmount: Number(diamondAmount),
                        usdcAmount: (Number(usdcAmount) / 1000000).toString(), // 6 decimals
                        status: 'COMPLETED',
                    }
                });

                // 2. 사용자 재화 업데이트 (다이아몬드 지급)
                const userCurrency = await tx.userCurrency.findUnique({
                    where: { userId: Number(gameUuid) }
                });

                if (userCurrency) {
                    await tx.userCurrency.update({
                        where: { userId: Number(gameUuid) },
                        data: {
                            diamond: { increment: Number(diamondAmount) }
                        }
                    });
                } else {
                    await tx.userCurrency.create({
                        data: {
                            userId: Number(gameUuid),
                            diamond: Number(diamondAmount),
                            gold: 0
                        }
                    });
                }

                // 3. 거래 내역 기록
                await tx.currencyTransaction.create({
                    data: {
                        userId: Number(gameUuid),
                        type: 'DIAMOND',
                        amount: Number(diamondAmount),
                        reason: 'USDC_PURCHASE',
                    }
                });
            });

            console.log(`✅ Successfully processed purchase for GameUUID: ${gameUuid}`);

        } catch (error) {
            console.error('❌ Failed to process log:', error);
        }
    }
}

// 싱글톤 인스턴스
export const diamondPurchaseListener = new DiamondPurchaseListener();
