import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, getErrorStatusCode, API_ERROR_CODES } from '@/lib/api-errors';

export async function GET() {
  try {
    // 활성화된 상점 아이템 목록 조회
    const items = await prisma.shopItem.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        currency: true
      },
      orderBy: [
        { currency: 'asc' }, // GOLD 먼저, DIAMOND 나중에
        { price: 'asc' }     // 가격 순으로 정렬
      ]
    });

    return NextResponse.json(createSuccessResponse(items));
  } catch (error) {
    console.error('상점 아이템 목록 조회 중 오류:', error);
    return NextResponse.json(
      createErrorResponse(API_ERROR_CODES.SERVICE_UNAVAILABLE, '상점 아이템 목록 조회 중 오류가 발생했습니다.'),
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}
