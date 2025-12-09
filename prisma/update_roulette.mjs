import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Start updating shop items...');

    // 1. 다이아몬드 룰렛 업데이트
    console.log('Updating Diamond Roulette...');
    await prisma.shopItem.upsert({
        where: { id: 'diamond-roulette' },
        update: {
            name: 'Diamond Roulette',
            description: 'Exchange 2,000 Diamonds for a chance to win up to 10,000 Diamonds!',
            price: 2000, // 가격 수정: 100 -> 2000
            currency: 'DIAMOND',
            isActive: true,
            isGacha: true,
            gachaRewards: [
                // 11개 보상 목록 (확률은 합이 1.0이 되도록 조정)
                { diamonds: 500, probability: 0.20 },
                { diamonds: 9000, probability: 0.04 },
                { diamonds: 8000, probability: 0.05 },
                { diamonds: 6000, probability: 0.07 },
                { diamonds: 2000, probability: 0.12 },
                { diamonds: 3000, probability: 0.10 },
                { diamonds: 4000, probability: 0.10 },
                { diamonds: 7000, probability: 0.06 },
                { diamonds: 5000, probability: 0.08 },
                { diamonds: 10000, probability: 0.03 },
                { diamonds: 1000, probability: 0.15 },
            ],
        },
        create: {
            id: 'diamond-roulette',
            name: 'Diamond Roulette',
            description: 'Exchange 2,000 Diamonds for a chance to win up to 10,000 Diamonds!',
            price: 2000,
            currency: 'DIAMOND',
            isActive: true,
            isGacha: true,
            gachaRewards: [
                { diamonds: 500, probability: 0.20 },
                { diamonds: 9000, probability: 0.04 },
                { diamonds: 8000, probability: 0.05 },
                { diamonds: 6000, probability: 0.07 },
                { diamonds: 2000, probability: 0.12 },
                { diamonds: 3000, probability: 0.10 },
                { diamonds: 4000, probability: 0.10 },
                { diamonds: 7000, probability: 0.06 },
                { diamonds: 5000, probability: 0.08 },
                { diamonds: 10000, probability: 0.03 },
                { diamonds: 1000, probability: 0.15 },
            ],
        },
    });

    console.log('🎉 Update finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
