import { prisma } from './prisma';
import { getEligibleStartTime } from '@/lib/quest-utils';
import { User, AttendanceRecord, Quest, TetrisGameState } from '@/types';
import { QuestType } from '@prisma/client';
import { memoryCache, CACHE_KEYS } from '@/lib/cache';

// SQLite용으로 수정된 저장소 (MySQL과 동일한 인터페이스)

// MySQL 기반 데이터 저장소
class MySQLGameStore {
  // 카탈로그 보장: 존재하지 않으면 기본 12개를 upsert (캐싱 적용)
  async ensureQuestCatalog(): Promise<void> {
    // 캐시에서 먼저 확인
    const cachedCatalog = memoryCache.get<Array<{id: string; title: string; description: string; type: string; maxProgress: number; reward: number}>>(CACHE_KEYS.QUEST_CATALOG);
    if (cachedCatalog) {
      return; // 캐시에 있으면 DB 작업 생략
    }

    const catalog = [
      { id: '1', title: 'FIRST_GAME', description: '첫 번째 테트리스 게임', type: 'SINGLE', maxProgress: 1, reward: 5 },
      { id: '2', title: 'SCORE_1000', description: '1000점 달성', type: 'SINGLE', maxProgress: 1000, reward: 5 },
      { id: '3', title: 'SCORE_5000', description: '5000점 달성', type: 'SINGLE', maxProgress: 5000, reward: 5 },
      { id: '4', title: 'SCORE_10000', description: '10000점 달성', type: 'SINGLE', maxProgress: 10000, reward: 5 },
      { id: '5', title: 'CLEAR_LINES_10', description: '라인 10개 제거', type: 'SINGLE', maxProgress: 10, reward: 5 },
      { id: '6', title: 'CLEAR_LINES_50', description: '라인 50개 제거', type: 'SINGLE', maxProgress: 50, reward: 5 },
      { id: '7', title: 'REACH_LEVEL_5', description: '레벨 5 도달', type: 'SINGLE', maxProgress: 5, reward: 5 },
      { id: '8', title: 'REACH_LEVEL_10', description: '레벨 10 도달', type: 'SINGLE', maxProgress: 10, reward: 5 },
      { id: '9', title: 'PLAY_GAMES_5', description: '5게임 플레이', type: 'DAILY', maxProgress: 5, reward: 50 },
      { id: '10', title: 'PLAY_GAMES_20', description: '20게임 플레이', type: 'DAILY', maxProgress: 20, reward: 100 },
      { id: '12', title: 'DAILY_LOGIN', description: '7일 연속 출석체크', type: 'SINGLE', maxProgress: 7, reward: 10 },
      { id: '13', title: 'GOLD_EARN_5000', description: '5000골드 획득 (게임 회원 가입 후 30분 제한), 플랫폼 연동이 되지 않아도 퀘스트 진행도가 업데이트 됩니다.', type: 'SINGLE', maxProgress: 5000, reward: 100 },
      // 아이템 구매 퀘스트 (14~21)
      { id: '14', title: 'GACHA_5_TIMES_WEEK', description: '룰렛 5회 진행 (계정 생성 후 일주일간만 카운트)', type: 'PURCHASE', maxProgress: 5, reward: 50 },
      { id: '15', title: 'GACHA_5_TIMES_LINKED', description: '룰렛 5회 진행 (플랫폼 연동 이후 카운트)', type: 'PURCHASE', maxProgress: 5, reward: 50 },
      { id: '16', title: 'ITEM6_3_TIMES_WEEK', description: '테스트 아이템6 3회 구매 (계정 생성 후 일주일간만 카운트)', type: 'PURCHASE', maxProgress: 3, reward: 30 },
      { id: '17', title: 'ITEM6_3_TIMES_LINKED', description: '테스트 아이템6 3회 구매 (플랫폼 연동 이후 카운트)', type: 'PURCHASE', maxProgress: 3, reward: 30 },
      { id: '18', title: 'GOLD_5000_WEEK', description: '골드 5000 구매 (계정 생성 후 일주일간만 카운트, 게임플레이 골드 제외)', type: 'PURCHASE', maxProgress: 5000, reward: 100 },
      { id: '19', title: 'GOLD_5000_LINKED', description: '골드 5000 구매 (플랫폼 연동 이후 카운트, 게임플레이 골드 제외)', type: 'PURCHASE', maxProgress: 5000, reward: 100 },
      { id: '20', title: 'DIAMOND_5000_WEEK', description: '다이아 5000 구매 (계정 생성 후 일주일간만 카운트, 룰렛 다이아 제외)', type: 'PURCHASE', maxProgress: 5000, reward: 100 },
      { id: '21', title: 'DIAMOND_5000_LINKED', description: '다이아 5000 구매 (플랫폼 연동 이후 카운트, 룰렛 다이아 제외)', type: 'PURCHASE', maxProgress: 5000, reward: 100 },
      // 랭킹 퀘스트 (22~25)
      { id: '22', title: 'SEASON_RANK_1ST', description: '시즌 랭킹 1등 달성', type: 'RANKING', maxProgress: 1, reward: 1000 },
      { id: '23', title: 'SEASON_RANK_2ND', description: '시즌 랭킹 2등 달성', type: 'RANKING', maxProgress: 1, reward: 800 },
      { id: '24', title: 'SEASON_RANK_3RD', description: '시즌 랭킹 3등 달성', type: 'RANKING', maxProgress: 1, reward: 600 },
      { id: '25', title: 'SEASON_RANK_TOP10', description: '시즌 랭킹 4~10등 달성', type: 'RANKING', maxProgress: 1, reward: 400 },
    ] as const;

    for (const q of catalog) {
      await prisma.questCatalog.upsert({
        where: { id: q.id },
        update: {
          title: q.title,
          description: q.description,
          type: q.type as unknown as QuestType,
          maxProgress: q.maxProgress,
          reward: q.reward,
        },
        create: {
          id: q.id,
          title: q.title,
          description: q.description,
          type: q.type as unknown as QuestType,
          maxProgress: q.maxProgress,
          reward: q.reward,
        },
      });
    }

    // 캐시에 저장 (1시간 TTL - 카탈로그는 거의 변경되지 않음)
    memoryCache.set(CACHE_KEYS.QUEST_CATALOG, catalog, 60 * 60 * 1000);
  }

