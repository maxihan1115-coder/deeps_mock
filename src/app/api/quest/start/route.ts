import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuthToken } from '@/lib/auth-token';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';

async function handleQuestStart(request: NextRequest) {
  try {
    // 요청 데이터 상세 로깅 추가
    const requestBody = await request.json();
    console.log('🔍 [quest/start] Full request body:', JSON.stringify(requestBody));
    console.log('🔍 [quest/start] Request body keys:', Object.keys(requestBody));
    console.log('🔍 [quest/start] Request body type:', typeof requestBody);
    
    const { uuid } = requestBody;
    console.log('🔍 [quest/start] Received UUID:', uuid);
    console.log('🔍 [quest/start] UUID type:', typeof uuid);
    console.log('🔍 [quest/start] UUID length:', uuid ? String(uuid).length : 'null/undefined');
    
    const parsedUuid = Number.parseInt(String(uuid), 10);
    console.log('🔍 [quest/start] Parsed UUID:', parsedUuid);
    console.log('🔍 [quest/start] Is finite:', Number.isFinite(parsedUuid));

    // UUID 검증
    if (!Number.isFinite(parsedUuid)) {
      console.log('❌ [quest/start] UUID validation failed:', { uuid, parsedUuid });
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '게임 내 유저 고유 ID가 필요합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 병렬로 사용자 존재 여부, 기존 연동 상태, 연동 요청 이력 확인
    const [user, existingPlatformLink, connectRequest] = await Promise.all([
      prisma.user.findUnique({
        where: { uuid: parsedUuid },
        select: { id: true, uuid: true } // 필요한 필드만 선택
      }),
      prisma.platformLink.findUnique({
        where: { gameUuid: parsedUuid },
        select: { isActive: true } // 필요한 필드만 선택
      }),
      // 연동 요청 이력 확인 (quest/connect에서 생성된 CONNECT_REQUEST)
      prisma.platformLinkHistory.findFirst({
        where: { 
          gameUuid: parsedUuid,
          action: 'CONNECT_REQUEST'
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    console.log('🔍 [quest/start] User lookup result:', user);
    console.log('🔍 [quest/start] Existing platform link:', existingPlatformLink);
    console.log('🔍 [quest/start] Connect request history:', connectRequest);

    if (!user) {
      console.log('❌ [quest/start] User not found:', parsedUuid);
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '존재하지 않는 유저'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 연동 상태 확인 및 처리 로직 개선
    let shouldCreatePlatformLink = false;
    
    if (existingPlatformLink && existingPlatformLink.isActive) {
      console.log('✅ [quest/start] User already linked:', parsedUuid);
    } 
    // 연동 요청이 있었다면 실제 연동 정보 생성
    else if (connectRequest) {
      console.log('🔗 [quest/start] Creating platform link from connect request for user:', parsedUuid);
      shouldCreatePlatformLink = true;
    } 
    // 연동 요청도 없고 기존 연동도 없으면 자동으로 연동 생성 (테스트용)
    else {
      console.log('⚠️ [quest/start] No existing link or request found, creating auto-link for user:', parsedUuid);
      shouldCreatePlatformLink = true;
    }

    // 플랫폼 연동 정보 생성 (필요한 경우)
    if (shouldCreatePlatformLink) {
      try {
        // 실제 플랫폼 연동 정보 생성
        await prisma.platformLink.upsert({
          where: { gameUuid: parsedUuid },
          update: { 
            isActive: true,
            updatedAt: new Date()
          },
          create: {
            gameUuid: user.uuid,
            platformUuid: `bapp_${parsedUuid}`,
            platformType: 'BAPP',
            linkedAt: new Date(),
            isActive: true,
          },
        });

        // 연동 완료 이력 추가
        await prisma.platformLinkHistory.create({
          data: {
            gameUuid: user.uuid,
            platformUuid: `bapp_${parsedUuid}`,
            platformType: 'BAPP',
            action: 'CONNECT_COMPLETED',
            linkedAt: new Date(),
          },
        });
        
        console.log('✅ [quest/start] Platform link created/updated for user:', parsedUuid);
      } catch (error) {
        console.error('❌ [quest/start] Failed to create platform link:', error);
        // 연동 생성 실패해도 퀘스트 시작은 진행
      }
    }

    // 최적화된 참여 정보 처리 (인덱스 활용으로 빠른 조회)
    const startDate = new Date();
    console.log('🔍 [quest/start] Setting startDate:', startDate);
    
    // User 테이블과 QuestParticipation 테이블 모두 업데이트
    const [updatedUser, participation] = await Promise.all([
      prisma.user.update({
        where: { uuid: parsedUuid },
        data: { startDate: startDate }
      }),
      prisma.questParticipation.upsert({
        where: { gameUuid: parsedUuid },
        update: { 
          startDate: startDate,
          updatedAt: new Date()
        },
        create: {
          gameUuid: parsedUuid,
          startDate: startDate,
        },
      })
    ]);

    console.log('✅ [quest/start] User startDate 업데이트 완료:', updatedUser.startDate);
    console.log('✅ [quest/start] QuestParticipation 업데이트 완료:', participation.startDate);

    // 성공 응답
    const successResponse = createSuccessResponse({
      result: true,
      startDate: startDate.getTime(),
    });
    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('🚨 [quest/start] Quest start error occurred!');
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error message:', error instanceof Error ? error.message : error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('❌ Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    // Prisma 에러인지 확인
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; meta?: unknown };
      console.error('🔍 [quest/start] Prisma error code:', prismaError.code);
      console.error('🔍 [quest/start] Prisma error meta:', prismaError.meta);
    }
    
    // 데이터베이스 연결 에러인지 확인
    if (error instanceof Error && error.message.includes('connect')) {
      console.error('🔍 [quest/start] Database connection error detected');
    }
    
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '퀘스트 참여 시작 처리 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}

// BAPP_AUTH_TOKEN 검증과 함께 핸들러 실행
export const POST = withAuthToken(handleQuestStart);
