import { NextRequest, NextResponse } from 'next/server';
import { mysqlGameStore } from '@/lib/mysql-store';
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
    const userId = searchParams.get('userId');

    console.log('Quest API called with userId:', userId);

    if (!userId) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '사용자 ID가 필요합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 사용자 정보 조회하여 UUID 가져오기
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

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

    // 플랫폼 연동 완료 여부 확인
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

    const quests = await mysqlGameStore.getQuests(userId);
    console.log('Retrieved quests for userId:', userId, 'count:', quests.length);

    const successResponse = createSuccessResponse(quests);
    return NextResponse.json(successResponse);
  } catch (error) {
    console.error('Get quests error:', error);
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '퀘스트 조회 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}
