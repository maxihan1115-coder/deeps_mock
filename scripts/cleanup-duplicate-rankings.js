const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupDuplicateRankings() {
  try {
    console.log('🔍 중복 랭킹 데이터 정리 시작...');
    
    // 시즌 랭킹 데이터 조회
    const periodStartDate = new Date('2025-01-01T00:00:00+09:00');
    
    const rankings = await prisma.ranking.findMany({
      where: {
        rankingPeriod: 'season',
        periodStartDate: periodStartDate,
      },
      orderBy: [
        { userId: 'asc' },
        { score: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        user: {
          select: {
            username: true,
            uuid: true
          }
        }
      }
    });

    console.log(`📊 총 ${rankings.length}개의 랭킹 데이터 발견`);

    // 사용자별로 그룹화
    const userRankings = {};
    rankings.forEach(ranking => {
      const userId = ranking.userId;
      if (!userRankings[userId]) {
        userRankings[userId] = [];
      }
      userRankings[userId].push(ranking);
    });

    let totalDeleted = 0;
    let totalKept = 0;

    // 각 사용자별로 중복 제거
    for (const [userId, userRankingList] of Object.entries(userRankings)) {
      if (userRankingList.length > 1) {
        console.log(`\n👤 사용자 ${userRankingList[0].user.username} (UUID: ${userRankingList[0].user.uuid}):`);
        console.log(`   중복 데이터 ${userRankingList.length}개 발견`);
        
        // 가장 높은 점수와 가장 최근 데이터를 유지
        const bestRanking = userRankingList[0]; // 이미 score desc, createdAt desc로 정렬됨
        console.log(`   유지할 데이터: ${bestRanking.score}점 (ID: ${bestRanking.id})`);
        
        // 나머지 삭제
        const toDelete = userRankingList.slice(1);
        for (const ranking of toDelete) {
          console.log(`   삭제할 데이터: ${ranking.score}점 (ID: ${ranking.id})`);
          await prisma.ranking.delete({
            where: { id: ranking.id }
          });
          totalDeleted++;
        }
        totalKept++;
      } else {
        totalKept++;
      }
    }

    console.log(`\n✅ 중복 데이터 정리 완료!`);
    console.log(`   유지된 사용자: ${totalKept}명`);
    console.log(`   삭제된 중복 데이터: ${totalDeleted}개`);

    // 정리 후 랭킹 재계산
    console.log('\n🔄 랭킹 순위 재계산 중...');
    const remainingRankings = await prisma.ranking.findMany({
      where: {
        rankingPeriod: 'season',
        periodStartDate: periodStartDate,
      },
      orderBy: { score: 'desc' },
      include: {
        user: {
          select: {
            username: true,
            uuid: true
          }
        }
      }
    });

    // 순위 업데이트
    for (let i = 0; i < remainingRankings.length; i++) {
      const ranking = remainingRankings[i];
      await prisma.ranking.update({
        where: { id: ranking.id },
        data: { rankPosition: i + 1 }
      });
    }

    console.log(`✅ 랭킹 순위 재계산 완료! 총 ${remainingRankings.length}명`);

    // 상위 10명 출력
    console.log('\n🏆 상위 10명 랭킹:');
    const top10 = remainingRankings.slice(0, 10);
    top10.forEach((ranking, index) => {
      console.log(`${index + 1}위: ${ranking.user.username} - ${ranking.score.toLocaleString()}점 (레벨 ${ranking.level}, ${ranking.lines}라인)`);
    });

  } catch (error) {
    console.error('❌ 중복 데이터 정리 실패:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicateRankings();
