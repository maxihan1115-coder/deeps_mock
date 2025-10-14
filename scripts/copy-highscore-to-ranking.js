const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function copyHighScoreToRanking() {
  try {
    console.log('🔄 HighScore 데이터를 Ranking 테이블로 복사 시작...');

    // 1. HighScore 테이블의 모든 데이터 조회
    const highScores = await prisma.highScore.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            uuid: true
          }
        }
      }
    });

    console.log(`📊 총 ${highScores.length}개의 HighScore 데이터 발견`);

    if (highScores.length === 0) {
      console.log('❌ HighScore 데이터가 없습니다.');
      return;
    }

    // 2. 시즌 정보 설정
    const seasonName = '2025-01';
    const periodStartDate = new Date('2025-01-01T00:00:00+09:00');
    const periodEndDate = new Date('2025-10-14T17:00:00+09:00');

    // 3. 기존 ranking 데이터 삭제 (같은 시즌)
    const deleteResult = await prisma.ranking.deleteMany({
      where: {
        rankingPeriod: 'season',
        periodStartDate: periodStartDate,
        periodEndDate: periodEndDate
      }
    });
    console.log(`🗑️ 기존 시즌 랭킹 데이터 ${deleteResult.count}개 삭제`);

    // 4. HighScore 데이터를 Ranking 테이블로 복사
    const rankingData = highScores.map(highScore => ({
      userId: highScore.user.id,
      gameUuid: highScore.user.uuid,
      score: highScore.score,
      level: highScore.level,
      lines: highScore.lines,
      rankingPeriod: 'season',
      periodStartDate: periodStartDate,
      periodEndDate: periodEndDate,
      rankPosition: 0, // 임시로 0, 나중에 계산
    }));

    // 5. Ranking 테이블에 데이터 삽입
    const createResult = await prisma.ranking.createMany({
      data: rankingData
    });

    console.log(`✅ ${createResult.count}개의 랭킹 데이터 생성 완료`);

    // 6. 점수 기준으로 순위 계산 및 업데이트
    const rankings = await prisma.ranking.findMany({
      where: {
        rankingPeriod: 'season',
        periodStartDate: periodStartDate,
        periodEndDate: periodEndDate
      },
      orderBy: {
        score: 'desc'
      }
    });

    console.log('🏆 순위 계산 중...');
    for (let i = 0; i < rankings.length; i++) {
      await prisma.ranking.update({
        where: { id: rankings[i].id },
        data: { rankPosition: i + 1 }
      });
    }

    console.log(`🎉 랭킹 복사 완료! 총 ${rankings.length}명의 순위가 계산되었습니다.`);

    // 7. 상위 10명 출력
    console.log('\n📈 상위 10명 랭킹:');
    const top10 = await prisma.ranking.findMany({
      where: {
        rankingPeriod: 'season',
        periodStartDate: periodStartDate,
        periodEndDate: periodEndDate
      },
      orderBy: {
        rankPosition: 'asc'
      },
      take: 10
    });

    // 사용자 정보 조회
    for (let i = 0; i < top10.length; i++) {
      const ranking = top10[i];
      const user = await prisma.user.findUnique({
        where: { id: ranking.userId },
        select: { username: true }
      });
      console.log(`${i + 1}위: ${user?.username || 'Unknown'} - ${ranking.score.toLocaleString()}점 (레벨 ${ranking.level}, ${ranking.lines}라인)`);
    }

  } catch (error) {
    console.error('❌ 랭킹 복사 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
copyHighScoreToRanking();
