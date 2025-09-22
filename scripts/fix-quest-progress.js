const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixQuestProgress() {
  try {
    console.log('🔧 퀘스트 진행도 데이터 수정 시작...');

    // 1. 모든 questProgress 레코드 조회
    const allProgress = await prisma.questProgress.findMany();

    console.log(`📊 총 ${allProgress.length}개의 퀘스트 진행도 레코드를 확인합니다.`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const progress of allProgress) {
      const { userId, catalogId, progress: currentProgress, isCompleted } = progress;
      
      // 카탈로그 정보 조회
      const catalog = await prisma.questCatalog.findUnique({
        where: { id: catalogId }
      });
      
      if (!catalog) {
        console.warn(`⚠️ 카탈로그를 찾을 수 없습니다: ${catalogId}`);
        continue;
      }

      // 올바른 완료 상태 계산
      const shouldBeCompleted = currentProgress >= catalog.maxProgress;
      
      // 현재 상태와 다르면 수정
      if (isCompleted !== shouldBeCompleted) {
        await prisma.questProgress.update({
          where: {
            userId_catalogId: {
              userId: userId,
              catalogId: catalogId
            }
          },
          data: {
            isCompleted: shouldBeCompleted
          }
        });

        console.log(`✅ 수정: 사용자 ${userId}, 퀘스트 ${catalogId} (${catalog.title}) - 진행도: ${currentProgress}/${catalog.maxProgress}, 완료: ${isCompleted} → ${shouldBeCompleted}`);
        fixedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`\n🎉 수정 완료!`);
    console.log(`- 수정된 레코드: ${fixedCount}개`);
    console.log(`- 건너뛴 레코드: ${skippedCount}개`);

    // 2. 수정 후 상태 확인
    console.log('\n📋 수정 후 상태 확인:');
    const updatedProgress = await prisma.questProgress.findMany({
      where: {
        userId: 1 // uuid 1번 유저 확인
      }
    });

    console.log(`\n👤 사용자 1번의 퀘스트 진행도:`);
    for (const p of updatedProgress) {
      const catalog = await prisma.questCatalog.findUnique({
        where: { id: p.catalogId }
      });
      const status = p.isCompleted ? '✅ 완료' : '⏳ 진행중';
      console.log(`- ${p.catalogId}: ${catalog?.title || 'Unknown'} - ${p.progress}/${catalog?.maxProgress || 'Unknown'} ${status}`);
    }

  } catch (error) {
    console.error('❌ 퀘스트 진행도 수정 중 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixQuestProgress();
