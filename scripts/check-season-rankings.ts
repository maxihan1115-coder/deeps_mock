import { prisma } from '../src/lib/prisma';

async function main() {
    const rankings = await prisma.ranking.findMany({
        where: { rankingPeriod: 'season' },
        orderBy: { periodEndDate: 'desc' },
        take: 5
    });

    console.log('Latest Season Rankings:', rankings);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
