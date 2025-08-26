import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';

export async function POST(request: NextRequest) {
  try {
    const { gameUuid } = await request.json();

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

    // 연동 정보 조회
    const platformLink = await prisma.platformLink.findUnique({
      where: { gameUuid: parseInt(gameUuid) },
    });

    if (!platformLink) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '연동 정보를 찾을 수 없습니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 연동 해제 (isActive를 false로 설정)
    const updatedPlatformLink = await prisma.platformLink.update({
      where: { gameUuid: parseInt(gameUuid) },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    console.log('Platform unlinked for gameUuid:', gameUuid);

    const successResponse = createSuccessResponse({
      id: updatedPlatformLink.id,
      gameUuid: updatedPlatformLink.gameUuid,
      platformUuid: updatedPlatformLink.platformUuid,
      platformType: updatedPlatformLink.platformType,
      linkedAt: updatedPlatformLink.linkedAt,
      isActive: updatedPlatformLink.isActive,
      unlinkedAt: updatedPlatformLink.updatedAt,
    });
    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('Platform unlink error:', error);
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '플랫폼 연동 해제 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}
