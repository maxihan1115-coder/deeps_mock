import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuthToken } from '@/lib/auth-token';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';

async function handleQuestStart(request: NextRequest) {
  try {
    console.log('Quest start API called');
    
    const { uuid } = await request.json();
    console.log('Received UUID for quest start:', uuid);

    const parsedUuid = Number.parseInt(String(uuid), 10);

    // UUID 검증
    if (!Number.isFinite(parsedUuid)) {
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
    console.log('Looking for user with UUID:', parsedUuid);
    const user = await prisma.user.findUnique({
      where: { uuid: parsedUuid },
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

    // 플랫폼 연동 상태 확인
    const platformLink = await prisma.platformLink.findUnique({
      where: { gameUuid: user.uuid },
    });

    if (!platformLink) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '미연동 유저'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 현재 timestamp 생성
    const startDate = new Date();
    const timestamp = startDate.getTime();

    // 기존 참여 정보 확인
    const existingParticipation = await prisma.questParticipation.findFirst({
      where: { gameUuid: user.uuid },
    });

    if (existingParticipation) {
      // 기존 참여 정보 업데이트
      await prisma.questParticipation.update({
        where: { id: existingParticipation.id },
        data: {
          startDate,
          updatedAt: new Date(),
        },
      });
      console.log('Updated existing quest participation for user:', user.uuid);
    } else {
      // 새로운 참여 정보 생성
      await prisma.questParticipation.create({
        data: {
          gameUuid: user.uuid,
          startDate,
        },
      });
      console.log('Created new quest participation for user:', user.uuid);
    }

    console.log('Quest start completed for user:', user.uuid, 'Start date:', startDate);

    // 성공 응답
    const successResponse = createSuccessResponse({
      result: true,
      startDate: timestamp,
    });
    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('Quest start error:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '퀘스트 참여 시작 처리 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}

// BAPP_AUTH_TOKEN 검증과 함께 핸들러 실행
export const POST = withAuthToken(handleQuestStart);
