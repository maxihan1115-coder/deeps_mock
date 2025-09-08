import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';

export async function POST(request: NextRequest) {
  try {
    const { uuid } = await request.json();

    const parsedUuid = Number.parseInt(String(uuid), 10);
    if (!Number.isFinite(parsedUuid)) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '유효한 UUID가 필요합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    const user = await prisma.user.findUnique({ where: { uuid: parsedUuid } });
    if (!user) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '존재하지 않는 유저입니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // Call platform disconnect API
    const authHeader = process.env.BAPP_API_KEY || '';
    const platformResp = await fetch('https://api.boradeeps.cc/m/auth/v1/bapp/disconnect', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({ uuid: String(parsedUuid) }),
    });

    if (!platformResp.ok) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.SERVICE_UNAVAILABLE,
        '플랫폼 탈퇴 호출에 실패했습니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
      );
    }

    const platformData = await platformResp.json();
    if (!(platformData?.success === true && platformData?.payload === true)) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.SERVICE_UNAVAILABLE,
        '플랫폼 탈퇴가 승인되지 않았습니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
      );
    }

    // Purge user-related data except keeping users.uuid row
    await prisma.$transaction([
      prisma.attendanceRecord.deleteMany({ where: { userId: parsedUuid } }),
      prisma.highScore.deleteMany({ where: { userId: parsedUuid } }),
      prisma.gameState.deleteMany({ where: { userId: parsedUuid } }),
      prisma.questProgress.deleteMany({ where: { userId: parsedUuid } }),
      prisma.quest.deleteMany({ where: { userId: parsedUuid } }),
      prisma.questParticipation.deleteMany({ where: { gameUuid: parsedUuid } }),
      prisma.tempCode.deleteMany({ where: { userId: parsedUuid } }),
      prisma.platformLinkHistory.deleteMany({ where: { gameUuid: parsedUuid } }),
      prisma.platformLink.deleteMany({ where: { gameUuid: parsedUuid } }),
      prisma.user.update({
        where: { uuid: parsedUuid },
        data: {
          username: `deleted_user_${parsedUuid}`,
          startDate: null,
          lastLoginAt: new Date(),
        },
      }),
    ]);

    const successResponse = createSuccessResponse(true);
    return NextResponse.json(successResponse);
  } catch (error) {
    console.error('Account withdraw error:', error);
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '탈퇴 처리 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}


