import { NextRequest, NextResponse } from 'next/server';
import { mysqlGameStore } from '@/lib/mysql-store';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';
import { shouldResetQuest, resetQuestProgress } from '@/lib/quest-utils';

export async function POST(request: NextRequest) {
  try {
    const { userId, questId, progress } = await request.json();

    if (!userId || !questId || progress === undefined) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '사용자 ID, 퀘스트 ID, 진행도가 필요합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 현재 퀘스트 정보 조회
    const currentQuest = await mysqlGameStore.getQuestById(userId, questId);
    
    if (!currentQuest) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_QUEST,
        '존재하지 않는 퀘스트 ID'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_QUEST) }
      );
    }

    // 퀘스트 초기화 확인 (daily, weekly 퀘스트만)
    if (currentQuest.type === 'DAILY' || currentQuest.type === 'WEEKLY') {
      const shouldReset = shouldResetQuest(
        currentQuest.type.toLowerCase(), 
        currentQuest.lastResetTime
      );
      
      if (shouldReset) {
        // 퀘스트 초기화
        const resetData = resetQuestProgress(currentQuest.type.toLowerCase());
        const resetQuest = await mysqlGameStore.updateQuestProgress(
          userId, 
          questId, 
          resetData.progress,
          resetData.lastResetTime
        );
        
        if (resetQuest) {
          console.log(`퀘스트 초기화 완료: ${currentQuest.title} (${currentQuest.type})`);
        }
      }
    }

    // 퀘스트 진행도 업데이트
    const updatedQuest = await mysqlGameStore.updateQuestProgress(userId, questId, progress);

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
