import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, getErrorStatusCode, API_ERROR_CODES } from '@/lib/api-errors';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameUuid = searchParams.get('gameUuid');

    if (!gameUuid) {
      return NextResponse.json(
        createErrorResponse(API_ERROR_CODES.INVALID_INPUT, '게임 UUID가 필요합니다.'),
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

    // 가챠 구매 내역 조회 (최근 20개)
    const gachaHistory = await prisma.gachaPurchase.findMany({
      where: {
        userId: parsedGameUuid
      },
      include: {
        gachaItem: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    // 통계 계산
    const totalPurchases = await prisma.gachaPurchase.count({
      where: { userId: parsedGameUuid }
    });

    const totalSpent = await prisma.gachaPurchase.aggregate({
      where: { userId: parsedGameUuid },
      _sum: { diamondCost: true }
    });

    const totalEarned = await prisma.gachaPurchase.aggregate({
      where: { userId: parsedGameUuid },
      _sum: { earnedDiamonds: true }
    });

    const stats = {
      totalPurchases,
      totalSpent: totalSpent._sum.diamondCost || 0,
      totalEarned: totalEarned._sum.earnedDiamonds || 0,
      netGain: (totalEarned._sum.earnedDiamonds || 0) - (totalSpent._sum.diamondCost || 0)
    };

    return NextResponse.json(createSuccessResponse({
      history: gachaHistory,
      stats: stats
    }));

  } catch (error) {
    console.error('가챠 구매 내역 조회 중 오류:', error);
    return NextResponse.json(
      createErrorResponse(API_ERROR_CODES.SERVICE_UNAVAILABLE, '가챠 구매 내역 조회 중 오류가 발생했습니다.'),
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}
