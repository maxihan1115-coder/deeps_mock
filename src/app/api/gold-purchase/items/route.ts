import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, getErrorStatusCode, API_ERROR_CODES } from '@/lib/api-errors';

export async function GET() {
  try {
    // 골드 구매 아이템 목록 조회 (골드 구매용 아이템만)
    const goldItems = await prisma.shopItem.findMany({
      where: {
        isActive: true,
        id: {
          in: ['gold-100', 'gold-500', 'gold-1000', 'gold-2000']
        }
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        currency: true,
        isGacha: true,
        gachaRewards: true
      },
      orderBy: {
        price: 'asc' // 가격 순으로 정렬
      }
    });

    return NextResponse.json(createSuccessResponse(goldItems));
  } catch (error) {
    console.error('골드 구매 아이템 목록 조회 중 오류:', error);
    return NextResponse.json(
      createErrorResponse(API_ERROR_CODES.SERVICE_UNAVAILABLE, '골드 구매 아이템 목록 조회 중 오류가 발생했습니다.'),
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}
