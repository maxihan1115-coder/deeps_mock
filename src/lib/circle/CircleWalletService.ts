import { prisma } from '@/lib/prisma';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

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
 * Circle 지갑 관리 서비스 (SDK 기반)
 */
export class CircleWalletService {
    /**
     * 사용자를 위한 Circle 지갑 생성
     */
    async createWalletForUser(userId: number, blockchain: string = 'MATIC-AMOY') {
        try {
            // 이미 지갑이 있는지 확인
            const existingWallet = await prisma.circleWallet.findUnique({
                where: { userId },
            });

            if (existingWallet) {
                console.log(`✅ 사용자 ${userId}의 지갑이 이미 존재합니다:`, existingWallet.walletId);
                return existingWallet;
            }

            console.log(`🔵 사용자 ${userId}을 위한 Circle 지갑 생성 시작...`);

            const client = getCircleClient();

            // 1. Wallet Set 생성
            const walletSetResponse = await client.createWalletSet({
                name: `user-${userId}-walletset`,
            });

            const walletSet = walletSetResponse.data?.walletSet;
            if (!walletSet) {
                throw new Error('Wallet Set 생성 실패');
            }

            console.log(`✅ Wallet Set 생성 완료:`, walletSet.id);

            // 2. Wallet 생성
            const walletResponse = await client.createWallets({
                walletSetId: walletSet.id,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                blockchains: [blockchain as any],
                count: 1,
                accountType: 'EOA',
            });

            const wallet = walletResponse.data?.wallets?.[0];
            if (!wallet) {
                throw new Error('Wallet 생성 실패');
            }

            console.log(`✅ Wallet 생성 완료:`, wallet.id, wallet.address);

            // 3. DB에 저장
            const newWallet = await prisma.circleWallet.create({
                data: {
                    userId,
                    walletSetId: walletSet.id,
                    walletId: wallet.id,
                    address: wallet.address,
                    blockchain,
                    accountType: 'EOA',
                    state: wallet.state,
                },
            });

            console.log(`✅ DB에 지갑 정보 저장 완료`);

            // 4. 잔액 캐시 초기화
            await prisma.uSDCBalance.create({
                data: {
                    userId,
                    walletId: wallet.id,
                    balance: '0',
                },
            });

            return newWallet;
        } catch (error) {
            console.error(`❌ 사용자 ${userId} 지갑 생성 실패:`, error);
            throw new Error(`지갑 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }
    }

    /**
     * 사용자 지갑 조회 (DB)
     */
    async getWalletByUserId(userId: number) {
        return await prisma.circleWallet.findUnique({
            where: { userId },
        });
    }

    /**
     * 지갑 ID로 조회 (DB)
     */
    async getWalletById(walletId: string) {
        return await prisma.circleWallet.findUnique({
            where: { walletId },
        });
    }

    /**
     * 지갑 잔액 조회 (Circle SDK)
     */
    async getWalletBalance(walletId: string): Promise<{ usdc: string }> {
        try {
            const client = getCircleClient();
            const response = await client.getWalletTokenBalance({
                id: walletId,
            });

            // USDC 토큰 찾기
            const tokenBalances = response.data?.tokenBalances || [];
            const usdcBalance = tokenBalances.find(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (b: any) => b.token?.symbol === 'USDC'
            );

            const balance = usdcBalance?.amount || '0';

            console.log(`💰 지갑 ${walletId} USDC 잔액:`, balance);

            // 잔액 캐시 업데이트
            await this.updateBalanceCache(walletId, balance);

            return { usdc: balance };
        } catch (error) {
            console.error(`❌ 잔액 조회 실패 (${walletId}):`, error);

            // 에러 발생 시 캐시된 잔액 반환
            const wallet = await this.getWalletById(walletId);
            if (wallet) {
                const cachedBalance = await prisma.uSDCBalance.findUnique({
                    where: { userId: wallet.userId },
                });

                if (cachedBalance) {
                    console.log(`⚠️ 캐시된 잔액 사용:`, cachedBalance.balance);
                    return { usdc: cachedBalance.balance };
                }
            }

            return { usdc: '0' };
        }
    }

    /**
     * 잔액 캐시 업데이트
     */
    private async updateBalanceCache(walletId: string, balance: string) {
        try {
            const wallet = await this.getWalletById(walletId);
            if (!wallet) return;

            await prisma.uSDCBalance.upsert({
                where: { userId: wallet.userId },
                update: { balance },
                create: {
                    userId: wallet.userId,
                    walletId,
                    balance,
                },
            });
        } catch (error) {
            console.error('잔액 캐시 업데이트 실패:', error);
        }
    }

    /**
     * 사용자의 캐시된 잔액 조회
     */
    async getCachedBalance(userId: number): Promise<{ usdc: string }> {
        const cachedBalance = await prisma.uSDCBalance.findUnique({
            where: { userId },
        });

        return {
            usdc: cachedBalance?.balance || '0',
        };
    }

    /**
     * 지갑 정보 조회 (Circle SDK)
     */
    async getWalletInfo(walletId: string) {
        try {
            const client = getCircleClient();
            const response = await client.getWallet({
                id: walletId,
            });
            return response.data?.wallet;
        } catch (error) {
            console.error(`❌ 지갑 정보 조회 실패 (${walletId}):`, error);
            throw error;
        }
    }

    /**
     * 사용자 지갑이 존재하는지 확인하고, 없으면 자동 생성
     */
    async ensureWalletExists(userId: number, blockchain: string = 'MATIC-AMOY') {
        let wallet = await this.getWalletByUserId(userId);

        if (!wallet) {
            console.log(`🔵 사용자 ${userId}의 지갑이 없습니다. 자동 생성합니다...`);
            wallet = await this.createWalletForUser(userId, blockchain);
        }

        return wallet;
    }
}

// 싱글톤 인스턴스
export const circleWalletService = new CircleWalletService();
