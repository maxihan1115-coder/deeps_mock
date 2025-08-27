import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuthToken } from '@/lib/auth-token';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';

async function handleGetUserInfo(request: NextRequest) {
  try {
    console.log('Get user info by API Key API called');
    
    // URL 파라미터에서 gameUuid 추출
    const url = new URL(request.url);
    const gameUuid = url.searchParams.get('gameUuid');
    
    console.log('Game UUID from URL parameter:', gameUuid);

    if (!gameUuid) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        'gameUuid 파라미터가 필요합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // gameUuid를 숫자로 변환
    const gameUuidNumber = parseInt(gameUuid);
    if (isNaN(gameUuidNumber)) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '유효하지 않은 gameUuid 형식입니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { uuid: gameUuidNumber },
      select: {
        id: true,
        username: true,
        uuid: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '존재하지 않는 유저입니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 플랫폼 연동 정보 조회
    const platformLink = await prisma.platformLink.findUnique({
      where: { gameUuid: gameUuidNumber },
      select: {
        platformUuid: true,
        platformType: true,
        linkedAt: true,
        isActive: true,
      },
    });

    console.log('User info retrieved for gameUuid:', gameUuidNumber);

    // 성공 응답
    const successResponse = createSuccessResponse({
      user: {
        id: user.id,
        username: user.username,
        uuid: user.uuid,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      platformLink: platformLink ? {
        platformUuid: platformLink.platformUuid,
        platformType: platformLink.platformType,
        linkedAt: platformLink.linkedAt,
        isActive: platformLink.isActive,
      } : null,
    });
    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('Get user info error:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '사용자 정보 조회 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}

// API Key 검증과 함께 핸들러 실행
export const GET = withAuthToken(handleGetUserInfo);
