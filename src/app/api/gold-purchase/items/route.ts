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

    // 영문 변환 매핑
    const translatedItems = goldItems.map(item => {
      let name = item.name;
      let description = item.description;

      // Item Name Translations
      if (name.includes('100 골드') || name === '100 Gold') name = '100 Gold';
      else if (name.includes('500 골드') || name === '500 Gold') name = '500 Gold';
      else if (name.includes('1000 골드') || name === '1000 Gold') name = '1000 Gold';
      else if (name.includes('2000 골드') || name === '2000 Gold') name = '2000 Gold';

      // Description Translations
      if (description) {
        if (description.includes('다이아몬드로 구매하는 기본 골드')) description = 'Basic Gold purchased with Diamonds';
        else if (description.includes('다이아몬드로 구매하는 중급 골드')) description = 'Intermediate Gold purchased with Diamonds';
        else if (description.includes('다이아몬드로 구매하는 고급 골드')) description = 'Advanced Gold purchased with Diamonds';
        else if (description.includes('다이아몬드로 구매하는 프리미엄 골드')) description = 'Premium Gold purchased with Diamonds';

        // Fallback
        if (description.includes('골드')) description = description.replace(/골드/g, 'Gold');
        if (description.includes('다이아몬드')) description = description.replace(/다이아몬드/g, 'Diamond');
        if (description.includes('구매하는')) description = description.replace(/구매하는/g, 'purchased with');
        if (description.includes('기본')) description = description.replace(/기본/g, 'Basic');
        if (description.includes('중급')) description = description.replace(/중급/g, 'Intermediate');
        if (description.includes('고급')) description = description.replace(/고급/g, 'Advanced');
        if (description.includes('프리미엄')) description = description.replace(/프리미엄/g, 'Premium');
      }

      return {
        ...item,
        name,
        description
      };
    });

    return NextResponse.json(createSuccessResponse(translatedItems));
  } catch (error) {
    console.error('골드 구매 아이템 목록 조회 중 오류:', error);
    return NextResponse.json(
      createErrorResponse(API_ERROR_CODES.SERVICE_UNAVAILABLE, '골드 구매 아이템 목록 조회 중 오류가 발생했습니다.'),
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}
