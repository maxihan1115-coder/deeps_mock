import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiAuth, AuthenticatedRequest } from '@/lib/api-auth';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';
import jwt from 'jsonwebtoken';

async function handleQuestConnect(request: AuthenticatedRequest) {
  try {
    console.log('Quest connect API called');
    
    const { uuid } = await request.json();
    console.log('Received UUID:', uuid);

    // UUID 검증
    if (!uuid) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '게임 내 유저 고유 ID가 필요합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 사용자 존재 여부 확인
    console.log('Looking for user with UUID:', uuid.toString());
    const user = await prisma.user.findUnique({
      where: { uuid: uuid.toString() },
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

    // 이미 연동된 사용자인지 확인
    const existingPlatformLink = await prisma.platformLink.findUnique({
      where: { gameUuid: user.uuid },
    });

    if (existingPlatformLink) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '이미 연동된 유저'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 재연동 방지: 이전에 해제된 이력이 있는지 확인
    const disconnectHistory = await prisma.platformLinkHistory.findFirst({
      where: {
        gameUuid: user.uuid,
        action: 'DISCONNECT',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (disconnectHistory) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '재연동이 불가능한 유저'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // JWT 토큰 생성
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.SERVICE_UNAVAILABLE,
        'JWT_SECRET이 설정되지 않았습니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
      );
    }

    const authToken = jwt.sign(
      {
        gameUuid: user.uuid,
        platformType: 'BAPP',
        platformUuid: `bapp_${uuid}`,
      },
      secret,
      { expiresIn: '3y' } // 3년 만료
    );

    console.log('Generated JWT auth token for user:', user.uuid);

    // 연동 완료 처리
    // BApp에서 연동 완료를 알려주므로, 플랫폼 연동 정보를 생성
    const platformLink = await prisma.platformLink.create({
      data: {
        gameUuid: user.uuid,
        platformUuid: `bapp_${uuid}`, // BApp에서 제공한 UUID
        platformType: 'BAPP',
        linkedAt: new Date(),
        isActive: true,
      },
    });

    // 연동 이력에 기록 추가
    await prisma.platformLinkHistory.create({
      data: {
        gameUuid: user.uuid,
        platformUuid: `bapp_${uuid}`,
        platformType: 'BAPP',
        action: 'CONNECT',
        linkedAt: platformLink.linkedAt,
      },
    });

    console.log('Quest connection completed for user:', user.uuid, 'Platform link created:', platformLink.id);

    // 성공 응답 (JWT 토큰 포함)
    const successResponse = createSuccessResponse({
      authToken: authToken,
      gameUuid: user.uuid,
      platformType: 'BAPP',
      expiresIn: '3y',
      message: '플랫폼 연동이 완료되었습니다.'
    });
    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('Quest connect error:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '퀘스트 연동 처리 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}

// API 키 검증과 함께 핸들러 실행
export const POST = withApiAuth(handleQuestConnect);
