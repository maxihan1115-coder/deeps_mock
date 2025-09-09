import { prisma } from './prisma';
import { getEligibleStartTime } from '@/lib/quest-utils';
import { User, AttendanceRecord, Quest, TetrisGameState } from '@/types';
import { QuestType } from '@prisma/client';

// SQLite용으로 수정된 저장소 (MySQL과 동일한 인터페이스)

// MySQL 기반 데이터 저장소
class MySQLGameStore {
  // 카탈로그 보장: 존재하지 않으면 기본 12개를 upsert
  async ensureQuestCatalog(): Promise<void> {
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
      { id: '11', title: 'HARD_DROP_10', description: '하드 드롭 10회', type: 'SINGLE', maxProgress: 10, reward: 5 },
      { id: '12', title: 'DAILY_LOGIN', description: '7일 연속 출석체크', type: 'SINGLE', maxProgress: 7, reward: 10 },
    ] as const;

    for (const q of catalog) {
      await prisma.questCatalog.upsert({
        where: { id: q.id },
        update: {},
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
  }

  async getCatalogWithProgress(gameUuid: number): Promise<Quest[]> {
    await this.ensureQuestCatalog();
    const [catalog, progresses] = await Promise.all([
      prisma.questCatalog.findMany(),
      prisma.questProgress.findMany({ where: { userId: gameUuid } }),
    ]);
    const progressByCatalog = new Map(progresses.map(p => [p.catalogId, p]));
    const typeMapping = { SINGLE: 'once', DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly' } as const;
    return catalog.map(c => {
      const p = progressByCatalog.get(c.id);
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        type: typeMapping[c.type] as Quest['type'],
        progress: p?.progress ?? 0,
        maxProgress: c.maxProgress,
        reward: c.reward,
        isCompleted: Boolean(p?.isCompleted),
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
    const updated = await prisma.questProgress.upsert({
      where: { userId_catalogId: { userId: gameUuid, catalogId } },
      update: {
        progress: nextProgress,
        isCompleted: nextProgress >= catalog.maxProgress,
      },
      create: {
        userId: gameUuid,
        catalogId,
        progress: nextProgress,
        isCompleted: nextProgress >= catalog.maxProgress,
      },
    });
    const typeMapping = { SINGLE: 'once', DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly' } as const;
    return {
      id: catalog.id,
      title: catalog.title,
      description: catalog.description,
      type: typeMapping[catalog.type] as Quest['type'],
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
    const gteDate = eligibleStart && eligibleStart > kstStart ? eligibleStart : kstStart;

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

    const typeMapping = { SINGLE: 'once', DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly' } as const;
    return {
      id: catalog.id,
      title: catalog.title,
      description: catalog.description,
      type: typeMapping[catalog.type] as Quest['type'],
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
    await prisma.highScore.create({
      data: {
        userId,
        score,
        level,
        lines,
      },
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
}

// 싱글톤 인스턴스
export const mysqlGameStore = new MySQLGameStore();