  async getCatalogWithProgress(gameUuid: number): Promise<Quest[]> {
    await this.ensureQuestCatalog();
    
    // 카탈로그는 캐시에서 가져오기 (진행도는 실시간으로 DB에서)
    let catalog;
    const cachedCatalog = memoryCache.get<Array<{id: string; title: string; description: string; type: string; maxProgress: number; reward: number}>>(CACHE_KEYS.QUEST_CATALOG);
    if (cachedCatalog) {
      catalog = cachedCatalog;
    } else {
      catalog = await prisma.questCatalog.findMany();
      // 캐시에 저장
      memoryCache.set(CACHE_KEYS.QUEST_CATALOG, catalog, 60 * 60 * 1000);
    }
    
    // 진행도는 실시간으로 DB에서 조회 (캐싱하지 않음)
    const progresses = await prisma.questProgress.findMany({ where: { userId: gameUuid } });
    
    // 13번 퀘스트의 경우 30분 제한 확인을 위해 사용자 정보 조회
    let userCreatedAt: Date | null = null;
    if (catalog.some(c => c.id === '13')) {
      const user = await prisma.user.findUnique({
        where: { uuid: gameUuid },
        select: { createdAt: true }
      });
      userCreatedAt = user?.createdAt || null;
    }
    
    const progressByCatalog = new Map(progresses.map(p => [p.catalogId, p]));
    const typeMapping: Record<QuestType, Quest['type']> = { 
      SINGLE: 'single', 
      DAILY: 'daily', 
      WEEKLY: 'weekly', 
      MONTHLY: 'monthly', 
      PURCHASE: 'single',
      RANKING: 'single' 
    };
    return catalog
      .filter(c => c.id !== '11') // 11번 퀘스트(HARD_DROP_10) 숨김 처리
      .map(c => {
        const p = progressByCatalog.get(c.id);
        
        // 13번 퀘스트의 경우 30분 제한 확인
        let isFailed = false;
        if (c.id === '13' && userCreatedAt) {
          const now = new Date();
          const thirtyMinutesLater = new Date(userCreatedAt.getTime() + 30 * 60 * 1000);
          isFailed = now > thirtyMinutesLater && !p?.isCompleted;
        }
        
        // 일주일 제한 퀘스트들 (14, 16, 18, 20) 확인
        const weekLimitedQuests = ['14', '16', '18', '20'];
        if (weekLimitedQuests.includes(c.id) && userCreatedAt) {
          const now = new Date();
          const oneWeekLater = new Date(userCreatedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
          isFailed = now > oneWeekLater && !p?.isCompleted;
        }
        
        return {
          id: c.id,
          title: c.title,
          description: c.description,
          type: typeMapping[c.type as QuestType] || 'single',
          progress: p?.progress ?? 0,
          maxProgress: c.maxProgress,
          reward: c.reward,
          isCompleted: Boolean(p?.isCompleted),
          isFailed: isFailed,
          expiresAt: undefined,
          createdAt: new Date(),
        };
      });
  }

  async upsertQuestProgress(gameUuid: number, catalogId: string, progress: number): Promise<Quest | null> {
    await this.ensureQuestCatalog();
    const catalog = await prisma.questCatalog.findUnique({ where: { id: catalogId } });
    if (!catalog) return null;
    const nextProgress = Math.min(progress, catalog.maxProgress);

    // REACH_LEVEL, SCORE 계열은 기존 진행도보다 작거나 같으면 덮어쓰지 않음
    const isReachLevel = catalog.title.startsWith('REACH_LEVEL');
    const isScoreQuest = catalog.title.startsWith('SCORE_');
    const existing = await prisma.questProgress.findUnique({
      where: { userId_catalogId: { userId: gameUuid, catalogId } },
    });

    const finalProgress = (() => {
      if (!existing) return nextProgress;
      if (isReachLevel || isScoreQuest) {
        return Math.max(existing.progress, nextProgress);
      }
      return nextProgress;
    })();

    const updated = await prisma.questProgress.upsert({
      where: { userId_catalogId: { userId: gameUuid, catalogId } },
      update: {
        progress: finalProgress,
        isCompleted: finalProgress >= catalog.maxProgress,
      },
      create: {
        userId: gameUuid,
        catalogId,
        progress: finalProgress,
        isCompleted: finalProgress >= catalog.maxProgress,
      },
    });
    const typeMapping = { SINGLE: 'single', DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly', PURCHASE: 'single' } as const;
    return {
      id: catalog.id,
      title: catalog.title,
      description: catalog.description,
      type: typeMapping[catalog.type as keyof typeof typeMapping] as Quest['type'],
      progress: updated.progress,
      maxProgress: catalog.maxProgress,
      reward: catalog.reward,
      isCompleted: updated.isCompleted,
      expiresAt: undefined,
      createdAt: new Date(),
    };
  }

  private getKstStartOfToday(): Date {
    const now = new Date();
    // UTC 시간을 KST로 변환 (UTC+9)
    const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const yyyyMmDd = kstNow.toISOString().split('T')[0];
    // KST 00:00을 UTC로 변환 (UTC-9)
    const startKst = new Date(`${yyyyMmDd}T00:00:00.000Z`);
    startKst.setTime(startKst.getTime() - (9 * 60 * 60 * 1000));
    return startKst;
  }

  async incrementDailyCatalogProgress(gameUuid: number, catalogId: string): Promise<Quest | null> {
    await this.ensureQuestCatalog();
    const catalog = await prisma.questCatalog.findUnique({ where: { id: catalogId } });
    if (!catalog) return null;

    const kstStart = this.getKstStartOfToday();
    const eligibleStart = await getEligibleStartTime(gameUuid);
    const gteDate = eligibleStart || kstStart;

    // 실제 오늘 게임 플레이 횟수를 계산 (KST 기준)
    // 이미 하이스코어가 저장된 상태이므로 +1을 하지 않음
    const todayGameCount = await prisma.highScore.count({
      where: {
        userId: gameUuid,
        createdAt: {
          gte: gteDate,
        },
      },
    });

    // 실제 진행도 계산 (상한 적용)
    const actualProgress = Math.min(todayGameCount, catalog.maxProgress);

    const updated = await prisma.questProgress.upsert({
      where: { userId_catalogId: { userId: gameUuid, catalogId } },
      update: {
        progress: actualProgress,
        isCompleted: actualProgress >= catalog.maxProgress,
      },
      create: {
        userId: gameUuid,
        catalogId,
        progress: actualProgress,
        isCompleted: actualProgress >= catalog.maxProgress,
      },
    });

    const typeMapping = { SINGLE: 'single', DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly', PURCHASE: 'single' } as const;
    return {
      id: catalog.id,
      title: catalog.title,
      description: catalog.description,
      type: typeMapping[catalog.type as keyof typeof typeMapping] as Quest['type'],
      progress: updated.progress,
      maxProgress: catalog.maxProgress,
      reward: catalog.reward,
      isCompleted: updated.isCompleted,
      expiresAt: undefined,
      createdAt: new Date(),
    };
  }

  // 하이스코어와 무관하게 직접 퀘스트 진행도 증가
  async incrementQuestProgressDirectly(gameUuid: number, catalogId: string): Promise<Quest | null> {
    await this.ensureQuestCatalog();
    const catalog = await prisma.questCatalog.findUnique({ where: { id: catalogId } });
    if (!catalog) return null;

    const kstStart = this.getKstStartOfToday();

    // 기존 진행도 조회
    const existing = await prisma.questProgress.findUnique({
      where: { userId_catalogId: { userId: gameUuid, catalogId } }
    });

    // 오늘 자정 이후의 진행도만 유효
    const lastResetTime = existing?.updatedAt || new Date(0);
    const shouldReset = lastResetTime < kstStart;
    
    let currentProgress = shouldReset ? 0 : (existing?.progress || 0);
    
    // 진행도 증가 (상한 적용)
    currentProgress = Math.min(currentProgress + 1, catalog.maxProgress);

    const updated = await prisma.questProgress.upsert({
      where: { userId_catalogId: { userId: gameUuid, catalogId } },
      update: {
        progress: currentProgress,
        isCompleted: currentProgress >= catalog.maxProgress,
        updatedAt: new Date(),
      },
      create: {
        userId: gameUuid,
        catalogId,
        progress: currentProgress,
        isCompleted: currentProgress >= catalog.maxProgress,
      },
    });

    const typeMapping = { SINGLE: 'single', DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly', PURCHASE: 'single' } as const;
    return {
      id: catalog.id,
      title: catalog.title,
      description: catalog.description,
      type: typeMapping[catalog.type as keyof typeof typeMapping] as Quest['type'],
      progress: updated.progress,
      maxProgress: catalog.maxProgress,
      reward: catalog.reward,
      isCompleted: updated.isCompleted,
      expiresAt: undefined,
      createdAt: new Date(),
    };
  }

  // 골드 획득 퀘스트 진행도 증가 (13번 퀘스트 전용)
  async incrementGoldEarnQuestProgress(gameUuid: number, earnedGold: number): Promise<Quest | null> {
    await this.ensureQuestCatalog();
    const catalog = await prisma.questCatalog.findUnique({ where: { id: '13' } });
    if (!catalog) return null;

    // 사용자 계정 생성 시간 확인
    const user = await prisma.user.findUnique({
      where: { uuid: gameUuid },
      select: { createdAt: true }
    });

    if (!user) return null;

    const now = new Date();
    const thirtyMinutesLater = new Date(user.createdAt.getTime() + 30 * 60 * 1000);

    // 30분이 경과된 경우 퀘스트 실패 처리
    if (now > thirtyMinutesLater) {
      // 기존 진행도 조회
      const existing = await prisma.questProgress.findUnique({
        where: { userId_catalogId: { userId: gameUuid, catalogId: '13' } }
      });

      // 30분 경과 시 실패 상태로 반환 (진행도는 유지)
      return {
        id: catalog.id,
        title: catalog.title,
        description: catalog.description,
        type: 'single',
        progress: existing?.progress || 0,
        maxProgress: catalog.maxProgress,
        reward: catalog.reward,
        isCompleted: false, // 실패 상태
        isFailed: true, // 실패 플래그 추가
        expiresAt: undefined,
        createdAt: new Date(),
      };
    }

    // 기존 진행도 조회
    const existing = await prisma.questProgress.findUnique({
      where: { userId_catalogId: { userId: gameUuid, catalogId: '13' } }
    });

    // 이미 완료된 경우
    if (existing && existing.isCompleted) {
      return {
        id: catalog.id,
        title: catalog.title,
        description: catalog.description,
        type: 'single',
        progress: existing.progress,
        maxProgress: catalog.maxProgress,
        reward: catalog.reward,
        isCompleted: true,
        expiresAt: undefined,
        createdAt: new Date(),
      };
    }

    // 진행도 증가
    const currentProgress = existing?.progress || 0;
    const newProgress = Math.min(currentProgress + earnedGold, catalog.maxProgress);
    const isCompleted = newProgress >= catalog.maxProgress;

    const updated = await prisma.questProgress.upsert({
      where: { userId_catalogId: { userId: gameUuid, catalogId: '13' } },
      update: {
        progress: newProgress,
        isCompleted: isCompleted,
        updatedAt: new Date(),
      },
      create: {
        userId: gameUuid,
        catalogId: '13',
        progress: newProgress,
        isCompleted: isCompleted,
      },
    });

    return {
      id: catalog.id,
      title: catalog.title,
      description: catalog.description,
      type: 'single',
      progress: updated.progress,
      maxProgress: catalog.maxProgress,
      reward: catalog.reward,
      isCompleted: updated.isCompleted,
      expiresAt: undefined,
      createdAt: new Date(),
    };
  }

  // 사용자 관련 메서드
  async createUser(username: string, uuid: number): Promise<User> {
    const user = await prisma.user.create({
      data: {
        username,
        uuid,
      },
    });

    return {
      id: user.id,
      username: user.username,
      uuid: user.uuid,
      startDate: user.startDate || undefined,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  async getUserByUuid(uuid: number): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { uuid },
    });

    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      uuid: user.uuid,
      startDate: user.startDate || undefined,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      uuid: user.uuid,
      startDate: user.startDate || undefined,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  async updateUserStartDate(uuid: number, startDate: Date): Promise<void> {
    await prisma.user.update({
      where: { uuid },
      data: { startDate },
    });
  }

  async updateLastLogin(uuid: number): Promise<void> {
    await prisma.user.update({
      where: { uuid },
      data: { lastLoginAt: new Date() },
    });
  }

  // 출석 관련 메서드
  async addAttendanceRecord(userId: number, date: string): Promise<AttendanceRecord> {
    const record = await prisma.attendanceRecord.create({
      data: {
        userId,
        date,
      },
    });

    return {
      id: record.id,
      userId: record.userId,
      date: record.date,
      createdAt: record.createdAt,
    };
  }

  async getAttendanceRecords(userId: number): Promise<AttendanceRecord[]> {
    const records = await prisma.attendanceRecord.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    return records.map(record => ({
      id: record.id,
      userId: record.userId,
      date: record.date,
      createdAt: record.createdAt,
    }));
  }

  async hasAttendanceToday(userId: number): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const record = await prisma.attendanceRecord.findFirst({
      where: {
        userId,
        date: today,
      },
    });
    return !!record;
  }

  // 게임 상태 관련 메서드
  async saveGameState(userId: number, gameState: TetrisGameState): Promise<void> {
    await prisma.gameState.upsert({
      where: { userId },
      update: {
        board: JSON.stringify(gameState.board),
        score: gameState.score,
        level: gameState.level,
        lines: gameState.lines,
        isGameOver: gameState.isGameOver,
        isPaused: gameState.isPaused,
      },
      create: {
        userId,
        board: JSON.stringify(gameState.board),
        score: gameState.score,
        level: gameState.level,
        lines: gameState.lines,
        isGameOver: gameState.isGameOver,
        isPaused: gameState.isPaused,
      },
    });
  }

  async getGameState(userId: number): Promise<TetrisGameState | null> {
    const gameState = await prisma.gameState.findUnique({
      where: { userId },
    });

    if (!gameState) return null;

    return {
      board: JSON.parse(gameState.board),
      currentBlock: null, // 게임 상태에서는 블록 정보를 저장하지 않음
      nextBlock: null, // 게임 상태에서는 블록 정보를 저장하지 않음
      score: gameState.score,
      level: gameState.level,
      lines: gameState.lines,
      isGameOver: gameState.isGameOver,
      isPaused: gameState.isPaused,
    };
  }

  // 하이스코어 관련 메서드
  async saveHighScore(userId: number, score: number, level: number, lines: number): Promise<void> {
    // 유니크([userId]) 기반 업서트 + 점수 비교를 트랜잭션으로 보호
    await prisma.$transaction(async (tx) => {
      const current = await tx.highScore.findUnique({ where: { userId } });
      if (!current) {
        await tx.highScore.create({ data: { userId, score, level, lines } });
        return;
      }
      if (score > current.score) {
        await tx.highScore.update({ where: { userId }, data: { score, level, lines } });
      }
      // 낮거나 같으면 변경 없음
    });
  }

  async getHighScore(userId: number): Promise<{ score: number; level: number; lines: number } | null> {
    const highScore = await prisma.highScore.findFirst({
      where: { userId },
      orderBy: { score: 'desc' },
    });

    if (!highScore) return null;

    return {
      score: highScore.score,
      level: highScore.level,
      lines: highScore.lines,
    };
  }

  async getHighScores(limit: number = 10): Promise<Array<{ userId: number; score: number; level: number; lines: number; username: string }>> {
    const highScores = await prisma.highScore.findMany({
      include: {
        user: true,
      },
      orderBy: { score: 'desc' },
      take: limit,
    });

    return highScores.map(hs => ({
      userId: hs.userId,
      score: hs.score,
      level: hs.level,
      lines: hs.lines,
      username: hs.user.username,
    }));
  }

  // 임시 코드 관련 메서드
  async createTempCode(userId: number, code: string, expiresAt: Date): Promise<void> {
    await prisma.tempCode.create({
      data: {
        userId,
        code,
        expiresAt,
      },
    });
  }

  async validateTempCode(code: string): Promise<{ isValid: boolean; gameUuid?: number }> {
    const tempCode = await prisma.tempCode.findUnique({
      where: { code },
    });

    if (!tempCode) {
      return { isValid: false };
    }

    if (tempCode.expiresAt < new Date()) {
      // 만료된 코드 삭제
      await prisma.tempCode.delete({
        where: { code },
      });
      return { isValid: false };
    }

    return { isValid: true, gameUuid: tempCode.userId }; // 숫자 UUID 반환
  }

  async cleanupExpiredCodes(): Promise<void> {
    await prisma.tempCode.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  // 아이템 구매 퀘스트 진행도 업데이트 메서드들
  async updateGachaQuestProgress(gameUuid: number, isLinked: boolean): Promise<void> {
    const questIds = isLinked ? ['15'] : ['14']; // 플랫폼 연동 여부에 따라 다른 퀘스트
    await this.incrementQuestProgress(gameUuid, questIds, 1);
  }

  async updateItemPurchaseQuestProgress(gameUuid: number, itemName: string, isLinked: boolean): Promise<void> {
    // 테스트 아이템6 구매인 경우만 카운트
    if (itemName === '테스트 아이템6') {
      const questIds = isLinked ? ['17'] : ['16'];
      await this.incrementQuestProgress(gameUuid, questIds, 1);
    }
  }

  async updateGoldPurchaseQuestProgress(gameUuid: number, amount: number, isLinked: boolean): Promise<void> {
    const questIds = isLinked ? ['19'] : ['18'];
    await this.incrementQuestProgress(gameUuid, questIds, amount);
  }

  async updateDiamondPurchaseQuestProgress(gameUuid: number, amount: number, isLinked: boolean): Promise<void> {
    try {
      const questIds = isLinked ? ['21'] : ['20'];
      console.log(`🔍 다이아몬드 구매 퀘스트 업데이트: 사용자 ${gameUuid}, 금액 ${amount}, 연동상태 ${isLinked}, 퀘스트ID ${questIds}`);
      await this.incrementQuestProgress(gameUuid, questIds, amount);
      console.log(`✅ 다이아몬드 구매 퀘스트 진행도 업데이트 성공`);
    } catch (error) {
      console.error(`❌ 다이아몬드 구매 퀘스트 진행도 업데이트 실패:`, error);
      throw error; // 오류를 다시 던져서 상위에서 처리할 수 있도록
    }
  }

  async incrementQuestProgress(gameUuid: number, questIds: string[], increment: number): Promise<void> {
    for (const questId of questIds) {
      // 1. 카탈로그 정보 조회
      const catalog = await prisma.questCatalog.findUnique({ where: { id: questId } });
      if (!catalog) {
        console.warn(`⚠️ 퀘스트 카탈로그를 찾을 수 없습니다: ${questId}`);
        continue;
      }

      // 2. 기존 진행도 조회
      const existing = await prisma.questProgress.findUnique({
        where: { userId_catalogId: { userId: gameUuid, catalogId: questId } }
      });

      // 3. 이미 완료된 퀘스트는 더 이상 진행도 증가하지 않음
      if (existing?.isCompleted) {
        console.log(`✅ 퀘스트 ${questId}는 이미 완료되었습니다. 진행도를 증가시키지 않습니다.`);
        continue;
      }

      // 4. 새로운 진행도 계산 (상한 적용)
      const currentProgress = existing?.progress || 0;
      const newProgress = Math.min(currentProgress + increment, catalog.maxProgress);
      
      // 5. 완료 상태 계산
      const isCompleted = newProgress >= catalog.maxProgress;

      console.log(`📊 퀘스트 ${questId} 진행도 업데이트: ${currentProgress} → ${newProgress}/${catalog.maxProgress} (완료: ${isCompleted})`);

      // 6. 업데이트
      await prisma.questProgress.upsert({
        where: { userId_catalogId: { userId: gameUuid, catalogId: questId } },
        update: {
          progress: newProgress,
          isCompleted: isCompleted,
          updatedAt: new Date(),
        },
        create: {
          userId: gameUuid,
          catalogId: questId,
          progress: newProgress,
          isCompleted: isCompleted,
        },
      });
    }
  }
}

// 싱글톤 인스턴스
export const mysqlGameStore = new MySQLGameStore();
