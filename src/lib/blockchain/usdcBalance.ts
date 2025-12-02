import { createPublicClient, http, formatUnits } from 'viem';
import { polygonAmoy } from 'viem/chains';

// Polygon Amoy Testnet USDC Contract Address
const USDC_CONTRACT_ADDRESS = '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582';

// ERC-20 ABI (balanceOf function만 필요)
const ERC20_ABI = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: 'balance', type: 'uint256' }],
    },
    {
        name: 'decimals',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint8' }],
    },
] as const;

// Public client 생성
const publicClient = createPublicClient({
    chain: polygonAmoy,
    transport: http(),
});

/**
 * 블록체인에서 USDC 잔액 조회
 * @param address - 지갑 주소
 * @returns USDC 잔액 (문자열)
 */
export async function getUSDCBalance(address: string): Promise<string> {
    try {
        // balanceOf 호출
        const balance = await publicClient.readContract({
            address: USDC_CONTRACT_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [address as `0x${string}`],
        });

        // USDC는 6 decimals
        const formattedBalance = formatUnits(balance, 6);

        return formattedBalance;
    } catch (error) {
        console.error('USDC 잔액 조회 실패:', error);
        return '0';
    }
}

/**
 * Polygon Amoy Testnet USDC 컨트랙트 주소
 */
export const POLYGON_AMOY_USDC_ADDRESS = USDC_CONTRACT_ADDRESS;
