
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

const apiKey = process.env.CIRCLE_API_KEY!;
const entitySecret = process.env.CIRCLE_ENTITY_SECRET!;
const txId = '601645b1-8951-5916-9204-c7403c556bf5';

const client = initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
});

async function checkTxStatus() {
    try {
        console.log(`Checking transaction status: ${txId}`);
        const response = await client.getTransaction({
            id: txId
        });

        console.log('Transaction Details:', JSON.stringify(response.data, null, 2));
    } catch (error: any) {
        console.error('Error:', error.response?.data || error.message);
    }
}

checkTxStatus();
