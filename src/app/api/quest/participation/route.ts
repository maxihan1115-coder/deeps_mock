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

    // 퀘스트 참여 정보 조회
    const participation = await prisma.questParticipation.findFirst({
      where: { gameUuid: parseInt(gameUuid) },
    });

    const result = {
      gameUuid: parseInt(gameUuid),
      isParticipating: !!participation,
      startDate: participation?.startDate ? participation.startDate.getTime() : null,
      startDateFormatted: participation?.startDate ? participation.startDate.toISOString() : null,
      createdAt: participation?.createdAt ? participation.createdAt.toISOString() : null,
      updatedAt: participation?.updatedAt ? participation.updatedAt.toISOString() : null,
    };

    const successResponse = createSuccessResponse(result);
    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('Quest participation check error:', error);
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '퀘스트 참여 정보 확인 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}
