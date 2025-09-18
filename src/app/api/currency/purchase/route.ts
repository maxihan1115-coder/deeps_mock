import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, getErrorStatusCode, API_ERROR_CODES } from '@/lib/api-errors';
import { CurrencyType } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const { gameUuid, type, amount, reason, price } = await request.json();

    if (!gameUuid || !type || amount === undefined || !reason) {
      return NextResponse.json(
        createErrorResponse(API_ERROR_CODES.INVALID_INPUT, '필수 입력값이 누락되었습니다.'),
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_INPUT) }
      );
    }

    const parsedGameUuid = Number.parseInt(gameUuid, 10);
    if (isNaN(parsedGameUuid)) {
      return NextResponse.json(
        createErrorResponse(API_ERROR_CODES.INVALID_USER, '유효하지 않은 게임 UUID입니다.'),
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        createErrorResponse(API_ERROR_CODES.INVALID_INPUT, '구매 금액은 0보다 커야 합니다.'),
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_INPUT) }
      );
    }

    // 다이아몬드만 구매 가능하도록 제한
    if (type !== CurrencyType.DIAMOND) {
      return NextResponse.json(
        createErrorResponse(API_ERROR_CODES.INVALID_INPUT, '다이아몬드만 구매 가능합니다.'),
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_INPUT) }
      );
    }

    // UserCurrency 업데이트 또는 생성
    const updatedCurrency = await prisma.userCurrency.upsert({
      where: { userId: parsedGameUuid },
      update: {
        diamond: { increment: amount },
      },
      create: {
        userId: parsedGameUuid,
        gold: 0,
        diamond: amount,
      },
    });

    // 거래 내역 기록 (구매)
    await prisma.currencyTransaction.create({
      data: {
        userId: parsedGameUuid,
        type: type,
        amount: amount,
        reason: reason,
        gameScore: null, // 구매는 게임 점수와 무관
      },
    });

    console.log(`✅ 다이아몬드 구매 완료: 사용자 ${parsedGameUuid}, ${amount}개, 가격: ${price}원`);

    return NextResponse.json(createSuccessResponse({
      ...updatedCurrency,
      purchasedAmount: amount,
      price: price
    }));
  } catch (error) {
    console.error('다이아몬드 구매 중 오류:', error);
    return NextResponse.json(
      createErrorResponse(API_ERROR_CODES.SERVICE_UNAVAILABLE, '다이아몬드 구매 중 오류가 발생했습니다.'),
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}
