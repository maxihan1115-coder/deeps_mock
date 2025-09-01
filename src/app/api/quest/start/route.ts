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
    const { uuid } = await request.json();
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

    // 병렬로 사용자 존재 여부와 플랫폼 연동 상태 확인
    const [user, platformLink] = await Promise.all([
      prisma.user.findUnique({
        where: { uuid: parsedUuid },
        select: { id: true, uuid: true } // 필요한 필드만 선택
      }),
      prisma.platformLink.findUnique({
        where: { gameUuid: parsedUuid },
        select: { isActive: true } // 필요한 필드만 선택
      })
    ]);

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

    if (!platformLink || !platformLink.isActive) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '미연동 유저'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 최적화된 참여 정보 처리 (인덱스 활용으로 빠른 조회)
    const startDate = new Date();
    
    // 기존 참여 정보 확인 (인덱스로 빠른 조회)
    const existingParticipation = await prisma.questParticipation.findFirst({
      where: { gameUuid: parsedUuid },
      select: { id: true } // 필요한 필드만 선택
    });

    let participation;
    if (existingParticipation) {
      // 기존 참여 정보 업데이트
      participation = await prisma.questParticipation.update({
        where: { id: existingParticipation.id },
        data: {
          startDate,
          updatedAt: new Date(),
        },
      });
    } else {
      // 새로운 참여 정보 생성
      participation = await prisma.questParticipation.create({
        data: {
          gameUuid: parsedUuid,
          startDate,
        },
      });
    }

    // 성공 응답
    const successResponse = createSuccessResponse({
      result: true,
      startDate: startDate.getTime(),
    });
    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('Quest start error:', error instanceof Error ? error.message : error);
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
