import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameUuid = searchParams.get('gameUuid');

    if (!gameUuid) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '게임 UUID가 필요합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 연동 이력 조회
    const history = await prisma.platformLinkHistory.findMany({
      where: { gameUuid: parseInt(gameUuid) },
      orderBy: { createdAt: 'desc' },
    });

    // 재연동 가능 여부 확인
    const lastDisconnect = history.find(h => h.action === 'DISCONNECT');
    const canReconnect = !lastDisconnect;

    const result = {
      gameUuid: parseInt(gameUuid),
      canReconnect,
      history: history.map(h => ({
        id: h.id,
        platformUuid: h.platformUuid,
        platformType: h.platformType,
        action: h.action,
        linkedAt: h.linkedAt,
        disconnectedAt: h.disconnectedAt,
        createdAt: h.createdAt,
      })),
      lastDisconnect: lastDisconnect ? {
        disconnectedAt: lastDisconnect.disconnectedAt,
        createdAt: lastDisconnect.createdAt,
      } : null,
    };

    const successResponse = createSuccessResponse(result);
    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('Platform link history check error:', error);
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '플랫폼 연동 이력 확인 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}
