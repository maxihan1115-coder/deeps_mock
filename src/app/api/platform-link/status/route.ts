import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, getErrorStatusCode, API_ERROR_CODES } from '@/lib/api-errors';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameUuid = searchParams.get('gameUuid');
    
    if (!gameUuid) {
      return NextResponse.json(
        createErrorResponse(API_ERROR_CODES.INVALID_USER, 'gameUuid가 필요합니다.'),
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    const parsedGameUuid = Number.parseInt(gameUuid, 10);
    if (!Number.isFinite(parsedGameUuid)) {
      return NextResponse.json(
        createErrorResponse(API_ERROR_CODES.INVALID_USER, '유효하지 않은 gameUuid입니다.'),
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 병렬로 플랫폼 연동 상태와 유저 정보 확인
    const [platformLink, user] = await Promise.all([
      prisma.platformLink.findUnique({
        where: { gameUuid: parsedGameUuid },
        select: { isActive: true, linkedAt: true },
      }),
      prisma.user.findUnique({
        where: { uuid: parsedGameUuid },
        select: { startDate: true }
      })
    ]);

    const isLinked = Boolean(platformLink?.isActive) && Boolean(user?.startDate);
    const startDate = user?.startDate ? user.startDate.getTime() : null;
    
    const payload = { isLinked, startDate };
    return NextResponse.json(createSuccessResponse(payload));
  } catch (error) {
    console.error('Platform link status error:', error);
    return NextResponse.json(
      createErrorResponse(API_ERROR_CODES.SERVICE_UNAVAILABLE, '플랫폼 연동 상태 확인 중 오류가 발생했습니다.'),
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}
