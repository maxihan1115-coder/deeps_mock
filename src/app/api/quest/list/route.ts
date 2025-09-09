import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuthToken } from '@/lib/auth-token';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';

async function handleQuestList() {
  try {
    console.log('Quest list API called');

    // DB 카탈로그 조회
    const catalog = await prisma.questCatalog.findMany();

    // 플랫폼 호환 형태로 매핑 (totalTimes = maxProgress)
    const list = catalog.map((q) => ({
      id: Number.isFinite(Number(q.id)) ? Number(q.id) : q.id, // 숫자 ID 우선
      title: q.title,
      totalTimes: q.maxProgress,
      type: q.type ? q.type.toLowerCase() : undefined,
    }));

    const successResponse = createSuccessResponse(list);
    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('Quest list error:', error);
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '퀘스트 목록 조회 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}

// BAPP_AUTH_TOKEN 검증과 함께 핸들러 실행
export const GET = withAuthToken(handleQuestList);
