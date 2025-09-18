import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';
import { mysqlGameStore } from '@/lib/mysql-store';

export async function POST(request: NextRequest) {
  try {
    const { gameUuid, type, amount, reason, gameScore } = await request.json();

    if (!gameUuid || !type || !amount || !reason) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '게임 UUID, 재화 타입, 금액, 사유가 필요합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    if (typeof gameUuid !== 'number' || !Number.isFinite(gameUuid)) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '게임 UUID는 숫자여야 합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    if (type !== 'GOLD' && type !== 'DIAMOND') {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '재화 타입은 GOLD 또는 DIAMOND여야 합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '금액은 0보다 큰 숫자여야 합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 트랜잭션으로 재화 지급 및 거래 내역 기록
    const result = await prisma.$transaction(async (tx) => {
      // 사용자 재화 정보 조회/생성
      let userCurrency = await tx.userCurrency.findUnique({
        where: { userId: gameUuid }
      });

      if (!userCurrency) {
        userCurrency = await tx.userCurrency.create({
          data: {
            userId: gameUuid,
            gold: 0,
            diamond: 0
          }
        });
      }

      // 재화 증가
      const updateData = type === 'GOLD' 
        ? { gold: userCurrency.gold + amount }
        : { diamond: userCurrency.diamond + amount };

      const updatedCurrency = await tx.userCurrency.update({
        where: { userId: gameUuid },
        data: updateData
      });

      // 거래 내역 기록
      await tx.currencyTransaction.create({
        data: {
          userId: gameUuid,
          type: type,
          amount: amount,
          reason: reason,
          gameScore: gameScore || null
        }
      });

      return updatedCurrency;
    });

    // 골드 획득 시 퀘스트 13번 업데이트
    let questUpdate = null;
    if (type === 'GOLD' && amount > 0) {
      try {
        questUpdate = await mysqlGameStore.incrementGoldEarnQuestProgress(gameUuid, amount);
      } catch (error) {
        console.error('퀘스트 13번 업데이트 중 오류:', error);
        // 퀘스트 업데이트 실패해도 재화 지급은 성공으로 처리
      }
    }

    const successResponse = createSuccessResponse({
      gold: result.gold,
      diamond: result.diamond,
      earnedAmount: amount,
      earnedType: type,
      questUpdate: questUpdate
    });

    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('재화 지급 중 오류:', error);
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '재화 지급 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}
