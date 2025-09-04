import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';

// 플랫폼에서 퀘스트 보상 정보 가져오기
async function fetchPlatformRewards() {
  try {
    const requestHeaders = {
      'Accept': 'application/json',
      'Accept-Language': 'en'
    };
    
    const platformResponse = await fetch('https://papi.boradeeps.cc/v1/quest/10006', {
      method: 'GET',
      headers: requestHeaders,
    });

    if (platformResponse.ok) {
      const platformData = await platformResponse.json();
      
      if (platformData.success && platformData.payload) {
        return platformData.payload;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

// 실시간 퀘스트 진행도 계산 함수
async function getRealTimeQuestProgress(gameUuid: number) {
  // 퀘스트 카탈로그 정의 (quest/check와 동일)
  const QUEST_CATALOG = [
    {
      id: '1',
      title: '첫 게임 플레이',
      description: '첫 번째 게임을 플레이하세요',
      type: 'single' as const,
      maxProgress: 1,
      reward: '경험치 100',
      platformTitle: 'FIRST_GAME'
    },
    {
      id: '2',
      title: '1000점 달성',
      description: '1000점을 달성하세요',
      type: 'single' as const,
      maxProgress: 1000,
      reward: '경험치 200',
      platformTitle: 'SCORE_1000'
    },
    {
      id: '3',
      title: '5000점 달성',
      description: '5000점을 달성하세요',
      type: 'single' as const,
      maxProgress: 5000,
      reward: '경험치 300',
      platformTitle: 'SCORE_5000'
    },
    {
      id: '4',
      title: '10000점 달성',
      description: '10000점을 달성하세요',
      type: 'single' as const,
      maxProgress: 10000,
      reward: '경험치 500',
      platformTitle: 'SCORE_10000'
    },
    {
      id: '5',
      title: '10라인 클리어',
      description: '총 10라인을 클리어하세요',
      type: 'single' as const,
      maxProgress: 10,
      reward: '경험치 150',
      platformTitle: 'CLEAR_LINES_10'
    },
    {
      id: '6',
      title: '50라인 클리어',
      description: '총 50라인을 클리어하세요',
      type: 'single' as const,
      maxProgress: 50,
      reward: '경험치 300',
      platformTitle: 'CLEAR_LINES_50'
    },
    {
      id: '7',
      title: '5레벨 달성',
      description: '5레벨에 도달하세요',
      type: 'single' as const,
      maxProgress: 5,
      reward: '경험치 200',
      platformTitle: 'REACH_LEVEL_5'
    },
    {
      id: '8',
      title: '10레벨 달성',
      description: '10레벨에 도달하세요',
      type: 'single' as const,
      maxProgress: 10,
      reward: '경험치 400',
      platformTitle: 'REACH_LEVEL_10'
    },
    {
      id: '9',
      title: '5회 게임 플레이',
      description: '총 5회 게임을 플레이하세요',
      type: 'single' as const,
      maxProgress: 5,
      reward: '경험치 200',
      platformTitle: 'PLAY_GAMES_5'
    },
    {
      id: '10',
      title: '20회 게임 플레이',
      description: '총 20회 게임을 플레이하세요',
      type: 'single' as const,
      maxProgress: 20,
      reward: '경험치 500',
      platformTitle: 'PLAY_GAMES_20'
    },
    {
      id: '12',
      title: '일일 로그인 7일',
      description: '7일 연속으로 로그인하세요',
      type: 'daily' as const,
      maxProgress: 7,
      reward: '경험치 100',
      platformTitle: 'DAILY_LOGIN'
    }
  ];

  try {
    // 플랫폼 보상 정보 가져오기
    const platformRewards = await fetchPlatformRewards();
    
    // 실시간 데이터로 진행도 계산
    const [highScoreResult, attendanceCount] = await Promise.all([
      prisma.highScore.aggregate({
        where: { userId: gameUuid },
        _sum: { score: true, level: true, lines: true },
        _count: true
      }),
      prisma.attendanceRecord.count({
        where: { userId: gameUuid }
      })
    ]);

    const quests = QUEST_CATALOG.map(quest => {
      let progress = 0;

      switch (quest.id) {
        case '1': // 첫 게임 플레이
          progress = highScoreResult._count > 0 ? 1 : 0;
          break;
        case '2': // 1000점 달성
          progress = Math.min(highScoreResult._sum.score || 0, 1000);
          break;
        case '3': // 5000점 달성
          progress = Math.min(highScoreResult._sum.score || 0, 5000);
          break;
        case '4': // 10000점 달성
          progress = Math.min(highScoreResult._sum.score || 0, 10000);
          break;
        case '5': // 10라인 클리어
          progress = Math.min(highScoreResult._sum.lines || 0, 10);
          break;
        case '6': // 50라인 클리어
          progress = Math.min(highScoreResult._sum.lines || 0, 50);
          break;
        case '7': // 5레벨 달성
          progress = Math.min(highScoreResult._sum.level || 0, 5);
          break;
        case '8': // 10레벨 달성
          progress = Math.min(highScoreResult._sum.level || 0, 10);
          break;
        case '9': // 5회 게임 플레이
          progress = Math.min(highScoreResult._count, 5);
          break;
        case '10': // 20회 게임 플레이
          progress = Math.min(highScoreResult._count, 20);
          break;
        case '12': // 일일 로그인 7일
          progress = Math.min(attendanceCount, 7);
          break;
        default:
          progress = 0;
      }

      // 플랫폼 보상 정보 매핑
      let claimValue = undefined;
      let claimSymbol = undefined;
      
      if (platformRewards) {
        const platformQuest = platformRewards.find((pq: { title: string; claimValue: string; claimSymbol: string }) => pq.title === quest.platformTitle);
        if (platformQuest) {
          claimValue = platformQuest.claimValue;
          claimSymbol = platformQuest.claimSymbol;
        }
      }

      return {
        id: quest.id,
        title: quest.title,
        description: quest.description,
        type: quest.type,
        progress: progress,
        maxProgress: quest.maxProgress,
        reward: quest.reward,
        isCompleted: progress >= quest.maxProgress,
        expiresAt: undefined,
        createdAt: new Date(),
        // 플랫폼 보상 정보 추가
        claimValue,
        claimSymbol
      };
    });

    return quests;
  } catch (error) {
    console.error('실시간 퀘스트 진행도 계산 중 오류:', error);
    // 오류 발생 시 빈 배열 반환
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    // Prisma 클라이언트 검증
    if (!prisma) {
      console.error('Prisma client is not initialized');
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.SERVICE_UNAVAILABLE,
        '데이터베이스 연결 오류'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
      );
    }

    const { searchParams } = new URL(request.url);
    const gameUuid = searchParams.get('gameUuid');
    const userId = searchParams.get('userId'); // fallback

    console.log('Quest API called with gameUuid:', gameUuid, 'userId:', userId);

    let parsedGameUuid: number;

    if (gameUuid) {
      // gameUuid가 있으면 우선 사용
      parsedGameUuid = Number.parseInt(gameUuid, 10);
    } else if (userId) {
      // userId가 있으면 사용자 정보에서 uuid 추출
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { uuid: true }
      });
      
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
      parsedGameUuid = user.uuid;
    } else {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        'gameUuid 또는 userId가 필요합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    if (!Number.isFinite(parsedGameUuid)) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '유효하지 않은 gameUuid입니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 카탈로그 방식: 연동 상태와 무관하게 퀘스트 목록 제공
    // const quests = await mysqlGameStore.getCatalogWithProgress(parsedGameUuid);
    
    // 실시간 데이터로 퀘스트 진행도 계산 (quest/check와 동일한 로직)
    const quests = await getRealTimeQuestProgress(parsedGameUuid);
    
    console.log('Retrieved real-time quests for gameUuid:', parsedGameUuid, 'count:', quests.length);
    
    // 플랫폼 보상 정보 로깅
    quests.forEach(quest => {
      if (quest.claimValue && quest.claimSymbol) {
        console.log(`🎁 퀘스트 ${quest.id} 플랫폼 보상:`, {
          title: quest.title,
          claimValue: quest.claimValue,
          claimSymbol: quest.claimSymbol
        });
      } else {
        console.log(`📝 퀘스트 ${quest.id} 기본 보상:`, {
          title: quest.title,
          reward: quest.reward
        });
      }
    });

    // 퀘스트 참여 정보 조회 (연동된 유저만)
    const [platformLink, participation] = await Promise.all([
      prisma.platformLink.findUnique({
        where: { gameUuid: parsedGameUuid },
        select: { isActive: true }
      }),
      prisma.questParticipation.findFirst({
        where: { gameUuid: parsedGameUuid },
        select: { startDate: true }
      })
    ]);

    const isLinked = Boolean(platformLink?.isActive);
    
    const result = {
      quests,
      isLinked,
      participation: participation ? {
        isParticipating: true,
        startDate: participation.startDate.getTime(),
        startDateFormatted: participation.startDate.toISOString(),
      } : {
        isParticipating: false,
        startDate: null,
        startDateFormatted: null,
      },
    };

    const successResponse = createSuccessResponse(result);
    return NextResponse.json(successResponse);
  } catch (error) {
    console.error('Get quests error:', error);
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '퀘스트 조회 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}
