
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

const apiKey = process.env.CIRCLE_API_KEY!;
const entitySecret = process.env.CIRCLE_ENTITY_SECRET!;
const walletId = '8d88f25a-97fd-5efa-8b1b-fe3bab9e18b4';

const client = initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
});

async function checkMaticBalance() {
    try {
        console.log(`Checking MATIC balance for wallet: ${walletId}`);
        const response = await client.getWalletTokenBalance({
            id: walletId
        });

        const balances = response.data?.tokenBalances;
        const matic = balances?.find((b: any) => b.token.isNative);

        if (matic) {
            console.log('MATIC Balance:', matic.amount);
        } else {
            console.log('No MATIC (Native Token) found in balance list.');
        }

    } catch (error: any) {
        console.error('Error:', error.response?.data || error.message);
    }
}

checkMaticBalance();
