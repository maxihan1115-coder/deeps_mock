
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

const apiKey = process.env.CIRCLE_API_KEY;
const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

if (!apiKey || !entitySecret) {
    console.error('Missing API Key or Entity Secret');
    process.exit(1);
}

const client = initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
});

async function listWallets() {
    try {
        console.log('Fetching wallets...');
        const response = await client.listWallets({});
        const wallets = response.data?.wallets;

        if (!wallets || wallets.length === 0) {
            console.log('No wallets found.');
            return;
        }

        console.log('Available Wallets:');
        wallets.forEach((w: any) => {
            console.log(`- ID: ${w.id}`);
            console.log(`  Address: ${w.address}`);
            console.log(`  Blockchain: ${w.blockchain}`);
            console.log(`  State: ${w.state}`);
            console.log('---');
        });

    } catch (error) {
        console.error('Error fetching wallets:', error);
    }
}

listWallets();
