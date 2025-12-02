import axios, { AxiosInstance, AxiosError } from 'axios';

/**
 * Circle API 클라이언트
 * Developer-Controlled Wallets (Testnet) 전용
 */
export class CircleClient {
  private client: AxiosInstance;
  private apiKey: string;
  private isTestnet: boolean;

  constructor() {
    this.apiKey = process.env.CIRCLE_API_KEY || '';
    this.isTestnet = process.env.CIRCLE_TESTNET === 'true';

    if (!this.apiKey) {
      throw new Error('CIRCLE_API_KEY 환경 변수가 설정되지 않았습니다.');
    }

    // Testnet API 엔드포인트
    const baseURL = this.isTestnet
      ? 'https://api.circle.com/v1'
      : 'https://api.circle.com/v1';

    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30초 타임아웃
    });

    // 요청/응답 인터셉터 (로깅)
    this.client.interceptors.request.use(
      (config) => {
        const isProduction = process.env.NODE_ENV === 'production';
        if (!isProduction) {
          console.log(`🌐 [Circle API] ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => {
        const isProduction = process.env.NODE_ENV === 'production';
        if (!isProduction) {
          console.log(`✅ [Circle API] Success: ${response.config.url}`);
        }
        return response;
      },
      (error: AxiosError) => {
        console.error(`❌ [Circle API] Error:`, {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
        });
        return Promise.reject(this.handleError(error));
      }
    );
  }

  /**
   * 에러 핸들링
   */
  private handleError(error: AxiosError): Error {
    if (error.response) {
      const data = error.response.data as Record<string, unknown>;
      const message = (data?.message as string) || (data?.error as string) || 'Circle API 오류가 발생했습니다.';

      // 전체 에러 응답 출력
      console.error('🔍 Circle API Full Error Response:', JSON.stringify(data, null, 2));

      return new Error(`Circle API Error (${error.response.status}): ${message}`);
    } else if (error.request) {
      return new Error('Circle API 응답을 받을 수 없습니다.');
    } else {
      return new Error(`Circle API 요청 실패: ${error.message}`);
    }
  }

  /**
   * Wallet Set 생성
   */
  async createWalletSet(name: string) {
    try {
      // UUID v4를 idempotencyKey로 사용
      const { v4: uuidv4 } = await import('uuid');
      const idempotencyKey = uuidv4();

      // entitySecretCiphertext는 환경 변수에서 가져오거나 생성
      const entitySecretCiphertext = process.env.CIRCLE_ENTITY_SECRET ||
        Buffer.from(uuidv4()).toString('base64');

      const response = await this.client.post('/w3s/developer/walletSets', {
        name,
        idempotencyKey,
        entitySecretCiphertext,
      });
      return response.data.data;
    } catch (error) {
      console.error('Wallet Set 생성 실패:', error);
      throw error;
    }
  }

  /**
   * Wallet 생성
   */
  async createWallet(params: {
    walletSetId: string;
    blockchains: string[];
    count?: number;
    accountType?: 'EOA' | 'SCA';
  }) {
    try {
      const response = await this.client.post('/w3s/developer/wallets', {
        walletSetId: params.walletSetId,
        blockchains: params.blockchains,
        count: params.count || 1,
        accountType: params.accountType || 'EOA',
      });
      return response.data.data;
    } catch (error) {
      console.error('Wallet 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 지갑 잔액 조회
   */
  async getBalance(walletId: string) {
    try {
      const response = await this.client.get(`/w3s/wallets/${walletId}/balances`);
      return response.data.data;
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
      const response = await this.client.get(`/w3s/wallets/${walletId}`);
      return response.data.data;
    } catch (error) {
      console.error('지갑 정보 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 트랜잭션 생성 (전송)
   */
  async createTransfer(params: {
    walletId: string;
    destinationAddress: string;
    amounts: string[];
    tokenId: string;
    fee?: {
      type: 'level' | 'absolute';
      config: {
        feeLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
        maxFee?: string;
        priorityFee?: string;
      };
    };
  }) {
    try {
      const requestBody: Record<string, unknown> = {
        walletId: params.walletId,
        destinationAddress: params.destinationAddress,
        amounts: params.amounts,
        tokenId: params.tokenId,
      };

      if (params.fee) {
        requestBody.fee = params.fee;
      }

      const response = await this.client.post(
        '/w3s/developer/transactions/transfer',
        requestBody
      );
      return response.data.data;
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
      const response = await this.client.get(`/w3s/transactions/${transactionId}`);
      return response.data.data;
    } catch (error) {
      console.error('트랜잭션 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 트랜잭션 목록 조회
   */
  async listTransactions(params: {
    walletIds?: string[];
    blockchain?: string;
    from?: string;
    to?: string;
    pageSize?: number;
    pageBefore?: string;
    pageAfter?: string;
  }) {
    try {
      const queryParams = new URLSearchParams();

      if (params.walletIds) {
        params.walletIds.forEach(id => queryParams.append('walletIds', id));
      }
      if (params.blockchain) queryParams.append('blockchain', params.blockchain);
      if (params.from) queryParams.append('from', params.from);
      if (params.to) queryParams.append('to', params.to);
      if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
      if (params.pageBefore) queryParams.append('pageBefore', params.pageBefore);
      if (params.pageAfter) queryParams.append('pageAfter', params.pageAfter);

      const response = await this.client.get(`/w3s/transactions?${queryParams.toString()}`);
      return response.data.data;
    } catch (error) {
      console.error('트랜잭션 목록 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 지원하는 토큰 목록 조회
   */
  async getSupportedTokens() {
    try {
      const response = await this.client.get('/w3s/tokens');
      return response.data.data;
    } catch (error) {
      console.error('토큰 목록 조회 실패:', error);
      throw error;
    }
  }
}

// 싱글톤 인스턴스
let circleClientInstance: CircleClient | null = null;

export function getCircleClient(): CircleClient {
  if (!circleClientInstance) {
    circleClientInstance = new CircleClient();
    console.log('🔵 Circle API 클라이언트 초기화 완료 (Testnet)');
  }
  return circleClientInstance;
}

export const circleClient = getCircleClient();
