import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiAuth, AuthenticatedRequest } from '@/lib/api-auth';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';

async function handleQuestDisconnect(request: AuthenticatedRequest) {
  try {
    console.log('Quest disconnect API called');
    
    const { uuid } = await request.json();
    console.log('Received UUID for disconnect:', uuid);

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

    // 현재 연동 상태 확인
    const currentPlatformLink = await prisma.platformLink.findUnique({
      where: { gameUuid: user.uuid },
    });

    if (!currentPlatformLink) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '이미 해제된 유저'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 연동 해제 처리
    console.log('Processing disconnect for user:', user.uuid);
    
    // 1. 연동 이력에 해제 기록 추가
    await prisma.platformLinkHistory.create({
      data: {
        gameUuid: user.uuid,
        platformUuid: currentPlatformLink.platformUuid,
        platformType: currentPlatformLink.platformType,
        action: 'DISCONNECT',
        linkedAt: currentPlatformLink.linkedAt,
        disconnectedAt: new Date(),
      },
    });

    // 2. 현재 연동 정보 삭제
    await prisma.platformLink.delete({
      where: { gameUuid: user.uuid },
    });

    console.log('Quest disconnect completed for user:', user.uuid);

    // 성공 응답
    const successResponse = createSuccessResponse(null);
    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('Quest disconnect error:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '퀘스트 연동 해제 처리 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}

// API 키 검증과 함께 핸들러 실행
export const POST = withApiAuth(handleQuestDisconnect);
