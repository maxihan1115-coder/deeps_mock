
import { createPublicClient, http } from 'viem';
import { polygonAmoy } from 'viem/chains';

const DIAMOND_PURCHASE_ADDRESS = '0x517D253E988Ac1FAf90Fb78f00dca019EACa7bDB';
const USER_ADDRESS = '0x3D0Ae837Cd9486eFFC76C85f00C1df9BF5a4A939';

const client = createPublicClient({
    chain: polygonAmoy,
    transport: http(),
});

async function checkContractState() {
    try {
        // 1. Check treasuryAddress
        const treasuryAddress = await client.readContract({
            address: DIAMOND_PURCHASE_ADDRESS as `0x${string}`,
            abi: [{
                inputs: [],
                name: 'treasuryAddress',
                outputs: [{ type: 'address' }],
                stateMutability: 'view',
                type: 'function'
            }],
            functionName: 'treasuryAddress',
        });
        console.log('Treasury Address:', treasuryAddress);

        // 2. Check user's USDC balance
        const userBalance = await client.readContract({
            address: DIAMOND_PURCHASE_ADDRESS as `0x${string}`,
            abi: [{
                inputs: [{ type: 'address', name: 'user' }],
                name: 'getUserBalance',
                outputs: [{ type: 'uint256' }],
                stateMutability: 'view',
                type: 'function'
            }],
            functionName: 'getUserBalance',
            args: [USER_ADDRESS],
        });
        console.log('User USDC Balance:', Number(userBalance) / 1e6, 'USDC');

        // 3. Check user's allowance
        const userAllowance = await client.readContract({
            address: DIAMOND_PURCHASE_ADDRESS as `0x${string}`,
            abi: [{
                inputs: [{ type: 'address', name: 'user' }],
                name: 'getUserAllowance',
                outputs: [{ type: 'uint256' }],
                stateMutability: 'view',
                type: 'function'
            }],
            functionName: 'getUserAllowance',
            args: [USER_ADDRESS],
        });
        console.log('User USDC Allowance:', Number(userAllowance) / 1e6, 'USDC');

    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

checkContractState();
