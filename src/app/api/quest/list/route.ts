import { NextResponse } from 'next/server';
import { withApiAuth, AuthenticatedRequest } from '@/lib/api-auth';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';

// 퀘스트 목록 데이터 (실제로는 데이터베이스에서 관리)
const QUEST_LIST = [
  {
    id: 1,
    title: "GET_EPIC_PLAYER",
    totalTimes: 2
  },
  {
    id: 2,
    title: "ENTER_POST_SEASON",
    totalTimes: 1
  },
  {
    id: 3,
    title: "USE_LEAGUE_STRATEGY_CARD",
    totalTimes: 10
  },
  {
    id: 4,
    title: "LEARN_MANAGER_SKILL_BLOCK_6",
    totalTimes: 1
  },
  {
    id: 5,
    title: "WEEKLY_MISSION_CLEAR",
    totalTimes: 2
  },
  {
    id: 6,
    title: "DAILY_LOGIN",
    totalTimes: 7
  },
  {
    id: 7,
    title: "WIN_GAMES",
    totalTimes: 5
  },
  {
    id: 8,
    title: "COMPLETE_TUTORIAL",
    totalTimes: 1
  }
];

async function handleQuestList(request: AuthenticatedRequest) {
  try {
    console.log('Quest list API called');

    // 성공 응답 - 퀘스트 목록 반환
    const successResponse = createSuccessResponse(QUEST_LIST);
    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('Quest list error:', error);
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '퀘스트 목록 조회 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}

// API 키 검증과 함께 핸들러 실행
export const GET = withApiAuth(handleQuestList);
