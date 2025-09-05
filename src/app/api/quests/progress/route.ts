import { NextRequest, NextResponse } from 'next/server';
import { mysqlGameStore } from '@/lib/mysql-store';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';

export async function POST(request: NextRequest) {
  try {
    const { gameUuid, questId, progress } = await request.json(); // userId → gameUuid

    if (!gameUuid || !questId || progress === undefined) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '게임 UUID, 퀘스트 ID, 진행도가 필요합니다.'
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

    // 일일 게임 플레이(9/10)는 서버에서 증분 처리 (KST 기준)
    let updatedQuest;
    if (questId === '9' || questId === '10') {
      updatedQuest = await mysqlGameStore.incrementDailyCatalogProgress(gameUuid, questId);
    } else {
      // 기타 퀘스트는 절대값 업데이트 유지
      updatedQuest = await mysqlGameStore.upsertQuestProgress(gameUuid, questId, progress);
    }
    if (!updatedQuest) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_QUEST,
        '존재하지 않는 퀘스트 ID'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_QUEST) }
      );
    }

    const successResponse = createSuccessResponse(updatedQuest);
    return NextResponse.json(successResponse);
  } catch (error) {
    console.error('Update quest progress error:', error);
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '퀘스트 진행도 업데이트 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}
