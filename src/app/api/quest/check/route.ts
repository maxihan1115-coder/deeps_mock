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
    koreanTitle: "첫 게임 플레이",
    totalTimes: 1,
    type: "game_count"
  },
  {
    id: 2,
    title: "SCORE_1000",
    koreanTitle: "1000점 달성",
    totalTimes: 1000,
    type: "max_score"
  },
  {
    id: 3,
    title: "SCORE_5000",
    koreanTitle: "5000점 달성",
    totalTimes: 5000,
    type: "max_score"
  },
  {
    id: 4,
    title: "SCORE_10000",
    koreanTitle: "10000점 달성",
    totalTimes: 10000,
    type: "max_score"
  },
  {
    id: 5,
    title: "CLEAR_LINES_10",
    koreanTitle: "10라인 클리어",
    totalTimes: 10,
    type: "total_lines"
  },
  {
    id: 6,
    title: "CLEAR_LINES_50",
    koreanTitle: "50라인 클리어",
    totalTimes: 50,
    type: "total_lines"
  },
  {
    id: 7,
    title: "REACH_LEVEL_5",
    koreanTitle: "5레벨 달성",
    totalTimes: 5,
    type: "max_level"
  },
  {
    id: 8,
    title: "REACH_LEVEL_10",
    koreanTitle: "10레벨 달성",
    totalTimes: 10,
    type: "max_level"
  },
  {
    id: 9,
    title: "PLAY_GAMES_5",
    koreanTitle: "5회 게임 플레이",
    totalTimes: 5,
    type: "game_count"
  },
  {
    id: 10,
    title: "PLAY_GAMES_20",
    koreanTitle: "20회 게임 플레이",
    totalTimes: 20,
    type: "game_count"
  },
  {
    id: 11,
    title: "HARD_DROP_10",
    koreanTitle: "하드드롭 10회",
    totalTimes: 10,
    type: "hard_drop"  // TODO: 하드드롭 데이터 추가 필요
  },
  {
    id: 12,
    title: "DAILY_LOGIN",
    koreanTitle: "일일 로그인 7일",
    totalTimes: 7,
    type: "daily_login"  // TODO: 출석 데이터 기반
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

    // 사용자의 실제 게임 데이터 조회
    console.log('🎮 사용자의 실제 게임 데이터를 조회합니다...');
    
    // 하이스코어 데이터에서 게임 통계 계산
    const gameStats = await prisma.highScore.aggregate({
      where: { userId: user.id },
      _count: { id: true },  // 총 게임 횟수
      _max: { 
        score: true,  // 최고 점수
        level: true   // 최고 레벨
      },
      _sum: { 
        lines: true   // 총 라인 수
      }
    });

    // 출석 데이터 조회 (일일 로그인 퀘스트용)
    const attendanceCount = await prisma.attendanceRecord.count({
      where: { userId: user.id }
    });

    console.log('📊 게임 통계:', {
      totalGames: gameStats._count.id,
      maxScore: gameStats._max.score || 0,
      maxLevel: gameStats._max.level || 0,
      totalLines: gameStats._sum.lines || 0,
      attendanceDays: attendanceCount
    });

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

      // 퀘스트 타입에 따른 현재 진행도 계산
      let currentTimes = 0;
      
      switch (questInfo.type) {
        case 'game_count':
          currentTimes = gameStats._count.id || 0;
          break;
        case 'max_score':
          currentTimes = gameStats._max.score || 0;
          break;
        case 'max_level':
          currentTimes = gameStats._max.level || 0;
          break;
        case 'total_lines':
          currentTimes = gameStats._sum.lines || 0;
          break;
        case 'daily_login':
          currentTimes = attendanceCount;
          break;
        case 'hard_drop':
          // TODO: 하드드롭 데이터가 추가되면 구현
          currentTimes = 0;
          break;
        default:
          currentTimes = 0;
      }

      // 달성 여부 계산
      const complete = currentTimes >= questInfo.totalTimes;

      console.log(`🎯 Quest ${questId} (${questInfo.title}): ${currentTimes}/${questInfo.totalTimes} - ${complete ? '✅' : '❌'}`);

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
