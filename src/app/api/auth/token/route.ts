import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuthToken, AuthenticatedTokenRequest } from '@/lib/auth-token';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';

async function handleGetUserInfo(request: AuthenticatedTokenRequest) {
  try {
    console.log('Get user info by JWT token API called');
    
    const gameUuid = request.gameUuid;
    const platformType = request.platformType;
    console.log('Game UUID from JWT token:', gameUuid, 'Platform type:', platformType);

    if (!gameUuid) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '유효하지 않은 JWT 토큰입니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { uuid: gameUuid },
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
      where: { gameUuid: gameUuid },
      select: {
        platformUuid: true,
        platformType: true,
        linkedAt: true,
        isActive: true,
      },
    });

    console.log('User info retrieved for gameUuid:', gameUuid);

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
      tokenInfo: {
        gameUuid: gameUuid,
        platformType: platformType,
      },
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

// JWT Auth token 검증과 함께 핸들러 실행
export const GET = withAuthToken(handleGetUserInfo);
