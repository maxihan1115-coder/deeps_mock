const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const gachaItems = await prisma.shopItem.findMany({
        where: { isGacha: true }
    });

    console.log('Found Gacha Items:', gachaItems.length);

    for (const item of gachaItems) {
        console.log(`\n[${item.name}] (ID: ${item.id})`);
        console.log('Price:', item.price);
        console.log('Gacha Rewards:', JSON.stringify(item.gachaRewards, null, 2));

        // Validate probabilities
        const rewards = item.gachaRewards;
        if (Array.isArray(rewards)) {
            const totalProb = rewards.reduce((sum, r) => sum + r.probability, 0);
            console.log('Total Probability:', totalProb);
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
