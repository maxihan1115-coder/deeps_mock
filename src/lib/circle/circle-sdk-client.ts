import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

/**
 * Circle SDK 클라이언트
 * Developer-Controlled Wallets (Testnet) 전용
 */
export class CircleSDKClient {
    private client: ReturnType<typeof initiateDeveloperControlledWalletsClient>;
    private apiKey: string;
    private entitySecret: string;

    constructor() {
        this.apiKey = process.env.CIRCLE_API_KEY || '';
        this.entitySecret = process.env.CIRCLE_ENTITY_SECRET || '';

        if (!this.apiKey) {
            throw new Error('CIRCLE_API_KEY 환경 변수가 설정되지 않았습니다.');
        }

        if (!this.entitySecret) {
            throw new Error('CIRCLE_ENTITY_SECRET 환경 변수가 설정되지 않았습니다.');
        }

        // Circle SDK 초기화
        this.client = initiateDeveloperControlledWalletsClient({
            apiKey: this.apiKey,
            entitySecret: this.entitySecret,
        });

        console.log('🔵 Circle SDK 클라이언트 초기화 완료 (Testnet)');
    }

    /**
     * Wallet Set 생성
     */
    async createWalletSet(name: string) {
        try {
            const response = await this.client.createWalletSet({
                name,
            });
            return response.data;
        } catch (error) {
            console.error('Wallet Set 생성 실패:', error);
            throw error;
        }
    }

    /**
     * Wallet 생성
     */
    async createWallets(params: {
        walletSetId: string;
        blockchains: string[];
        count?: number;
        accountType?: 'EOA' | 'SCA';
    }) {
        try {
            const response = await this.client.createWallets({
                walletSetId: params.walletSetId,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                blockchains: params.blockchains as any,
                count: params.count || 1,
                accountType: params.accountType || 'EOA',
            });
            return response.data;
        } catch (error) {
            console.error('Wallet 생성 실패:', error);
            throw error;
        }
    }

    /**
     * 지갑 잔액 조회
     */
    async getWalletTokenBalance(walletId: string) {
        try {
            const response = await this.client.getWalletTokenBalance({
                id: walletId,
            });
            return response.data;
        } catch (error) {
            console.error('잔액 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 지갑 정보 조회
     */
    async getWallet(walletId: string) {
        try {
            const response = await this.client.getWallet({
                id: walletId,
            });
            return response.data;
        } catch (error) {
            console.error('지갑 정보 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 트랜잭션 생성 (전송)
     */
    async createTransaction(params: {
        walletId: string;
        destinationAddress: string;
        amounts: string[];
        tokenId: string;
        feeLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
    }) {
        try {
            const response = await this.client.createTransaction({
                walletId: params.walletId,
                destinationAddress: params.destinationAddress,
                amount: params.amounts,
                tokenId: params.tokenId,
                fee: {
                    type: 'level',
                    config: {
                        feeLevel: params.feeLevel || 'MEDIUM',
                    },
                },
            });
            return response.data;
        } catch (error) {
            console.error('트랜잭션 생성 실패:', error);
            throw error;
        }
    }

    /**
     * 트랜잭션 상태 조회
     */
    async getTransaction(transactionId: string) {
        try {
            const response = await this.client.getTransaction({
                id: transactionId,
            });
            return response.data;
        } catch (error) {
            console.error('트랜잭션 조회 실패:', error);
            throw error;
        }
    }
}

// 싱글톤 인스턴스
let circleSDKInstance: CircleSDKClient | null = null;

export function getCircleSDKClient(): CircleSDKClient {
    if (!circleSDKInstance) {
        circleSDKInstance = new CircleSDKClient();
    }
    return circleSDKInstance;
}

export const circleSDKClient = getCircleSDKClient();
