import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 시즌 종료 처리
export async function POST(request: NextRequest) {
  try {
    const { seasonName, periodStartDate, periodEndDate, adminUserId } = await request.json();

    // 관리자 권한 검증 (maxi.moff 계정 UUID 허용)
    const adminUuids = ['1', 1, '138afdb1-d873-4032-af80-77b5fb8a23cf'];
    if (!adminUuids.includes(adminUserId)) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    if (!seasonName || !periodStartDate || !periodEndDate) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }

    console.log(`🏁 시즌 종료 처리 시작: ${seasonName}`);

    // 1. 시즌 랭킹 계산 (직접 처리)
    const rankings = await prisma.ranking.findMany({
      where: {
        rankingPeriod: 'season',
        periodStartDate: new Date(periodStartDate),
        periodEndDate: new Date(periodEndDate),
      },
      orderBy: {
        score: 'desc',
      },
      include: {
        user: {
          select: {
            username: true,
            uuid: true,
          },
        },
      },
    });

    // 2. 순위 업데이트
    for (let i = 0; i < rankings.length; i++) {
      const ranking = rankings[i];
      await prisma.ranking.update({
        where: { id: ranking.id },
        data: {
          rankPosition: i + 1,
        },
      });
    }

    // 3. 랭킹 퀘스트 달성 체크
    const questAchievements = [];
    
    for (const ranking of rankings) {
      const { userId, rankPosition } = ranking;
      
      // 1등 퀘스트 체크
      if (rankPosition === 1) {
        await checkAndCompleteQuest(userId, '22', 'SEASON_RANK_1ST');
        questAchievements.push({ userId, questId: '22', rank: rankPosition });
      }
      
      // 2등 퀘스트 체크
      if (rankPosition === 2) {
        await checkAndCompleteQuest(userId, '23', 'SEASON_RANK_2ND');
        questAchievements.push({ userId, questId: '23', rank: rankPosition });
      }
      
      // 3등 퀘스트 체크
      if (rankPosition === 3) {
        await checkAndCompleteQuest(userId, '24', 'SEASON_RANK_3RD');
        questAchievements.push({ userId, questId: '24', rank: rankPosition });
      }
      
      // 4~10등 퀘스트 체크
      if (rankPosition >= 4 && rankPosition <= 10) {
        await checkAndCompleteQuest(userId, '25', 'SEASON_RANK_TOP10');
        questAchievements.push({ userId, questId: '25', rank: rankPosition });
      }
    }

    console.log(`✅ 시즌 랭킹 계산 완료: ${rankings.length}명, ${questAchievements.length}개 퀘스트 달성`);

    // 4. 시즌 상태를 종료로 변경
    // TODO: 나중에 데이터베이스에서 시즌 상태를 관리하도록 변경
    // 현재는 환경변수로 관리
    process.env.SEASON_STATUS = 'ended';
    console.log(`📝 시즌 상태를 'ended'로 변경`);

    // 5. 시즌 종료 로그 기록
    console.log(`🎉 시즌 ${seasonName} 종료 완료`);
    console.log('📊 최종 랭킹:', rankings.slice(0, 10).map(r => ({ rank: r.rankPosition, username: r.user.username, score: r.score })));

    return NextResponse.json({
      success: true,
      message: `시즌 ${seasonName} 종료 처리 완료`,
      seasonName,
      totalRankings: rankings.length,
      questAchievements: questAchievements.length,
      topRankings: rankings.slice(0, 10).map(r => ({
        rank: r.rankPosition,
        username: r.user.username,
        score: r.score,
        level: r.level,
        lines: r.lines,
      })),
      seasonStatus: 'ended'
    });
  } catch (error) {
    console.error('시즌 종료 처리 실패:', error);
    return NextResponse.json({ error: '시즌 종료 처리에 실패했습니다.' }, { status: 500 });
  }
}

// 퀘스트 달성 체크 및 완료 처리
async function checkAndCompleteQuest(userId: string, questId: string, questTitle: string) {
  try {
    // 사용자의 게임 UUID 찾기
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { uuid: true },
    });

    if (!user) {
      console.error(`사용자를 찾을 수 없습니다: ${userId}`);
      return;
    }

    // 퀘스트 진행도 확인
    const questProgress = await prisma.questProgress.findUnique({
      where: {
        userId_catalogId: {
          userId: user.uuid,
          catalogId: questId,
        },
      },
    });

    if (questProgress && !questProgress.isCompleted) {
      // 퀘스트 완료 처리
      await prisma.questProgress.update({
        where: {
          userId_catalogId: {
            userId: user.uuid,
            catalogId: questId,
          },
        },
        data: {
          progress: 1,
          isCompleted: true,
          updatedAt: new Date(),
        },
      });

      console.log(`퀘스트 완료: ${questTitle} - 사용자: ${userId}`);
    }
  } catch (error) {
    console.error(`퀘스트 달성 체크 실패: ${questTitle} - ${userId}`, error);
  }
}
