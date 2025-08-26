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

    // 연동 상태 조회
    const platformLink = await prisma.platformLink.findUnique({
      where: { gameUuid },
    });

    const status = {
      isLinked: !!platformLink && platformLink.isActive,
      platformType: platformLink?.platformType || null,
      linkedAt: platformLink?.linkedAt || null,
      isActive: platformLink?.isActive || false,
    };

    const successResponse = createSuccessResponse(status);
    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('Platform link status check error:', error);
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '플랫폼 연동 상태 확인 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}
