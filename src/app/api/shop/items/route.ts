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
        currency: true,
        isGacha: true,
        gachaRewards: true
      },
      orderBy: [
        { currency: 'asc' }, // GOLD 먼저, DIAMOND 나중에
        { price: 'asc' }     // 가격 순으로 정렬
      ]
    });

    // 영문 변환 매핑
    // 영문 변환 매핑
    const translatedItems = items.map(item => {
      let name = item.name;
      let description = item.description;

      // 다이아몬드 룰렛
      if (name.includes('룰렛') || item.isGacha) {
        name = 'Diamond Roulette';
        description = 'Win between 500 and 10,000 Diamonds randomly.';
      } else {
        // 일반적인 번역
        if (name.includes('테스트 아이템1')) name = 'Test Item 1';
        if (name.includes('테스트 아이템2')) name = 'Test Item 2';
        if (name.includes('테스트 아이템3')) name = 'Test Item 3';
        if (name.includes('기본 아이템')) name = 'Basic Item';
        if (name.includes('골드')) name = name.replace(/골드/g, 'Gold');
        if (name.includes('하트')) name = name.replace(/하트/g, 'Heart');
        if (name.includes('다이아몬드')) name = name.replace(/다이아몬드/g, 'Diamond');
        if (name.includes('패키지')) name = name.replace(/패키지/g, 'Package');
        if (name.includes('구매')) name = name.replace(/구매/g, 'Purchase');

        if (description) {
          if (description.includes('Gold로 구매하는')) {
            description = description.replace('Gold로 구매하는', 'Purchasable with Gold:');
          }
          if (description.includes('기본 아이템')) description = description.replace('기본 아이템', 'Basic Item');
          if (description.includes('중급 아이템')) description = description.replace('중급 아이템', 'Intermediate Item');
          if (description.includes('고급 아이템')) description = description.replace('고급 아이템', 'Advanced Item');

          if (description.includes('골드')) description = description.replace(/골드/g, 'Gold');
          if (description.includes('하트')) description = description.replace(/하트/g, 'Heart');
          if (description.includes('다이아몬드')) description = description.replace(/다이아몬드/g, 'Diamond');
          if (description.includes('지급')) description = description.replace(/지급/g, 'Given');
        }
      }

      return {
        ...item,
        name,
        description
      };
    });

    return NextResponse.json(createSuccessResponse(translatedItems));
  } catch (error) {
    console.error('상점 아이템 목록 조회 중 오류:', error);
    return NextResponse.json(
      createErrorResponse(API_ERROR_CODES.SERVICE_UNAVAILABLE, '상점 아이템 목록 조회 중 오류가 발생했습니다.'),
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}
