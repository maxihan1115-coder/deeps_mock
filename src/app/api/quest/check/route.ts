import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuthToken } from '@/lib/auth-token';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';
import { shouldResetQuest, getCurrentKST } from '@/lib/quest-utils';

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

// Daily Quest 초기화 함수
async function resetDailyQuestsIfNeeded(gameUuid: number) {
  try {
    // Daily Quest 진행도 조회
    const dailyQuests = await prisma.questProgress.findMany({
      where: {
        userId: gameUuid,
        catalogId: { in: ['9', '10'] } // Daily Quest IDs
      }
    });

    const currentKST = getCurrentKST();
    
    for (const quest of dailyQuests) {
      // 마지막 업데이트 시간이 오늘 자정 이전이면 초기화
      if (shouldResetQuest('daily', quest.updatedAt)) {
        await prisma.questProgress.update({
          where: {
            userId_catalogId: {
              userId: gameUuid,
              catalogId: quest.catalogId
            }
          },
          data: {
            progress: 0,
            isCompleted: false,
            updatedAt: currentKST
          }
        });
        
        console.log(`Daily Quest ${quest.catalogId} 초기화 완료 (UUID: ${gameUuid})`);
      }
    }
  } catch (error) {
    console.error('Daily Quest 초기화 오류:', error);
  }
}

