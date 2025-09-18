import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuthToken } from '@/lib/auth-token';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';
// 사용하지 않는 import는 제거되었습니다.

// 사용하지 않는 함수들은 제거되었습니다.

async function handleQuestCheck(request: NextRequest) {
  try {
    const { uuid, questIds } = await request.json();

    const parsedUuid = Number.parseInt(String(uuid), 10);

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

    // questIds 검증
    if (!questIds || !Array.isArray(questIds) || questIds.length === 0) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_QUEST,
        '퀘스트 ID 목록이 필요합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_QUEST) }
      );
    }

    // 사용자 존재 여부와 플랫폼 연동 상태 확인
    const [user, platformLink] = await Promise.all([
      prisma.user.findUnique({
        where: { uuid: parsedUuid },
        select: { id: true, uuid: true }
      }),
      prisma.platformLink.findUnique({
        where: { gameUuid: parsedUuid },
        select: { isActive: true }
      })
    ]);

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

    if (!platformLink || !platformLink.isActive) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '미연동 유저'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // quest_progress 테이블에서 직접 진행도 조회
    const questProgresses = await prisma.questProgress.findMany({
      where: {
        userId: parsedUuid,
        catalogId: { in: questIds.map(id => String(id)) }
      },
      include: {
        user: {
          select: { uuid: true }
        }
      }
    });

    // 퀘스트 카탈로그 정보 조회
    const questCatalogs = await prisma.questCatalog.findMany({
      where: {
        id: { in: questIds.map(id => String(id)) }
      }
    });

    // 결과 구성
    const questResults = questIds.map(questId => {
      const progress = questProgresses.find(p => p.catalogId === String(questId));
      const catalog = questCatalogs.find(c => c.id === String(questId));
      
      // catalog가 없으면 에러 처리
      if (!catalog) {
        return {
          id: String(questId),
          totalTimes: 0,
          currentTimes: 0,
          complete: false
        };
      }

      // progress가 없으면 기본값으로 처리
      if (!progress) {
        return {
          id: String(questId),
          totalTimes: catalog.maxProgress,
          currentTimes: 0,
          complete: false
        };
      }

      return {
        id: String(questId),
        totalTimes: catalog.maxProgress,
        currentTimes: progress.progress,
        complete: progress.isCompleted
      };
    });

    // 성공 응답
    const successResponse = createSuccessResponse(questResults);
    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('Quest check error:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '퀘스트 달성 여부 조회 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}

// BAPP_AUTH_TOKEN 검증과 함께 핸들러 실행
export const POST = withAuthToken(handleQuestCheck);
