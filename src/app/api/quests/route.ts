import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';
import { mysqlGameStore } from '@/lib/mysql-store';
import { memoryCache, CACHE_KEYS } from '@/lib/cache';

// 플랫폼 보상 정보 타입 정의
interface PlatformReward {
  title: string;
  claimValue: string;
  claimSymbol: string;
  claimType?: string;
}

// 플랫폼에서 퀘스트 보상 정보 가져오기 (캐싱 적용)
async function fetchPlatformRewards(): Promise<PlatformReward[] | null> {
  // 캐시에서 먼저 확인
  const cachedRewards = memoryCache.get<PlatformReward[]>(CACHE_KEYS.PLATFORM_REWARDS);
  if (cachedRewards) {
    return cachedRewards;
  }

  try {
    const apiKey = process.env.BAPP_API_KEY;
    
    if (!apiKey) {
      console.error('BAPP_API_KEY가 설정되지 않았습니다.');
      return null;
    }
    
    const requestHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Accept-Language': 'en',
      'BAPP-AUTH-TOKEN': apiKey
    };

    const response = await fetch('https://papi.boradeeps.cc/v1/quest/10006', {
      method: 'GET',
      headers: requestHeaders,
    });

    if (!response.ok) {
      console.error('플랫폼 보상 정보 조회 실패:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (data.success && data.payload) {
      // 캐시에 저장 (5분 TTL)
      memoryCache.set(CACHE_KEYS.PLATFORM_REWARDS, data.payload, 5 * 60 * 1000);
      return data.payload;
    }
    
    return null;
  } catch (error) {
    console.error('플랫폼 보상 정보 조회 중 오류:', error);
    return null;
  }
}


export async function GET(request: NextRequest) {
  try {
    // Prisma 클라이언트 검증
    if (!prisma) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.SERVICE_UNAVAILABLE,
        '데이터베이스 연결이 없습니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
      );
    }

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

    // 플랫폼 보상 정보 가져오기 (실패해도 계속 진행)
    let platformRewards = null;
    try {
      platformRewards = await fetchPlatformRewards();
    } catch (error) {
      console.warn('플랫폼 보상 정보 조회 실패, 기본 보상으로 진행:', error);
    }
    
    // quest_progress 테이블에서 직접 진행도 조회
    const quests = await mysqlGameStore.getCatalogWithProgress(parsedGameUuid);
    
    // 플랫폼 보상 정보를 퀘스트에 매핑
    const questsWithRewards = quests.map(quest => {
      const platformReward = platformRewards?.find((r: PlatformReward) => r.title === quest.title);
      
      // 모든 퀘스트는 플랫폼 API에서 받아온 값 우선 사용
      let claimValue = platformReward?.claimValue || null;
      let claimSymbol = platformReward?.claimSymbol || null;
      
      // 플랫폼 API 호출이 실패한 경우 하드코딩된 값 사용
      if (!claimValue && !claimSymbol) {
        if (quest.id === '9') {
          claimValue = '50.00';
          claimSymbol = 'BORA';
        } else if (quest.id === '10') {
          claimValue = '100.00';
          claimSymbol = 'BORA';
        } else {
          claimValue = '5';
          claimSymbol = 'BORA';
        }
      }
      
      return {
        ...quest,
        claimValue,
        claimSymbol
      };
    });

    const successResponse = createSuccessResponse(questsWithRewards);
    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('퀘스트 조회 중 오류:', error);
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '퀘스트 조회 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}