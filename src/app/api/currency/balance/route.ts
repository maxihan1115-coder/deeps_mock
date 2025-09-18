import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameUuidParam = searchParams.get('gameUuid');

    if (!gameUuidParam) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '게임 UUID가 필요합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    const parsedGameUuid = Number.parseInt(gameUuidParam, 10);

    if (!Number.isFinite(parsedGameUuid)) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '게임 UUID는 숫자여야 합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 사용자 재화 정보 조회 (없으면 기본값으로 생성)
    let userCurrency = await prisma.userCurrency.findUnique({
      where: { userId: parsedGameUuid }
    });

    // 재화 정보가 없으면 기본값으로 생성
    if (!userCurrency) {
      userCurrency = await prisma.userCurrency.create({
        data: {
          userId: parsedGameUuid,
          gold: 0,
          diamond: 0
        }
      });
    }

    const successResponse = createSuccessResponse({
      gold: userCurrency.gold,
      diamond: userCurrency.diamond
    });

    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('재화 잔액 조회 중 오류:', error);
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '재화 잔액 조회 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}
