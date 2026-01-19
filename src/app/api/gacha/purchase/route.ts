import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, getErrorStatusCode, API_ERROR_CODES } from '@/lib/api-errors';
import { mysqlGameStore } from '@/lib/mysql-store';

// 가챠 보상 계산 함수
function calculateGachaReward(gachaRewards: Array<{ diamonds: number, probability: number }>): number {
  const random = Math.random(); // 0-1 사이 랜덤값
  let cumulativeProbability = 0;

  for (const reward of gachaRewards) {
    cumulativeProbability += reward.probability;
    if (random <= cumulativeProbability) {
      return reward.diamonds;
    }
  }

  // fallback (마지막 아이템)
  return gachaRewards[gachaRewards.length - 1].diamonds;
}

export async function POST(request: NextRequest) {
  try {
    const { gameUuid, gachaItemId } = await request.json();
    console.log('🎰 가챠 구매 요청:', { gameUuid, gachaItemId });

    if (!gameUuid || !gachaItemId) {
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

    // 가챠 아이템 정보 조회
    const gachaItem = await prisma.shopItem.findUnique({
      where: { id: gachaItemId }
    });

    if (!gachaItem) {
      return NextResponse.json(
        createErrorResponse(API_ERROR_CODES.INVALID_INPUT, '존재하지 않는 가챠 아이템입니다.'),
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_INPUT) }
      );
    }

    if (!gachaItem.isGacha) {
      return NextResponse.json(
        createErrorResponse(API_ERROR_CODES.INVALID_INPUT, '가챠 아이템이 아닙니다.'),
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_INPUT) }
      );
    }

    if (!gachaItem.isActive) {
      return NextResponse.json(
        createErrorResponse(API_ERROR_CODES.INVALID_INPUT, '판매 중이지 않은 가챠 아이템입니다.'),
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_INPUT) }
      );
    }

    // 가챠 보상 데이터 검증
    const gachaRewards = gachaItem.gachaRewards as Array<{ diamonds: number, probability: number }>;
    if (!gachaRewards || !Array.isArray(gachaRewards) || gachaRewards.length === 0) {
      return NextResponse.json(
        createErrorResponse(API_ERROR_CODES.SERVICE_UNAVAILABLE, '가챠 보상 데이터가 올바르지 않습니다.'),
        { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
      );
    }

    // 사용자 재화 정보 조회
    const userCurrency = await prisma.userCurrency.findUnique({
      where: { userId: parsedGameUuid }
    });

    if (!userCurrency) {
      return NextResponse.json(
        createErrorResponse(API_ERROR_CODES.INVALID_USER, '사용자 재화 정보를 찾을 수 없습니다.'),
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 다이아몬드 잔액 확인
    if (userCurrency.diamond < gachaItem.price) {
      return NextResponse.json(
        createErrorResponse(API_ERROR_CODES.INVALID_INPUT, '다이아몬드가 부족합니다.'),
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_INPUT) }
      );
    }

    // 가챠 보상 계산
    const earnedDiamonds = calculateGachaReward(gachaRewards);
    console.log('🎲 가챠 결과:', { earnedDiamonds, gachaRewards });

    // 트랜잭션으로 가챠 구매 처리
    const result = await prisma.$transaction(async (tx) => {
      // 1. 다이아몬드 차감
      await tx.userCurrency.update({
        where: { userId: parsedGameUuid },
        data: {
          diamond: { decrement: gachaItem.price }
        }
      });

      // 2. 획득한 다이아몬드 추가
      const finalCurrency = await tx.userCurrency.update({
        where: { userId: parsedGameUuid },
        data: {
          diamond: { increment: earnedDiamonds }
        }
      });

      // 3. 가챠 구매 내역 기록
      const gachaPurchase = await tx.gachaPurchase.create({
        data: {
          userId: parsedGameUuid,
          gachaItemId: gachaItem.id,
          diamondCost: gachaItem.price,
          earnedDiamonds: earnedDiamonds
        }
      });

      // 4. 재화 거래 내역 기록 (차감)
      await tx.currencyTransaction.create({
        data: {
          userId: parsedGameUuid,
          type: 'DIAMOND',
          amount: -gachaItem.price,
          reason: `${gachaItem.name} 구매`
        }
      });

      // 5. 재화 거래 내역 기록 (획득)
      await tx.currencyTransaction.create({
        data: {
          userId: parsedGameUuid,
          type: 'DIAMOND',
          amount: earnedDiamonds,
          reason: `${gachaItem.name} 보상`
        }
      });

      return { finalCurrency, gachaPurchase };
    });

    // 퀘스트 진행도 업데이트 (가챠 구매)
    try {
      // 플랫폼 연동 상태 확인
      const platformLink = await prisma.platformLink.findUnique({
        where: { gameUuid: parsedGameUuid }
      });
      const isLinked = !!platformLink;

      await mysqlGameStore.updateGachaQuestProgress(parsedGameUuid, isLinked);
      console.log('✅ 가챠 퀘스트 진행도 업데이트 완료');
    } catch (error) {
      console.error('❌ 가챠 퀘스트 진행도 업데이트 실패:', error);
      // 퀘스트 업데이트 실패해도 구매는 성공으로 처리
    }

    console.log('✅ 가챠 구매 완료:', {
      userId: parsedGameUuid,
      itemName: gachaItem.name,
      cost: gachaItem.price,
      earned: earnedDiamonds,
      finalBalance: result.finalCurrency.diamond
    });

    return NextResponse.json(createSuccessResponse({
      gachaItem: {
        id: gachaItem.id,
        name: gachaItem.name,
        price: gachaItem.price
      },
      earnedDiamonds: earnedDiamonds,
      finalBalance: {
        diamond: result.finalCurrency.diamond
      },
      purchase: result.gachaPurchase
    }));

  } catch (error) {
    console.error('가챠 구매 중 오류:', error);
    return NextResponse.json(
      createErrorResponse(API_ERROR_CODES.SERVICE_UNAVAILABLE, '가챠 구매 중 오류가 발생했습니다.'),
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}
