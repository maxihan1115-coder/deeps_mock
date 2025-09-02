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

    // 현재 퀘스트 정보 조회
    let currentQuest = await mysqlGameStore.getQuestById(gameUuid, questId);
    
    // 퀘스트가 존재하지 않으면 초기 퀘스트 생성
    if (!currentQuest) {
      console.log(`퀘스트가 존재하지 않아 생성합니다: gameUuid=${gameUuid}, questId=${questId}`);
      
      // 퀘스트 정의 (QUEST_IDS와 매칭)
      const questDefinitions: Record<string, {title: string, maxProgress: number, reward: number, type: string}> = {
        '1': { title: '첫 게임 플레이', maxProgress: 1, reward: 10, type: 'once' },
        '2': { title: '1000점 달성', maxProgress: 1, reward: 20, type: 'once' },
        '3': { title: '5000점 달성', maxProgress: 1, reward: 50, type: 'once' },
        '4': { title: '10000점 달성', maxProgress: 1, reward: 100, type: 'once' },
        '5': { title: '10줄 제거', maxProgress: 10, reward: 30, type: 'once' },
        '6': { title: '50줄 제거', maxProgress: 50, reward: 100, type: 'once' },
        '7': { title: '레벨 5 달성', maxProgress: 1, reward: 40, type: 'once' },
        '8': { title: '레벨 10 달성', maxProgress: 1, reward: 80, type: 'once' },
        '9': { title: '5게임 플레이', maxProgress: 5, reward: 25, type: 'once' },
        '10': { title: '20게임 플레이', maxProgress: 20, reward: 100, type: 'once' },
        '11': { title: '하드 드롭 10회', maxProgress: 10, reward: 20, type: 'once' },
        '12': { title: '일일 로그인', maxProgress: 1, reward: 10, type: 'daily' }
      };
      
      const questDef = questDefinitions[questId];
      if (!questDef) {
        const errorResponse = createErrorResponse(
          API_ERROR_CODES.INVALID_QUEST,
          '존재하지 않는 퀘스트 ID'
        );
        return NextResponse.json(
          errorResponse,
          { status: getErrorStatusCode(API_ERROR_CODES.INVALID_QUEST) }
        );
      }
      
      // 새 퀘스트 생성
      currentQuest = await mysqlGameStore.createQuest(
        gameUuid, // userId → gameUuid
        questId,
        questDef.title,
        questDef.maxProgress,
        questDef.reward,
        questDef.type as 'once' | 'daily' | 'weekly'
      );
      
      if (!currentQuest) {
        const errorResponse = createErrorResponse(
          API_ERROR_CODES.SERVICE_UNAVAILABLE,
          '퀘스트 생성 중 오류가 발생했습니다.'
        );
        return NextResponse.json(
          errorResponse,
          { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
        );
      }
      
      console.log(`퀘스트 생성 완료: ${questDef.title}`);
    }

    // 퀘스트 초기화 확인 (daily, weekly 퀘스트만)
    if (currentQuest.type === 'daily' || currentQuest.type === 'weekly') {
      const shouldReset = shouldResetQuest(
        currentQuest.type, 
        currentQuest.lastResetTime
      );
      
      if (shouldReset) {
        // 퀘스트 초기화
        const resetData = resetQuestProgress(currentQuest.type.toLowerCase());
        const resetQuest = await mysqlGameStore.updateQuestProgress(
          gameUuid, // userId → gameUuid
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
    const updatedQuest = await mysqlGameStore.updateQuestProgress(gameUuid, questId, progress);

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
