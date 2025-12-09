
import { createWalletClient, createPublicClient, http } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const DIAMOND_PURCHASE_ADDRESS = '0x517D253E988Ac1FAf90Fb78f00dca019EACa7bDB';
const NEW_TREASURY_ADDRESS = '0xa0502266dce0ec731aaf6a0a8edf5c5bb793d8ad';

let privateKey = process.env.DEPLOYER_PRIVATE_KEY;

if (!privateKey) {
    console.error('Error: DEPLOYER_PRIVATE_KEY not set in environment');
    process.exit(1);
}

// Ensure 0x prefix
if (!privateKey.startsWith('0x')) {
    privateKey = '0x' + privateKey;
}

const account = privateKeyToAccount(privateKey as `0x${string}`);

const publicClient = createPublicClient({
    chain: polygonAmoy,
    transport: http(),
});

const walletClient = createWalletClient({
    account,
    chain: polygonAmoy,
    transport: http(),
});

const UPDATE_TREASURY_ABI = [
    {
        inputs: [{ name: 'newTreasuryAddress', type: 'address' }],
        name: 'updateTreasuryAddress',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'treasuryAddress',
        outputs: [{ type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

async function main() {
    console.log('=== Update Treasury Address ===');
    console.log('Contract:', DIAMOND_PURCHASE_ADDRESS);
    console.log('New Treasury:', NEW_TREASURY_ADDRESS);
    console.log('Deployer (Owner):', account.address);

    // Check current treasury
    const currentTreasury = await publicClient.readContract({
        address: DIAMOND_PURCHASE_ADDRESS as `0x${string}`,
        abi: UPDATE_TREASURY_ABI,
        functionName: 'treasuryAddress',
    });
    console.log('Current Treasury:', currentTreasury);

    // Update treasury
    console.log('\nSending transaction...');
    const hash = await walletClient.writeContract({
        address: DIAMOND_PURCHASE_ADDRESS as `0x${string}`,
        abi: UPDATE_TREASURY_ABI,
        functionName: 'updateTreasuryAddress',
        args: [NEW_TREASURY_ADDRESS as `0x${string}`],
    });
    console.log('Transaction Hash:', hash);

    console.log('Waiting for confirmation...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log('Block Number:', receipt.blockNumber);
    console.log('Status:', receipt.status);

    // Verify
    const newTreasury = await publicClient.readContract({
        address: DIAMOND_PURCHASE_ADDRESS as `0x${string}`,
        abi: UPDATE_TREASURY_ABI,
        functionName: 'treasuryAddress',
    });
    console.log('\n✅ Treasury Address updated successfully!');
    console.log('New Treasury (Verified):', newTreasury);
}

main().catch(console.error);
