import { NextResponse } from 'next/server';
import { withAuthToken, AuthenticatedTokenRequest } from '@/lib/auth-token';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';

// 테트리스 게임에 맞는 퀘스트 목록 데이터
const QUEST_LIST = [
  {
    id: 1,
    title: "FIRST_GAME",
    totalTimes: 1
  },
  {
    id: 2,
    title: "SCORE_1000",
    totalTimes: 1
  },
  {
    id: 3,
    title: "SCORE_5000",
    totalTimes: 1
  },
  {
    id: 4,
    title: "SCORE_10000",
    totalTimes: 1
  },
  {
    id: 5,
    title: "CLEAR_LINES_10",
    totalTimes: 10
  },
  {
    id: 6,
    title: "CLEAR_LINES_50",
    totalTimes: 50
  },
  {
    id: 7,
    title: "REACH_LEVEL_5",
    totalTimes: 1
  },
  {
    id: 8,
    title: "REACH_LEVEL_10",
    totalTimes: 1
  },
  {
    id: 9,
    title: "PLAY_GAMES_5",
    totalTimes: 5
  },
  {
    id: 10,
    title: "PLAY_GAMES_20",
    totalTimes: 20
  },
  {
    id: 11,
    title: "HARD_DROP_10",
    totalTimes: 10
  },
  {
    id: 12,
    title: "DAILY_LOGIN",
    totalTimes: 7
  }
];

async function handleQuestList(request: AuthenticatedTokenRequest) {
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

// BAPP_AUTH_TOKEN 검증과 함께 핸들러 실행
export const GET = withAuthToken(handleQuestList);
