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

    // 1. 하이스코어 저장
    console.log('💾 하이스코어 저장 시작...');
    const highScoreResult = await mysqlGameStore.saveHighScore(gameUuid, score, level, lines);
    console.log('✅ 하이스코어 저장 완료:', highScoreResult);

    // 2. 플랫폼 연동 상태 확인 후 모든 관련 퀘스트 업데이트
    console.log('🎯 플랫폼 연동 상태 확인 및 퀘스트 업데이트 시작...');
    const questResults: { [key: string]: Quest | null } = {};
    
    try {
      const platformLink = await prisma.platformLink.findUnique({
        where: { gameUuid },
        select: { isActive: true }
      });

      if (platformLink && platformLink.isActive) {
        // 일일 게임 플레이 퀘스트 (9/10번)
        const dailyQuestResults = await Promise.all([
          mysqlGameStore.incrementDailyCatalogProgress(gameUuid, '9'),
          mysqlGameStore.incrementDailyCatalogProgress(gameUuid, '10')
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

    // 3. 응답 데이터 구성
    const responseData = {
      highScore: highScoreResult,
      questUpdates: questResults,
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
