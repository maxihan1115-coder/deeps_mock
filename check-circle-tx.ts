
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

const apiKey = process.env.CIRCLE_API_KEY || '';
const entitySecret = process.env.CIRCLE_ENTITY_SECRET || '';

const client = initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
});

const circleTransactionId = 'abd0d0db-2b1a-5621-831a-54c2cb867711';

async function checkTransaction() {
    try {
        console.log('Checking transaction:', circleTransactionId);
        const response = await client.getTransaction({ id: circleTransactionId });
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error: any) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

checkTransaction();
