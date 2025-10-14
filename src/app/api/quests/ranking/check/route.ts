import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 랭킹 퀘스트 달성 체크
export async function POST(request: NextRequest) {
  try {
    const { userId, seasonName, periodStartDate, periodEndDate } = await request.json();

    if (!userId || !seasonName || !periodStartDate || !periodEndDate) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }

    // 사용자의 시즌 랭킹 조회
    const userRanking = await prisma.ranking.findFirst({
      where: {
        userId,
        rankingPeriod: 'season',
        periodStartDate: new Date(periodStartDate),
        periodEndDate: new Date(periodEndDate),
      },
    });

    if (!userRanking) {
      return NextResponse.json({ 
        message: '시즌 랭킹 데이터가 없습니다.',
        completedQuests: []
      });
    }

    const { rankPosition } = userRanking;
    const completedQuests = [];

    // 사용자의 게임 UUID 찾기
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { uuid: true },
    });

    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 1등 퀘스트 체크
    if (rankPosition === 1) {
      const quest = await checkAndCompleteQuest(user.uuid, '22', 'SEASON_RANK_1ST');
      if (quest) completedQuests.push(quest);
    }
    
    // 2등 퀘스트 체크
    if (rankPosition === 2) {
      const quest = await checkAndCompleteQuest(user.uuid, '23', 'SEASON_RANK_2ND');
      if (quest) completedQuests.push(quest);
    }
    
    // 3등 퀘스트 체크
    if (rankPosition === 3) {
      const quest = await checkAndCompleteQuest(user.uuid, '24', 'SEASON_RANK_3RD');
      if (quest) completedQuests.push(quest);
    }
    
    // 4~10등 퀘스트 체크
    if (rankPosition >= 4 && rankPosition <= 10) {
      const quest = await checkAndCompleteQuest(user.uuid, '25', 'SEASON_RANK_TOP10');
      if (quest) completedQuests.push(quest);
    }

    return NextResponse.json({
      success: true,
      rank: rankPosition,
      completedQuests,
    });
  } catch (error) {
    console.error('랭킹 퀘스트 달성 체크 실패:', error);
    return NextResponse.json({ error: '랭킹 퀘스트 달성 체크에 실패했습니다.' }, { status: 500 });
  }
}

// 퀘스트 달성 체크 및 완료 처리
async function checkAndCompleteQuest(gameUuid: number, questId: string, questTitle: string) {
  try {
    // 퀘스트 진행도 확인
    const questProgress = await prisma.questProgress.findUnique({
      where: {
        userId_catalogId: {
          userId: gameUuid,
          catalogId: questId,
        },
      },
    });

    if (questProgress && !questProgress.isCompleted) {
      // 퀘스트 완료 처리
      await prisma.questProgress.update({
        where: {
          userId_catalogId: {
            userId: gameUuid,
            catalogId: questId,
          },
        },
        data: {
          progress: 1,
          isCompleted: true,
          updatedAt: new Date(),
        },
      });

      return {
        questId,
        title: questTitle,
        completed: true,
      };
    }

    return null;
  } catch (error) {
    console.error(`퀘스트 달성 체크 실패: ${questTitle} - ${gameUuid}`, error);
    return null;
  }
}
