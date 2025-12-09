import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Start seeding shop items...');

    const shopItems = [
        // --- 골드 구매 상품 (다이아몬드로 구매) ---
        {
            id: 'gold-100',
            name: '100 Gold',
            description: 'Basic Gold purchased with Diamonds',
            price: 10, // 예상 가격
            currency: 'DIAMOND',
            isActive: true,
            isGacha: false,
        },
        {
            id: 'gold-500',
            name: '500 Gold',
            description: 'Intermediate Gold purchased with Diamonds',
            price: 45, // 10% 할인율 적용 가정
            currency: 'DIAMOND',
            isActive: true,
            isGacha: false,
        },
        {
            id: 'gold-1000',
            name: '1000 Gold',
            description: 'Advanced Gold purchased with Diamonds',
            price: 80, // 20% 할인율 적용 가정
            currency: 'DIAMOND',
            isActive: true,
            isGacha: false,
        },
        {
            id: 'gold-2000',
            name: '2000 Gold',
            description: 'Premium Gold purchased with Diamonds',
            price: 150, // 25% 할인율 적용 가정
            currency: 'DIAMOND',
            isActive: true,
            isGacha: false,
        },

        // --- 아이템 구매 상품 (골드로 구매) ---
        // API 코드에 'Test Item 1' ~ 'Test Item 6'가 있었음
        {
            id: 'item-test-1',
            name: 'Test Item 1',
            description: 'Basic Item purchased with Gold',
            price: 100,
            currency: 'GOLD',
            isActive: true,
            isGacha: false,
        },
        {
            id: 'item-test-2',
            name: 'Test Item 2',
            description: 'Intermediate Item purchased with Gold',
            price: 300,
            currency: 'GOLD',
            isActive: true,
            isGacha: false,
        },
        {
            id: 'item-test-3',
            name: 'Test Item 3',
            description: 'Advanced Item purchased with Gold',
            price: 500,
            currency: 'GOLD',
            isActive: true,
            isGacha: false,
        },
        {
            id: 'item-test-4',
            name: 'Test Item 4',
            description: 'Epic Item purchased with Gold',
            price: 1000,
            currency: 'GOLD',
            isActive: true,
            isGacha: false,
        },
        {
            id: 'item-test-5',
            name: 'Test Item 5',
            description: 'Legendary Item purchased with Gold',
            price: 2000,
            currency: 'GOLD',
            isActive: true,
            isGacha: false,
        },
        {
            id: 'item-test-6',
            name: 'Test Item 6',
            description: 'Mythical Item purchased with Gold',
            price: 5000,
            currency: 'GOLD',
            isActive: true,
            isGacha: false,
        },

        // --- 룰렛 상품 ---
        {
            id: 'diamond-roulette',
            name: 'Diamond Roulette',
            description: 'Win between 500 and 10,000 Diamonds randomly.',
            price: 100,
            currency: 'DIAMOND', // 보통 룰렛은 유료 재화로 돌림
            isActive: true,
            isGacha: true,
            // 가챠 보상 정보 (JSON)
            gachaRewards: [
                { diamonds: 500, probability: 0.4 },
                { diamonds: 1000, probability: 0.3 },
                { diamonds: 2000, probability: 0.2 },
                { diamonds: 5000, probability: 0.08 },
                { diamonds: 10000, probability: 0.02 },
            ],
        },
    ];

    for (const item of shopItems) {
        await prisma.shopItem.upsert({
            where: { id: item.id },
            update: item,
            create: item,
        });
        console.log(`✅ Upserted item: ${item.name}`);
    }

    console.log('🎉 Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
