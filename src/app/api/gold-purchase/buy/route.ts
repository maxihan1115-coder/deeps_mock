import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, getErrorStatusCode, API_ERROR_CODES } from '@/lib/api-errors';
import { mysqlGameStore } from '@/lib/mysql-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameUuid, itemId } = body;

    // 입력값 검증
    if (!gameUuid || !itemId) {
      return NextResponse.json(
        createErrorResponse(API_ERROR_CODES.INVALID_INPUT, 'gameUuid와 itemId가 필요합니다.'),
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_INPUT) }
      );
    }

    const parsedGameUuid = parseInt(gameUuid);
    if (isNaN(parsedGameUuid)) {
      return NextResponse.json(
        createErrorResponse(API_ERROR_CODES.INVALID_INPUT, '유효하지 않은 gameUuid입니다.'),
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_INPUT) }
      );
    }

    // 골드 구매 아이템 조회
    const item = await prisma.shopItem.findUnique({
      where: {
        id: itemId,
        isActive: true
      }
    });

    if (!item) {
      return NextResponse.json(
        createErrorResponse(API_ERROR_CODES.ITEM_NOT_FOUND, '골드 구매 아이템을 찾을 수 없습니다.'),
        { status: getErrorStatusCode(API_ERROR_CODES.ITEM_NOT_FOUND) }
      );
    }

    // 골드 구매 아이템인지 확인
    if (!item.id.startsWith('gold-')) {
      return NextResponse.json(
        createErrorResponse(API_ERROR_CODES.INVALID_INPUT, '골드 구매 아이템이 아닙니다.'),
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_INPUT) }
      );
    }

    // 사용자 통화 정보 조회
    const userCurrency = await prisma.userCurrency.findUnique({
      where: { userId: parsedGameUuid }
    });

    if (!userCurrency) {
      return NextResponse.json(
        createErrorResponse(API_ERROR_CODES.INVALID_USER, '사용자 통화 정보를 찾을 수 없습니다.'),
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 다이아몬드 잔액 확인
    if (userCurrency.diamond < item.price) {
      return NextResponse.json(
        createErrorResponse(API_ERROR_CODES.INSUFFICIENT_CURRENCY, '다이아몬드가 부족합니다.'),
        { status: getErrorStatusCode(API_ERROR_CODES.INSUFFICIENT_CURRENCY) }
      );
    }

    // 골드 구매 처리 (트랜잭션)
    const result = await prisma.$transaction(async (tx) => {
      // 다이아몬드 차감
      const updatedCurrency = await tx.userCurrency.update({
        where: { userId: parsedGameUuid },
        data: {
          diamond: userCurrency.diamond - item.price,
          gold: userCurrency.gold + parseInt(item.name.split(' ')[0]) // "100 골드"에서 100 추출
        }
      });

      return updatedCurrency;
    });

    // 퀘스트 진행도 업데이트 (골드 구매)
    try {
      // 플랫폼 연동 상태 확인
      const platformLink = await prisma.platformLink.findUnique({
        where: { gameUuid: parsedGameUuid }
      });
      const isLinked = !!platformLink;

      // 골드 구매 퀘스트 업데이트
      const goldAmount = parseInt(item.name.split(' ')[0]); // "100 골드"에서 100 추출
      await mysqlGameStore.updateGoldPurchaseQuestProgress(parsedGameUuid, goldAmount, isLinked);
      
      console.log('✅ 골드 구매 퀘스트 진행도 업데이트 완료');
    } catch (error) {
      console.error('❌ 골드 구매 퀘스트 진행도 업데이트 실패:', error);
      // 퀘스트 업데이트 실패해도 구매는 성공으로 처리
    }

    console.log(`✅ 골드 구매 완료: 사용자 ${parsedGameUuid}, 아이템 ${item.name}, 가격: ${item.price} 다이아`);

    return NextResponse.json(createSuccessResponse({
      item: {
        id: item.id,
        name: item.name,
        price: item.price,
        currency: item.currency
      },
      remainingBalance: {
        gold: result.gold,
        diamond: result.diamond
      }
    }));

  } catch (error) {
    console.error('골드 구매 중 오류:', error);
    return NextResponse.json(
      createErrorResponse(API_ERROR_CODES.SERVICE_UNAVAILABLE, '골드 구매 중 오류가 발생했습니다.'),
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}
