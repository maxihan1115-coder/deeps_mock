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
        // Item Name Translations
        if (name.includes('테스트 아이템1') || name === 'Test Item 1') name = 'Test Item 1';
        else if (name.includes('테스트 아이템2') || name === 'Test Item 2') name = 'Test Item 2';
        else if (name.includes('테스트 아이템3') || name === 'Test Item 3') name = 'Test Item 3';
        else if (name.includes('테스트 아이템4') || name === 'Test Item 4') name = 'Test Item 4';
        else if (name.includes('테스트 아이템5') || name === 'Test Item 5') name = 'Test Item 5';
        else if (name.includes('테스트 아이템6') || name === 'Test Item 6') name = 'Test Item 6';
        else if (name.includes('100 골드') || name === '100 Gold') name = '100 Gold';
        else if (name.includes('500 골드') || name === '500 Gold') name = '500 Gold';
        else if (name.includes('1000 골드') || name === '1000 Gold') name = '1000 Gold';
        else if (name.includes('2000 골드') || name === '2000 Gold') name = '2000 Gold';

        // Description Translations
        if (description) {
          if (description.includes('Gold로 구매하는 Basic Item')) description = 'Basic Item purchased with Gold';
          else if (description.includes('Gold로 구매하는 Intermediate Item')) description = 'Intermediate Item purchased with Gold';
          else if (description.includes('Gold로 구매하는 Advanced Item')) description = 'Advanced Item purchased with Gold';
          else if (description.includes('Diamond로 구매하는 기본 Gold')) description = 'Basic Gold purchased with Diamonds';
          else if (description.includes('Diamond로 구매하는 중급 Gold')) description = 'Intermediate Gold purchased with Diamonds';
          else if (description.includes('Diamond로 구매하는 고급 Gold')) description = 'Advanced Gold purchased with Diamonds';
          else if (description.includes('Diamond로 구매하는 프리미엄 Gold')) description = 'Premium Gold purchased with Diamonds';
          else if (description.includes('다이아로 구매하는 Basic Item')) description = 'Basic Item purchased with Diamonds';
          else if (description.includes('다이아로 구매하는 Intermediate Item')) description = 'Intermediate Item purchased with Diamonds';
          else if (description.includes('다이아로 구매하는 Advanced Item')) description = 'Advanced Item purchased with Diamonds';

          // Fallback generic replacements if not matched above
          if (description.includes('골드')) description = description.replace(/골드/g, 'Gold');
          if (description.includes('다이아몬드')) description = description.replace(/다이아몬드/g, 'Diamond');
          if (description.includes('구매하는')) description = description.replace(/구매하는/g, 'purchased with');
          if (description.includes('기본')) description = description.replace(/기본/g, 'Basic');
          if (description.includes('중급')) description = description.replace(/중급/g, 'Intermediate');
          if (description.includes('고급')) description = description.replace(/고급/g, 'Advanced');
          if (description.includes('프리미엄')) description = description.replace(/프리미엄/g, 'Premium');
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
