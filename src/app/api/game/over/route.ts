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

    // 2. 플랫폼 연동 상태 확인 후 일일 게임 플레이 퀘스트 업데이트 (9/10번)
    console.log('🎯 플랫폼 연동 상태 확인 및 퀘스트 업데이트 시작...');
    let questResults: (Quest | null)[] = [null, null];
    
    try {
      const platformLink = await prisma.platformLink.findUnique({
        where: { gameUuid },
        select: { isActive: true }
      });

      if (platformLink && platformLink.isActive) {
        questResults = await Promise.all([
          mysqlGameStore.incrementDailyCatalogProgress(gameUuid, '9'),
          mysqlGameStore.incrementDailyCatalogProgress(gameUuid, '10')
        ]);
        console.log('✅ 일일 퀘스트 업데이트 완료:', questResults);
      } else {
        console.log('⚠️ 플랫폼 미연동 상태 - 퀘스트 진행도 업데이트 건너뜀');
      }
    } catch (error) {
      console.error('❌ 퀘스트 업데이트 중 오류:', error);
    }

    // 3. 응답 데이터 구성
    const responseData = {
      highScore: highScoreResult,
      questUpdates: {
        quest9: questResults[0],
        quest10: questResults[1]
      },
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
