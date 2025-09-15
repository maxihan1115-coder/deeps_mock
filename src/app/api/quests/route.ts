import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';
import { mysqlGameStore } from '@/lib/mysql-store';

// 플랫폼 보상 정보 타입 정의
interface PlatformReward {
  title: string;
  claimValue: string;
  claimSymbol: string;
  claimType?: string;
}

// 플랫폼에서 퀘스트 보상 정보 가져오기
async function fetchPlatformRewards(): Promise<PlatformReward[] | null> {
  try {
    const apiKey = process.env.BAPP_API_KEY;
    console.log('🔑 BAPP_API_KEY 존재 여부:', !!apiKey);
    
    if (!apiKey) {
      console.error('BAPP_API_KEY가 설정되지 않았습니다.');
      return null;
    }
    
    const requestHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'BAPP-AUTH-TOKEN': apiKey
    };

    console.log('🌐 플랫폼 보상 API 호출 시작...');
    const response = await fetch('https://papi.boradeeps.cc/v1/quest/10006', {
      method: 'GET',
      headers: requestHeaders,
    });

    console.log('📡 플랫폼 보상 API 응답 상태:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('플랫폼 보상 정보 조회 실패:', response.status, response.statusText, errorText);
      return null;
    }

    const data = await response.json();
    console.log('📊 플랫폼 보상 API 응답 성공:', data.success);
    console.log('📊 플랫폼 보상 API payload 길이:', data.payload?.length);
    
    if (data.success && data.payload) {
      console.log('📊 첫 번째 플랫폼 보상:', data.payload[0]);
      return data.payload;
    }
    
    return null;
  } catch (error) {
    console.error('플랫폼 보상 정보 조회 중 오류:', error);
    return null;
  }
}

// 한국시간 기준 오늘 날짜 가져오기
function getKoreaToday(): string {
  const now = new Date();
  const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
  return koreaTime.toISOString().split('T')[0]; // YYYY-MM-DD 형식
}

// 모든 퀘스트 진행도 레코드 보장 함수
async function ensureAllQuestProgress(gameUuid: number) {
  try {
    // 모든 퀘스트 카탈로그 조회
    const catalogs = await prisma.questCatalog.findMany();
    
    for (const catalog of catalogs) {
      // 각 퀘스트에 대한 진행도 레코드가 없으면 생성
      await prisma.questProgress.upsert({
        where: {
          userId_catalogId: {
            userId: gameUuid,
            catalogId: catalog.id
          }
        },
        update: {}, // 이미 존재하면 업데이트하지 않음
        create: {
          userId: gameUuid,
          catalogId: catalog.id,
          progress: 0,
          isCompleted: false
        }
      });
    }
  } catch (error) {
    console.error('퀘스트 진행도 레코드 보장 오류:', error);
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
      console.log('플랫폼 보상 정보 조회 결과:', platformRewards);
      console.log('플랫폼 보상 정보 개수:', platformRewards?.length);
      if (platformRewards && platformRewards.length > 0) {
        console.log('첫 번째 플랫폼 보상 정보:', platformRewards[0]);
        // 9번, 10번 퀘스트 보상 정보 확인
        const quest9 = platformRewards.find((r: PlatformReward) => r.title === 'PLAY_GAMES_5');
        const quest10 = platformRewards.find((r: PlatformReward) => r.title === 'PLAY_GAMES_20');
        console.log('9번 퀘스트 플랫폼 보상:', quest9);
        console.log('10번 퀘스트 플랫폼 보상:', quest10);
      }
    } catch (error) {
      console.warn('플랫폼 보상 정보 조회 실패, 기본 보상으로 진행:', error);
    }
    
    // quest_progress 테이블에서 직접 진행도 조회
    const quests = await mysqlGameStore.getCatalogWithProgress(parsedGameUuid);
    
    console.log('Retrieved quests for gameUuid:', parsedGameUuid, 'count:', quests.length);
    
    // 플랫폼 보상 정보를 퀘스트에 매핑
    const questsWithRewards = quests.map(quest => {
      const platformReward = platformRewards?.find((r: PlatformReward) => r.title === quest.title);
      console.log(`🔍 퀘스트 매칭 시도:`, {
        questTitle: quest.title,
        questId: quest.id,
        platformReward: platformReward ? {
          title: platformReward.title,
          claimValue: platformReward.claimValue,
          claimSymbol: platformReward.claimSymbol
        } : null
      });
      
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
    
    // 플랫폼 보상 정보 로깅
    questsWithRewards.forEach(quest => {
      if (quest.claimSymbol) {
        console.log(`퀘스트 ${quest.id} 플랫폼 보상 정보:`, quest.claimSymbol);
      } else {
        console.log(`퀘스트 ${quest.id} 기본 보상:`, quest.reward);
      }
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