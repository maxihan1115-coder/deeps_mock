import { NextRequest, NextResponse } from 'next/server';
import { mysqlGameStore } from '@/lib/mysql-store';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';
import { prisma } from '@/lib/prisma';
import { Quest } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { gameUuid, score, level, lines } = await request.json();

    if (!gameUuid || score === undefined || level === undefined || lines === undefined) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '게임 UUID, 점수, 레벨, 라인이 필요합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // gameUuid가 숫자인지 확인
    if (typeof gameUuid !== 'number' || !Number.isFinite(gameUuid)) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '게임 UUID는 숫자여야 합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 데이터 유효성 검사
    if (typeof score !== 'number' || typeof level !== 'number' || typeof lines !== 'number') {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '점수, 레벨, 라인은 숫자여야 합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    if (!Number.isFinite(score) || !Number.isFinite(level) || !Number.isFinite(lines)) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '점수, 레벨, 라인은 유효한 숫자여야 합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    if (score < 0 || level < 0 || lines < 0) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '점수, 레벨, 라인은 0 이상이어야 합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    console.log('🎮 게임오버 처리 시작:', { gameUuid, score, level, lines });

    // 1. 하이스코어 + 랭킹을 트랜잭션으로 저장 (동시 호출 안전)
    let isNewHighScore = false;
    await prisma.$transaction(async (tx) => {
      // HighScore 업서트(유니크 userId)
      const current = await tx.highScore.findUnique({ where: { userId: gameUuid } });
      if (!current) {
        try {
          await tx.highScore.create({ data: { userId: gameUuid, score, level, lines } });
          isNewHighScore = true; // 첫 기록이므로 새로운 최고 기록
        } catch (e) {
          // 유니크 충돌(P2002) 발생 시 동시 다른 트랜잭션이 먼저 생성한 것 → UPDATE로 폴백
          if ((e as { code?: string })?.code === 'P2002') {
            await tx.highScore.update({ where: { userId: gameUuid }, data: { score, level, lines } });
            isNewHighScore = true; // 첫 기록이므로 새로운 최고 기록
          } else {
            throw e;
          }
        }
      } else if (score > current.score) {
        await tx.highScore.update({ where: { userId: gameUuid }, data: { score, level, lines } });
        isNewHighScore = true; // 기존 기록보다 높으므로 새로운 최고 기록
      }

      // Ranking 업서트(유니크 userId+period+start)
      const user = await tx.user.findUnique({ where: { uuid: gameUuid }, select: { id: true } });
      if (!user) return;
      const periodStartDate = new Date('2025-01-01T00:00:00+09:00');
      const periodEndDate = new Date('2025-10-15T11:00:00+09:00');
      const existingRanking = await tx.ranking.findFirst({
        where: { userId: user.id, rankingPeriod: 'season', periodStartDate }
      });
      if (!existingRanking) {
        try {
          await tx.ranking.create({
            data: { userId: user.id, gameUuid: gameUuid, score, level, lines, rankingPeriod: 'season', periodStartDate, periodEndDate, rankPosition: 0 }
          });
        } catch (e) {
          // 동시 생성 충돌 시 UPDATE 폴백
          if ((e as { code?: string })?.code === 'P2002') {
            await tx.ranking.update({
              where: { id: (await tx.ranking.findFirst({ where: { userId: user.id, rankingPeriod: 'season', periodStartDate }, select: { id: true } }))!.id },
              data: { score, level, lines }
            });
          } else {
            throw e;
          }
        }
      } else if (score > existingRanking.score) {
        await tx.ranking.update({ where: { id: existingRanking.id }, data: { score, level, lines } });
      }
    });

    // 트랜잭션 이후 최신 하이스코어 조회하여 응답에 포함
    const highScoreResult = await prisma.highScore.findUnique({
      where: { userId: gameUuid },
      select: { score: true, level: true, lines: true, createdAt: true }
    });

    // 랭킹 정보 조회
    const user = await prisma.user.findUnique({ where: { uuid: gameUuid }, select: { id: true } });
    let rankingInfo = null;
    if (user) {
      const periodStartDate = new Date('2025-01-01T00:00:00+09:00');
      const currentRanking = await prisma.ranking.findFirst({
        where: { userId: user.id, rankingPeriod: 'season', periodStartDate },
        select: { score: true, level: true, lines: true }
      });

      if (currentRanking) {
        // 현재 순위 계산 (같은 점수 이상인 사용자 수)
        const currentRank = await prisma.ranking.count({
          where: { 
            rankingPeriod: 'season', 
            periodStartDate,
            score: { gte: currentRanking.score }
          }
        });

        // 전체 플레이어 수
        const totalPlayers = await prisma.ranking.count({
          where: { rankingPeriod: 'season', periodStartDate }
        });

        rankingInfo = {
          currentRank,
          totalPlayers
        };
      }
    }

    // 2. 골드 지급 (점수의 1/10)
    const earnedGold = Math.floor(score / 10);
    console.log('🪙 골드 지급 시작:', { score, earnedGold });
    
    let goldResult = null;
    if (earnedGold > 0) {
      try {
        const goldResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/currency/earn`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gameUuid,
            type: 'GOLD',
            amount: earnedGold,
            reason: '게임 플레이 보상',
            gameScore: score
          })
        });

        if (goldResponse.ok) {
          goldResult = await goldResponse.json();
          console.log('✅ 골드 지급 완료:', goldResult);
        } else {
          console.error('❌ 골드 지급 실패:', goldResponse.status);
        }
      } catch (error) {
        console.error('❌ 골드 지급 중 오류:', error);
      }
    }

    // 3. 플랫폼 연동 상태 확인 후 모든 관련 퀘스트 업데이트
    console.log('🎯 플랫폼 연동 상태 확인 및 퀘스트 업데이트 시작...');
    const questResults: { [key: string]: Quest | null } = {};
    
    try {
      const platformLink = await prisma.platformLink.findUnique({
        where: { gameUuid },
        select: { isActive: true }
      });

      if (platformLink && platformLink.isActive) {
        // 일일 게임 플레이 퀘스트 (9/10번) - 하이스코어와 무관하게 직접 카운트
        const dailyQuestResults = await Promise.all([
          mysqlGameStore.incrementQuestProgressDirectly(gameUuid, '9'),
          mysqlGameStore.incrementQuestProgressDirectly(gameUuid, '10')
        ]);
        questResults.quest9 = dailyQuestResults[0];
        questResults.quest10 = dailyQuestResults[1];

        // 점수/레벨/라인 관련 퀘스트 (1~8번) 업데이트
        const scoreLevelLineQuests = await Promise.all([
          // 1번: 첫 게임 플레이 (게임 수가 1개 이상이면 완료)
          mysqlGameStore.upsertQuestProgress(gameUuid, '1', 1),
          
          // 2번: 1000점 달성
          mysqlGameStore.upsertQuestProgress(gameUuid, '2', Math.min(score, 1000)),
          
          // 3번: 5000점 달성
          mysqlGameStore.upsertQuestProgress(gameUuid, '3', Math.min(score, 5000)),
          
          // 4번: 10000점 달성
          mysqlGameStore.upsertQuestProgress(gameUuid, '4', Math.min(score, 10000)),
          
          // 5번: 10라인 클리어 (누적 라인 수 조회 필요)
          (async () => {
            const totalLines = await prisma.highScore.aggregate({
              where: { userId: gameUuid },
              _sum: { lines: true }
            });
            return mysqlGameStore.upsertQuestProgress(gameUuid, '5', Math.min(totalLines._sum.lines || 0, 10));
          })(),
          
          // 6번: 50라인 클리어 (누적 라인 수 조회 필요)
          (async () => {
            const totalLines = await prisma.highScore.aggregate({
              where: { userId: gameUuid },
              _sum: { lines: true }
            });
            return mysqlGameStore.upsertQuestProgress(gameUuid, '6', Math.min(totalLines._sum.lines || 0, 50));
          })(),
          
          // 7번: 5레벨 달성
          mysqlGameStore.upsertQuestProgress(gameUuid, '7', Math.min(level, 5)),
          
          // 8번: 10레벨 달성
          mysqlGameStore.upsertQuestProgress(gameUuid, '8', Math.min(level, 10))
        ]);

        questResults.quest1 = scoreLevelLineQuests[0];
        questResults.quest2 = scoreLevelLineQuests[1];
        questResults.quest3 = scoreLevelLineQuests[2];
        questResults.quest4 = scoreLevelLineQuests[3];
        questResults.quest5 = await scoreLevelLineQuests[4];
        questResults.quest6 = await scoreLevelLineQuests[5];
        questResults.quest7 = scoreLevelLineQuests[6];
        questResults.quest8 = scoreLevelLineQuests[7];

        console.log('✅ 모든 퀘스트 업데이트 완료:', questResults);
      } else {
        console.log('⚠️ 플랫폼 미연동 상태 - 퀘스트 진행도 업데이트 건너뜀');
      }
    } catch (error) {
      console.error('❌ 퀘스트 업데이트 중 오류:', error);
    }

    // 4. 응답 데이터 구성
    const responseData = {
      highScore: highScoreResult || null,
      isNewHighScore: isNewHighScore,
      rankingInfo: rankingInfo,
      questUpdates: questResults,
      earnedGold: earnedGold,
      goldResult: goldResult,
      gameOver: {
        gameUuid,
        finalScore: score,
        finalLevel: level,
        finalLines: lines,
        timestamp: new Date().toISOString()
      }
    };

    console.log('🎉 게임오버 처리 완료:', responseData);

    const successResponse = createSuccessResponse(responseData);
    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('❌ 게임오버 처리 중 오류:', error);
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '게임오버 처리 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}
