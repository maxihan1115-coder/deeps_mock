import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, getErrorStatusCode, API_ERROR_CODES } from '@/lib/api-errors';
import { CurrencyType } from '@prisma/client';
import { mysqlGameStore } from '@/lib/mysql-store';

export async function POST(request: NextRequest) {
  try {
    const { userId, itemId } = await request.json();
    console.log('🛒 상점 구매 요청:', { userId, itemId });

    if (!userId || !itemId) {
      return NextResponse.json(
        createErrorResponse(API_ERROR_CODES.INVALID_INPUT, '필수 입력값이 누락되었습니다.'),
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_INPUT) }
      );
    }

    const parsedUserId = Number.parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
      return NextResponse.json(
        createErrorResponse(API_ERROR_CODES.INVALID_USER, '유효하지 않은 사용자 ID입니다.'),
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 아이템 정보 조회
    const item = await prisma.shopItem.findUnique({
      where: { id: itemId }
    });

    if (!item) {
      return NextResponse.json(
        createErrorResponse(API_ERROR_CODES.INVALID_INPUT, '존재하지 않는 아이템입니다.'),
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_INPUT) }
      );
    }

    if (!item.isActive) {
      return NextResponse.json(
        createErrorResponse(API_ERROR_CODES.INVALID_INPUT, '판매 중이지 않은 아이템입니다.'),
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_INPUT) }
      );
    }

    // 사용자 재화 정보 조회
    const userCurrency = await prisma.userCurrency.findUnique({
      where: { userId: parsedUserId }
    });

    console.log('💰 사용자 재화 정보:', userCurrency);

    if (!userCurrency) {
      console.log('❌ 사용자 재화 정보 없음, 기본값으로 생성');
      // 재화 정보가 없으면 기본값으로 생성
      const newUserCurrency = await prisma.userCurrency.create({
        data: {
          userId: parsedUserId,
          gold: 0,
          diamond: 0,
        }
      });
      console.log('✅ 기본 재화 정보 생성:', newUserCurrency);
      
      return NextResponse.json(
        createErrorResponse(API_ERROR_CODES.INSUFFICIENT_CURRENCY, '재화가 부족합니다.'),
        { status: getErrorStatusCode(API_ERROR_CODES.INSUFFICIENT_CURRENCY) }
      );
    }

    // 재화 잔액 확인
    const currentBalance = item.currency === CurrencyType.GOLD ? userCurrency.gold : userCurrency.diamond;
    console.log('💳 잔액 확인:', { 
      currency: item.currency, 
      currentBalance, 
      itemPrice: item.price, 
      isSufficient: currentBalance >= item.price 
    });
    
    if (currentBalance < item.price) {
      console.log('❌ 잔액 부족으로 구매 실패');
      return NextResponse.json(
        createErrorResponse(API_ERROR_CODES.INSUFFICIENT_CURRENCY, '재화가 부족합니다.'),
        { status: getErrorStatusCode(API_ERROR_CODES.INSUFFICIENT_CURRENCY) }
      );
    }

    // 트랜잭션으로 구매 처리
    const result = await prisma.$transaction(async (tx) => {
      // 1. 재화 차감
      const updatedCurrency = await tx.userCurrency.update({
        where: { userId: parsedUserId },
        data: {
          gold: item.currency === CurrencyType.GOLD ? { decrement: item.price } : undefined,
          diamond: item.currency === CurrencyType.DIAMOND ? { decrement: item.price } : undefined,
        }
      });

      // 2. 구매 내역 기록
      const purchase = await tx.shopPurchase.create({
        data: {
          userId: parsedUserId,
          itemId: item.id,
          price: item.price,
          currency: item.currency,
        }
      });

      // 3. 재화 거래 내역 기록
      await tx.currencyTransaction.create({
        data: {
          userId: parsedUserId,
          type: item.currency,
          amount: -item.price, // 음수로 차감 표시
          reason: `${item.name} 구매`,
        }
      });

      return { updatedCurrency, purchase };
    });

    // 퀘스트 진행도 업데이트 (상점 아이템 구매)
    try {
      // 플랫폼 연동 상태 확인
      const platformLink = await prisma.platformLink.findUnique({
        where: { gameUuid: parsedUserId }
      });
      const isLinked = !!platformLink;
      
      // 아이템 구매 퀘스트 업데이트
      await mysqlGameStore.updateItemPurchaseQuestProgress(parsedUserId, item.name, isLinked);
      
      // 골드 구매 퀘스트 업데이트 (골드로 구매한 경우)
      if (item.currency === CurrencyType.GOLD) {
        await mysqlGameStore.updateGoldPurchaseQuestProgress(parsedUserId, item.price, isLinked);
      }
      
      console.log('✅ 상점 구매 퀘스트 진행도 업데이트 완료');
    } catch (error) {
      console.error('❌ 상점 구매 퀘스트 진행도 업데이트 실패:', error);
      // 퀘스트 업데이트 실패해도 구매는 성공으로 처리
    }

    console.log(`✅ 아이템 구매 완료: 사용자 ${parsedUserId}, 아이템 ${item.name}, 가격: ${item.price} ${item.currency}`);

    return NextResponse.json(createSuccessResponse({
      item: {
        id: item.id,
        name: item.name,
        price: item.price,
        currency: item.currency
      },
      remainingBalance: {
        gold: result.updatedCurrency.gold,
        diamond: result.updatedCurrency.diamond
      }
    }));
  } catch (error) {
    console.error('아이템 구매 중 오류:', error);
    return NextResponse.json(
      createErrorResponse(API_ERROR_CODES.SERVICE_UNAVAILABLE, '아이템 구매 중 오류가 발생했습니다.'),
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}
