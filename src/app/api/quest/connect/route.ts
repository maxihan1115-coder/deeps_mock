import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuthToken } from '@/lib/auth-token';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';

async function handleQuestConnect(request: NextRequest) {
  try {
    console.log('Quest connect API called');
    
    // 전체 요청 데이터 로깅
    const requestBody = await request.json();
    console.log('🔍 Full request body:', JSON.stringify(requestBody));
    console.log('🔍 Request body keys:', Object.keys(requestBody));
    
    const { uuid } = requestBody;
    console.log('🔍 Received UUID:', uuid);
    console.log('🔍 UUID type:', typeof uuid);
    console.log('🔍 UUID length:', uuid ? String(uuid).length : 'null/undefined');

    const parsedUuid = Number.parseInt(String(uuid), 10);
    console.log('🔍 Parsed UUID:', parsedUuid);
    console.log('🔍 Is finite:', Number.isFinite(parsedUuid));

    // UUID 검증
    if (!Number.isFinite(parsedUuid)) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '게임 내 유저 고유 ID가 필요합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 사용자 존재 여부 확인
    console.log('Looking for user with UUID:', parsedUuid);
    const user = await prisma.user.findUnique({
      where: { uuid: parsedUuid },
    });
    console.log('Found user:', user ? 'Yes' : 'No');

    if (!user) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '존재하지 않는 유저'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 연동 완료 처리 - 플랫폼에서 연동 완료를 알려주는 API
    console.log('Processing platform connect notification for user:', user.uuid);
    
    // connect API는 단순히 플랫폼에서 연동 요청이 있었음을 알리는 역할만 함
    // 실제 연동 정보는 quest/start API에서만 생성됨
    
    // 연동 요청 이력만 기록 (실제 연동 정보는 생성하지 않음)
    await prisma.platformLinkHistory.create({
      data: {
        gameUuid: user.uuid,
        platformUuid: `bapp_${parsedUuid}`,
        platformType: 'BAPP',
        action: 'CONNECT_REQUEST',  // 연동 요청만 기록
        linkedAt: new Date(),
      },
    });

    console.log('Quest connect notification recorded for user:', user.uuid, '(실제 연동은 quest/start에서 처리)');

    // 성공 응답
    const successResponse = createSuccessResponse({
      gameUuid: user.uuid,
      platformType: 'BAPP',
      message: '플랫폼 연동이 완료되었습니다.'
    });
    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('Quest connect error:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '퀘스트 연동 처리 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}

// BAPP_AUTH_TOKEN 검증과 함께 핸들러 실행
export const POST = withAuthToken(handleQuestConnect);
