import { NextRequest, NextResponse } from 'next/server';
import { mysqlGameStore } from '@/lib/mysql-store';
import { prisma } from '@/lib/prisma';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';

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
    const quests = await mysqlGameStore.getCatalogWithProgress(parsedGameUuid);
    console.log('Retrieved quests for gameUuid:', parsedGameUuid, 'count:', quests.length);

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