// 테트리스 게임에 맞는 퀘스트 목록 데이터
const QUEST_LIST = [
  {
    id: 1,
    title: "FIRST_GAME",
    koreanTitle: "첫 게임 플레이",
    totalTimes: 1,
    type: "game_count"
  },
  {
    id: 2,
    title: "SCORE_1000",
    koreanTitle: "1000점 달성",
    totalTimes: 1000,
    type: "max_score"
  },
  {
    id: 3,
    title: "SCORE_5000",
    koreanTitle: "5000점 달성",
    totalTimes: 5000,
    type: "max_score"
  },
  {
    id: 4,
    title: "SCORE_10000",
    koreanTitle: "10000점 달성",
    totalTimes: 10000,
    type: "max_score"
  },
  {
    id: 5,
    title: "CLEAR_LINES_10",
    koreanTitle: "10라인 클리어",
    totalTimes: 10,
    type: "total_lines"
  },
  {
    id: 6,
    title: "CLEAR_LINES_50",
    koreanTitle: "50라인 클리어",
    totalTimes: 50,
    type: "total_lines"
  },
  {
    id: 7,
    title: "REACH_LEVEL_5",
    koreanTitle: "5레벨 달성",
    totalTimes: 5,
    type: "max_level"
  },
  {
    id: 8,
    title: "REACH_LEVEL_10",
    koreanTitle: "10레벨 달성",
    totalTimes: 10,
    type: "max_level"
  },
  {
    id: 9,
    title: "PLAY_GAMES_5",
    koreanTitle: "5회 게임 플레이",
    totalTimes: 5,
    type: "daily_game_count"
  },
  {
    id: 10,
    title: "PLAY_GAMES_20",
    koreanTitle: "20회 게임 플레이",
    totalTimes: 20,
    type: "daily_game_count"
  },
  {
    id: 12,
    title: "DAILY_LOGIN",
    koreanTitle: "7일 연속 출석체크",
    totalTimes: 7,
    type: "daily_login"  // TODO: 출석 데이터 기반
  }
];

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

    // 모든 퀘스트 진행도 레코드 보장
    await ensureAllQuestProgress(parsedUuid);
    
    // Daily Quest 초기화 체크 및 실행
    await resetDailyQuestsIfNeeded(parsedUuid);

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

    // 병렬로 사용자 존재 여부와 플랫폼 연동 상태 확인
    const [user, platformLink] = await Promise.all([
      prisma.user.findUnique({
        where: { uuid: parsedUuid },
        select: { id: true, uuid: true } // 필요한 필드만 선택
      }),
      prisma.platformLink.findUnique({
        where: { gameUuid: parsedUuid },
        select: { isActive: true } // 필요한 필드만 선택
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

    // 한국시간 기준 오늘 날짜
    const today = getKoreaToday();
    
    // 한국시간 00:00~23:59를 UTC 시간으로 변환
    // 한국시간 00:00 = UTC 15:00 (전날), 한국시간 23:59 = UTC 14:59 (당일)
    const koreaStartUTC = new Date(today + 'T00:00:00.000Z');
    koreaStartUTC.setUTCHours(koreaStartUTC.getUTCHours() - 9); // UTC로 변환
    
    const koreaEndUTC = new Date(today + 'T23:59:59.999Z');
    koreaEndUTC.setUTCHours(koreaEndUTC.getUTCHours() - 9); // UTC로 변환
    
    // 병렬로 게임 데이터 조회 (성능 최적화)
    const [gameStats, attendanceCount, todayGameCount] = await Promise.all([
      // 하이스코어 데이터에서 게임 통계 계산
      prisma.highScore.aggregate({
        where: { userId: user.uuid },
        _count: { id: true },  // 총 게임 횟수
        _max: { 
          score: true,  // 최고 점수
          level: true   // 최고 레벨
        },
        _sum: { 
          lines: true   // 총 라인 수
        }
      }),
      // 출석 데이터 조회 (일일 로그인 퀘스트용)
      prisma.attendanceRecord.count({
        where: { userId: user.uuid }
      }),
      // 오늘 날짜의 게임 플레이 횟수 조회 (daily 퀘스트용, 한국시간 기준)
      prisma.highScore.count({
        where: { 
          userId: user.uuid,
          createdAt: {
            gte: koreaStartUTC,
            lt: koreaEndUTC
          }
        }
      })
    ]);

    // 게임 통계 로그는 개발 환경에서만 출력
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 게임 통계:', {
        totalGames: gameStats._count.id,
        maxScore: gameStats._max.score || 0,
        maxLevel: gameStats._max.level || 0,
        totalLines: gameStats._sum.lines || 0,
        attendanceDays: attendanceCount,
        todayGameCount: todayGameCount,
        koreaStartUTC: koreaStartUTC.toISOString(),
        koreaEndUTC: koreaEndUTC.toISOString()
      });
    }

    // 퀘스트 달성 여부 조회
    const questResults = [];
    
    for (const questId of questIds) {
      // questId를 number로 변환
      const parsedQuestId = Number.parseInt(String(questId), 10);
      
      if (!Number.isFinite(parsedQuestId)) {
        console.warn(`유효하지 않은 퀘스트 ID: ${questId}`);
        continue;
      }
      
      // 퀘스트 정보 확인
      const questInfo = QUEST_LIST.find(q => q.id === parsedQuestId);
      
      if (!questInfo) {
        const errorResponse = createErrorResponse(
          API_ERROR_CODES.INVALID_QUEST,
          '존재하지 않는 퀘스트 ID'
        );
        return NextResponse.json(
          errorResponse,
          { status: getErrorStatusCode(API_ERROR_CODES.INVALID_QUEST) }
        );
      }

      // 퀘스트 타입에 따른 현재 진행도 계산
      let currentTimes = 0;
      
      // 개발 환경에서 디버깅 로그
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 퀘스트 ${questId} 처리:`, {
          questInfo,
          gameStats: gameStats._count.id,
          todayGameCount,
          attendanceCount
        });
      }
      
      // 퀘스트 9번, 10번은 강제로 daily_game_count로 처리
      if (parsedQuestId === 9 || parsedQuestId === 10) {
        currentTimes = todayGameCount;
      } else {
        switch (questInfo.type) {
          case 'game_count':
            currentTimes = gameStats._count.id || 0;
            break;
          case 'max_score':
            currentTimes = gameStats._max.score || 0;
            break;
          case 'max_level':
            currentTimes = gameStats._max.level || 0;
            break;
          case 'total_lines':
            currentTimes = gameStats._sum.lines || 0;
            break;
          case 'daily_game_count':
            currentTimes = todayGameCount;
            break;
          case 'daily_login':
            // 연속 출석일 계산을 위해 출석 기록 조회
            const attendanceRecords = await prisma.attendanceRecord.findMany({
              where: { userId: user.uuid },
              orderBy: { date: 'desc' }
            });
            
            // 연속 출석일 계산
            let consecutiveDays = 0;
            if (attendanceRecords.length > 0) {
              const today = new Date();
              const todayStr = today.toISOString().split('T')[0];
              
              // 오늘 출석했는지 확인
              const hasTodayAttendance = attendanceRecords.some(record => record.date === todayStr);
              if (hasTodayAttendance) {
                consecutiveDays = 1; // 오늘 출석했으므로 1부터 시작
                
                // 어제부터 역순으로 연속 출석 확인
                const checkDate = new Date(today);
                for (let i = 1; i < attendanceRecords.length; i++) {
                  checkDate.setDate(checkDate.getDate() - 1);
                  const expectedDateStr = checkDate.toISOString().split('T')[0];
                  
                  // 해당 날짜에 출석 기록이 있는지 확인
                  const hasAttendanceOnDate = attendanceRecords.some(record => record.date === expectedDateStr);
                  
                  if (hasAttendanceOnDate) {
                    consecutiveDays++;
                  } else {
                    break; // 연속이 끊어짐
                  }
                }
              }
            }
            currentTimes = consecutiveDays;
            break;
          default:
            currentTimes = 0;
        }
      }
      
      // 타입별 상한 처리 (안전망)
      if (questInfo.type === 'max_score' || questInfo.type === 'max_level') {
        currentTimes = Math.min(currentTimes, questInfo.totalTimes);
      }

      // 개발 환경에서 결과 로그
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ 퀘스트 ${questId} 결과:`, {
          type: questInfo.type,
          currentTimes,
          totalTimes: questInfo.totalTimes
        });
      }

      // 상한 처리 및 달성 여부 계산
      const capped = Math.min(currentTimes, questInfo.totalTimes);
      const complete = capped >= questInfo.totalTimes;

      questResults.push({
        id: String(parsedQuestId),
        totalTimes: questInfo.totalTimes,
        currentTimes: capped,
        complete: complete
      });
    }

    // 프로덕션에서는 상세 로그 생략

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
