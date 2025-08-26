import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';

// 연동 완료 정보 저장
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameUuid, platformUuid, platformType } = body;

    if (!gameUuid || !platformUuid || !platformType) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '필수 정보가 누락되었습니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 이미 연동된 게임 UUID인지 확인
    const existingLink = await prisma.platformLink.findUnique({
      where: { gameUuid: parseInt(gameUuid) },
    });

    if (existingLink) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '이미 연동된 유저'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 재연동 방지: 이전에 해제된 이력이 있는지 확인
    const disconnectHistory = await prisma.platformLinkHistory.findFirst({
      where: {
        gameUuid: parseInt(gameUuid),
        action: 'DISCONNECT',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (disconnectHistory) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '재연동이 불가능한 유저'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 새로운 연동 정보 저장
    const platformLink = await prisma.platformLink.create({
      data: {
        gameUuid: parseInt(gameUuid),
        platformUuid,
        platformType,
      },
    });

    // 연동 이력에 기록 추가
    await prisma.platformLinkHistory.create({
      data: {
        gameUuid: parseInt(gameUuid),
        platformUuid,
        platformType,
        action: 'CONNECT',
        linkedAt: platformLink.linkedAt,
      },
    });

    const successResponse = createSuccessResponse({
      id: platformLink.id,
      gameUuid: platformLink.gameUuid,
      platformUuid: platformLink.platformUuid,
      platformType: platformLink.platformType,
      linkedAt: platformLink.linkedAt,
    });
    return NextResponse.json(successResponse);
  } catch (error) {
    console.error('플랫폼 연동 저장 오류:', error);
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '플랫폼 연동 저장 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}

// 연동 정보 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameUuid = searchParams.get('gameUuid');
    const platformUuid = searchParams.get('platformUuid');

    if (!gameUuid && !platformUuid) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '조회할 UUID가 필요합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    let platformLink;
    
    if (gameUuid) {
      // 게임 UUID로 연동 정보 조회
      platformLink = await prisma.platformLink.findUnique({
        where: { gameUuid: parseInt(gameUuid) },
      });
    } else if (platformUuid) {
      // 플랫폼 UUID로 연동 정보 조회
      platformLink = await prisma.platformLink.findFirst({
        where: { platformUuid },
      });
    }

    const successResponse = createSuccessResponse(
      platformLink ? {
        id: platformLink.id,
        gameUuid: platformLink.gameUuid,
        platformUuid: platformLink.platformUuid,
        platformType: platformLink.platformType,
        linkedAt: platformLink.linkedAt,
        isActive: platformLink.isActive,
      } : null
    );
    return NextResponse.json(successResponse);
  } catch (error) {
    console.error('플랫폼 연동 조회 오류:', error);
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '플랫폼 연동 조회 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}
