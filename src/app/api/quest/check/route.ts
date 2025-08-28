import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuthToken } from '@/lib/auth-token';
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

async function handleQuestCheck(request: NextRequest) {
  try {
    console.log('Quest check API called');
    
    const { uuid, questIds } = await request.json();
    console.log('Received UUID:', uuid, 'Quest IDs:', questIds);

    const parsedUuid = Number.parseInt(String(uuid), 10);

    // UUID 검증
    if (!Number.isFinite(parsedUuid)) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '게임 내 유저 고유 ID가 필요합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // questIds 검증
    if (!questIds || !Array.isArray(questIds) || questIds.length === 0) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_QUEST,
        '퀘스트 ID 목록이 필요합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_QUEST) }
      );
    }

    // 사용자 존재 여부 확인
    console.log('Looking for user with UUID:', parsedUuid);
    const user = await prisma.user.findUnique({
      where: { uuid: parsedUuid },
    });
    console.log('Found user:', user ? 'Yes' : 'No');

    if (!user) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '존재하지 않는 유저'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 플랫폼 연동 상태 확인
    const platformLink = await prisma.platformLink.findUnique({
      where: { gameUuid: user.uuid },
    });

    if (!platformLink) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '미연동 유저'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 퀘스트 달성 여부 조회
    const questResults = [];
    
    for (const questId of questIds) {
      // 퀘스트 정보 확인
      const questInfo = QUEST_LIST.find(q => q.id === questId);
      
      if (!questInfo) {
        const errorResponse = createErrorResponse(
          API_ERROR_CODES.INVALID_QUEST,
          '존재하지 않는 퀘스트 ID'
        );
        return NextResponse.json(
          errorResponse,
          { status: getErrorStatusCode(API_ERROR_CODES.INVALID_QUEST) }
        );
      }

      // 사용자의 퀘스트 진행도 조회 (실제로는 데이터베이스에서 조회)
      let currentTimes = 0;
      
      // 예시: 사용자별 퀘스트 진행도 (실제로는 데이터베이스에서 관리)
      const userQuestProgress = await prisma.quest.findMany({
        where: { 
          userId: user.id,
          title: questInfo.title 
        },
      });

      if (userQuestProgress.length > 0) {
        currentTimes = userQuestProgress[0].progress;
      }

      // 달성 여부 계산
      const complete = currentTimes >= questInfo.totalTimes;

      questResults.push({
        id: questId,
        totalTimes: questInfo.totalTimes,
        currentTimes: currentTimes,
        complete: complete
      });
    }

    console.log('Quest check completed for user:', user.uuid, 'Results:', questResults);

    // 성공 응답
    const successResponse = createSuccessResponse(questResults);
    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('Quest check error:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '퀘스트 달성 여부 조회 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}

// BAPP_AUTH_TOKEN 검증과 함께 핸들러 실행
export const POST = withAuthToken(handleQuestCheck);
