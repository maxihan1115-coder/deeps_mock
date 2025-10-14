const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupDuplicateHighScores() {
  try {
    console.log('🔍 HighScore 중복 정리 시작...');

    // 사용자별 최고 점수만 남기고 모두 삭제
    const all = await prisma.highScore.findMany({
      orderBy: [{ userId: 'asc' }, { score: 'desc' }, { createdAt: 'desc' }]
    });

    const byUser = new Map();
    for (const hs of all) {
      if (!byUser.has(hs.userId)) {
        byUser.set(hs.userId, []);
      }
      byUser.get(hs.userId).push(hs);
    }

    let deleted = 0;
    for (const [, list] of byUser.entries()) {
      if (list.length <= 1) continue;
      const keep = list[0];
      const toDelete = list.slice(1);
      for (const row of toDelete) {
        await prisma.highScore.delete({ where: { id: row.id } });
        deleted++;
      }
      console.log(`👤 userId=${keep.userId} 최고점 ${keep.score}만 유지, ${toDelete.length}개 삭제`);
    }

    console.log(`✅ 중복 정리 완료. 삭제: ${deleted}`);
  } catch (e) {
    console.error('❌ HighScore 중복 정리 실패:', e);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicateHighScores();


