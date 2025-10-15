import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 새 시즌 시작 처리
export async function POST(request: NextRequest) {
  try {
    const { currentSeasonName, newSeasonName, newSeasonStartDate, newSeasonEndDate, adminUserId } = await request.json();

    // 관리자 권한 검증 (maxi.moff 계정 UUID 허용)
    const adminUuids = ['1', 1, '138afdb1-d873-4032-af80-77b5fb8a23cf'];
    if (!adminUuids.includes(adminUserId)) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    if (!currentSeasonName || !newSeasonName || !newSeasonStartDate || !newSeasonEndDate) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }

    console.log(`🆕 새 시즌 시작 처리: ${newSeasonName}`);

    // 1. 기존 시즌 데이터 백업
    const backupTableName = `rankings_backup_${currentSeasonName.replace('-', '_')}`;
    console.log(`📦 기존 시즌 데이터 백업: ${backupTableName}`);
    
    // 백업 테이블 생성 및 데이터 복사
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS ${backupTableName} AS 
      SELECT * FROM rankings 
      WHERE ranking_period = 'season' 
      AND period_start_date = ${new Date('2025-01-01T00:00:00+09:00')}
      AND period_end_date = ${new Date('2025-10-15T11:00:00+09:00')}
    `;

    // 2. 기존 시즌 랭킹 데이터 삭제
    const deleteResult = await prisma.ranking.deleteMany({
      where: {
        rankingPeriod: 'season',
        periodStartDate: new Date('2025-01-01T00:00:00+09:00'),
        periodEndDate: new Date('2025-10-15T11:00:00+09:00')
      }
    });
    console.log(`🗑️ 기존 시즌 랭킹 데이터 ${deleteResult.count}개 삭제`);

    // 3. 새로운 시즌 시작 (HighScore 데이터를 새 시즌 랭킹으로 복사)
    console.log(`🆕 새로운 시즌 시작: ${newSeasonName}`);

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

    if (highScores.length > 0) {
      const newRankingData = highScores.map(highScore => ({
        userId: highScore.user.id,
        gameUuid: highScore.user.uuid,
        score: highScore.score,
        level: highScore.level,
        lines: highScore.lines,
        rankingPeriod: 'season',
        periodStartDate: new Date(newSeasonStartDate),
        periodEndDate: new Date(newSeasonEndDate),
        rankPosition: 0, // 임시로 0, 나중에 계산
      }));

      await prisma.ranking.createMany({
        data: newRankingData
      });

      // 새 시즌 랭킹 순위 계산
      const newRankings = await prisma.ranking.findMany({
        where: {
          rankingPeriod: 'season',
          periodStartDate: new Date(newSeasonStartDate),
          periodEndDate: new Date(newSeasonEndDate),
        },
        orderBy: { score: 'desc' }
      });

      for (let i = 0; i < newRankings.length; i++) {
        await prisma.ranking.update({
          where: { id: newRankings[i].id },
          data: { rankPosition: i + 1 }
        });
      }

      console.log(`✅ 새 시즌 랭킹 초기화 완료: ${newRankingData.length}명`);
    }

    // 4. 시즌 상태를 활성으로 변경
    process.env.SEASON_STATUS = 'active';
    console.log(`📝 시즌 상태를 'active'로 변경`);

    // 5. 새 시즌 시작 로그 기록
    console.log(`🎉 새 시즌 ${newSeasonName} 시작 완료`);

    return NextResponse.json({
      success: true,
      message: `새 시즌 ${newSeasonName} 시작 완료`,
      backupTable: backupTableName,
      newSeason: {
        seasonName: newSeasonName,
        startDate: newSeasonStartDate,
        endDate: newSeasonEndDate,
        isActive: true,
        status: 'active'
      }
    });
  } catch (error) {
    console.error('새 시즌 시작 처리 실패:', error);
    return NextResponse.json({ error: '새 시즌 시작 처리에 실패했습니다.' }, { status: 500 });
  }
}
