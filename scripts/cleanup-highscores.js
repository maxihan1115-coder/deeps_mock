const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔎 Loading all high scores...');
  const all = await prisma.highScore.findMany({
    orderBy: [{ userId: 'asc' }, { score: 'desc' }, { id: 'asc' }],
    select: { id: true, userId: true, score: true, level: true, lines: true },
  });

  const toKeep = new Map();
  const toDelete = [];

  for (const row of all) {
    const key = row.userId;
    if (!toKeep.has(key)) {
      toKeep.set(key, row);
    } else {
      toDelete.push(row.id);
    }
  }

  console.log(`👥 Users found: ${toKeep.size}`);
  console.log(`🗑️ Duplicates to delete: ${toDelete.length}`);

  if (toDelete.length > 0) {
    const chunks = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, (i + 1) * size));
    let deleted = 0;
    for (const batch of chunks(toDelete, 1000)) {
      const res = await prisma.highScore.deleteMany({ where: { id: { in: batch } } });
      deleted += res.count;
    }
    console.log(`✅ Deleted ${deleted} duplicate rows.`);
  } else {
    console.log('✅ No duplicates found.');
  }

  // Verify: ensure one row per user remains (highest score)
  const verify = await prisma.highScore.findMany({ orderBy: [{ userId: 'asc' }, { score: 'desc' }] });
  console.log(`📦 Remaining rows: ${verify.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
