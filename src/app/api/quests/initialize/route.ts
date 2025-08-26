import { NextRequest, NextResponse } from 'next/server';
import { mysqlGameStore } from '@/lib/mysql-store';
import { prisma } from '@/lib/prisma';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

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

    console.log('Force initializing quests for userId:', userId);
    
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

    console.log('Platform link verified for UUID:', user.uuid, 'Linked at:', platformLink.linkedAt);
    
    // 기존 퀘스트 삭제 후 새로 초기화
    const quests = await mysqlGameStore.initializeQuests(userId);
    
    console.log('Quests initialized, count:', quests.length);

    const successResponse = createSuccessResponse({
      message: '퀘스트가 초기화되었습니다.',
      quests: quests,
      count: quests.length
    });
    return NextResponse.json(successResponse);
  } catch (error) {
    console.error('Initialize quests error:', error);
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '퀘스트 초기화 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}
