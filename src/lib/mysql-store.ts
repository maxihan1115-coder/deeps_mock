import { prisma } from './prisma';
import { User, AttendanceRecord, Quest, TetrisGameState } from '@/types';
import { v4 as uuidv4 } from 'uuid';
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
      { id: '7', title: 'REACH_LEVEL_5', description: '레벨 5 도달', type: 'SINGLE', maxProgress: 1, reward: 5 },
      { id: '8', title: 'REACH_LEVEL_10', description: '레벨 10 도달', type: 'SINGLE', maxProgress: 1, reward: 5 },
      { id: '9', title: 'PLAY_GAMES_5', description: '5게임 플레이', type: 'DAILY', maxProgress: 5, reward: 50 },
      { id: '10', title: 'PLAY_GAMES_20', description: '20게임 플레이', type: 'WEEKLY', maxProgress: 20, reward: 100 },
      { id: '11', title: 'HARD_DROP_10', description: '하드 드롭 10회', type: 'SINGLE', maxProgress: 10, reward: 5 },
      { id: '12', title: 'DAILY_LOGIN', description: '연속 로그인 7일', type: 'DAILY', maxProgress: 7, reward: 10 },
    ] as const;

    for (const q of catalog) {
      await prisma.questCatalog.upsert({
        where: { id: q.id },
        update: {},
        create: {
          id: q.id,
          title: q.title,
          description: q.description,
          type: q.type as any,
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
  // 다음 UUID 번호를 가져오는 메서드
  private async getNextUuid(): Promise<number> {
    const lastUser = await prisma.user.findFirst({
      orderBy: { uuid: 'desc' },
    });
    
    return lastUser ? lastUser.uuid + 1 : 1;
  }
  // 사용자 관련 메서드
  async createUser(username: string): Promise<User> {
    console.log('🏗️ Creating user in database:', username);
    try {
      const nextUuid = await this.getNextUuid();
      console.log('🔢 Next UUID:', nextUuid);
      
      const user = await prisma.user.create({
        data: {
          username,
          uuid: nextUuid,
        },
      });
      console.log('✅ User created successfully:', user.id);

      return {
        id: user.id,
        username: user.username,
        uuid: user.uuid,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      };
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | undefined> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) return undefined;

    return {
      id: user.id,
      username: user.username,
      uuid: user.uuid,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) return undefined;

    return {
      id: user.id,
      username: user.username,
      uuid: user.uuid,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  async getUserByUuid(uuid: number): Promise<User | undefined> {
    const user = await prisma.user.findUnique({
      where: { uuid },
    });

    if (!user) return undefined;

    return {
      id: user.id,
      username: user.username,
      uuid: user.uuid,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  async updateLastLogin(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  // 출석체크 관련 메서드
  async addAttendanceRecord(gameUuid: number, date: string): Promise<AttendanceRecord> {
    const record = await prisma.attendanceRecord.create({
      data: {
        userId: gameUuid, // 숫자 UUID 사용
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

  async hasAttendanceToday(gameUuid: number): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    
    const record = await prisma.attendanceRecord.findFirst({
      where: {
        userId: gameUuid, // 숫자 UUID 사용
        date: today,
      },
    });

    return !!record;
  }

  async getAttendanceRecords(gameUuid: number): Promise<AttendanceRecord[]> {
    const records = await prisma.attendanceRecord.findMany({
      where: {
        userId: gameUuid, // 숫자 UUID 사용
      },
      orderBy: {
        date: 'desc',
      },
      take: 30, // 최근 30일
    });

    return records.map(record => ({
      id: record.id,
      userId: record.userId,
      date: record.date,
      createdAt: record.createdAt,
    }));
  }

  // 퀘스트 관련 메서드
  async initializeQuests(gameUuid: number): Promise<Quest[]> {
          // 기존 퀘스트 삭제
      await prisma.quest.deleteMany({
        where: { userId: gameUuid }, // 숫자 UUID 직접 사용
      });

    const questsData = [
      // Daily 퀘스트
      {
        title: '일일 게임 플레이',
        description: '하루에 한 번 테트리스를 플레이하세요',
        type: QuestType.DAILY,
        progress: 0,
        maxProgress: 1,
        reward: 100,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      {
        title: '일일 점수 달성',
        description: '하루에 1000점을 달성하세요',
        type: QuestType.DAILY,
        progress: 0,
        maxProgress: 1000,
        reward: 200,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      // Weekly 퀘스트
      {
        title: '주간 게임 플레이',
        description: '일주일에 7번 테트리스를 플레이하세요',
        type: QuestType.WEEKLY,
        progress: 0,
        maxProgress: 7,
        reward: 500,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        title: '주간 점수 달성',
        description: '일주일에 10000점을 달성하세요',
        type: QuestType.WEEKLY,
        progress: 0,
        maxProgress: 10000,
        reward: 1000,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      // Monthly 퀘스트
      {
        title: '월간 게임 플레이',
        description: '한 달에 30번 테트리스를 플레이하세요',
        type: QuestType.MONTHLY,
        progress: 0,
        maxProgress: 30,
        reward: 2000,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      // 1회 단일 달성 퀘스트
      {
        title: '첫 게임 플레이',
        description: '처음으로 테트리스를 플레이하세요',
        type: QuestType.SINGLE,
        progress: 0,
        maxProgress: 1,
        reward: 300,
        expiresAt: null,
      },
      {
        title: '10000점 달성',
        description: '한 번의 게임에서 10000점을 달성하세요',
        type: QuestType.SINGLE,
        progress: 0,
        maxProgress: 10000,
        reward: 500,
        expiresAt: null,
      },
    ];

    await prisma.quest.createMany({
      data: questsData.map(quest => ({
        ...quest,
        userId: gameUuid, // 숫자 UUID 직접 사용
      })),
    });

    // 생성된 퀘스트 조회
    const quests = await prisma.quest.findMany({
      where: { userId: gameUuid }, // 숫자 UUID 직접 사용
    });

    // 타입 매핑: Prisma enum -> 코드 타입
    const typeMapping = {
      'SINGLE': 'once',
      'DAILY': 'daily',
      'WEEKLY': 'weekly',
      'MONTHLY': 'monthly'
    };

    return quests.map(quest => ({
      id: quest.id,
      title: quest.title,
      description: quest.description,
      type: typeMapping[quest.type] as Quest['type'] || 'once',
      progress: quest.progress,
      maxProgress: quest.maxProgress,
      reward: quest.reward,
      isCompleted: quest.isCompleted,
      expiresAt: quest.expiresAt || undefined,
      createdAt: quest.createdAt,
    }));
  }

  async getQuests(gameUuid: number): Promise<Quest[]> {
    const quests = await prisma.quest.findMany({
      where: { userId: gameUuid }, // 숫자 UUID 직접 사용
    });

    // 타입 매핑: Prisma enum -> 코드 타입
    const typeMapping = {
      'SINGLE': 'once',
      'DAILY': 'daily',
      'WEEKLY': 'weekly',
      'MONTHLY': 'monthly'
    };

    return quests.map(quest => ({
      id: quest.id,
      title: quest.title,
      description: quest.description,
      type: typeMapping[quest.type] as Quest['type'] || 'once',
      progress: quest.progress,
      maxProgress: quest.maxProgress,
      reward: quest.reward,
      isCompleted: quest.isCompleted,
      expiresAt: quest.expiresAt || undefined,
      createdAt: quest.createdAt,
    }));
  }

  async getQuestById(gameUuid: number, questId: string): Promise<Quest | null> {
    const quest = await prisma.quest.findFirst({
      where: {
        id: questId,
        userId: gameUuid, // 숫자 UUID 직접 사용
      },
    });

    if (!quest) return null;

    // 타입 매핑: Prisma enum -> 코드 타입
    const typeMapping = {
      'SINGLE': 'once',
      'DAILY': 'daily',
      'WEEKLY': 'weekly',
      'MONTHLY': 'monthly'
    };

    return {
      id: quest.id,
      title: quest.title,
      description: quest.description,
      type: typeMapping[quest.type] as Quest['type'] || 'once',
      progress: quest.progress,
      maxProgress: quest.maxProgress,
      reward: quest.reward,
      isCompleted: quest.isCompleted,
      expiresAt: quest.expiresAt || undefined,
      createdAt: quest.createdAt,
      lastResetTime: quest.lastResetTime || undefined,
    };
  }

  async updateQuestProgress(
    gameUuid: number, 
    questId: string, 
    progress: number, 
    lastResetTime?: Date
  ): Promise<Quest | null> {
    console.log(`🔍 updateQuestProgress 호출: gameUuid=${gameUuid}, questId=${questId}, progress=${progress}`);
    
    try {
      const quest = await prisma.quest.findFirst({
        where: {
          id: questId,
          userId: gameUuid, // 숫자 UUID 직접 사용
        },
      });

      console.log(`🔍 퀘스트 조회 결과:`, quest);

      if (!quest) {
        console.log(`❌ 퀘스트를 찾을 수 없음: gameUuid=${gameUuid}, questId=${questId}`);
        return null;
      }

    const updateData: {
      progress: number;
      isCompleted: boolean;
      lastResetTime?: Date;
    } = {
      progress: Math.min(progress, quest.maxProgress),
      isCompleted: Math.min(progress, quest.maxProgress) >= quest.maxProgress,
    };

    // lastResetTime이 제공된 경우 업데이트
    if (lastResetTime) {
      updateData.lastResetTime = lastResetTime;
    }

      console.log(`🔧 업데이트 데이터:`, updateData);
      
      const updatedQuest = await prisma.quest.update({
        where: { id: questId },
        data: updateData,
      });
      
      console.log(`✅ 퀘스트 업데이트 성공:`, updatedQuest);

    // 타입 매핑: Prisma enum -> 코드 타입
    const typeMapping = {
      'SINGLE': 'once',
      'DAILY': 'daily',
      'WEEKLY': 'weekly',
      'MONTHLY': 'monthly'
    };

          return {
        id: updatedQuest.id,
        title: updatedQuest.title,
        description: updatedQuest.description,
        type: typeMapping[updatedQuest.type] as Quest['type'] || 'once',
        progress: updatedQuest.progress,
        maxProgress: updatedQuest.maxProgress,
        reward: updatedQuest.reward,
        isCompleted: updatedQuest.isCompleted,
        expiresAt: updatedQuest.expiresAt || undefined,
        createdAt: updatedQuest.createdAt,
        lastResetTime: updatedQuest.lastResetTime || undefined,
      };
    } catch (error) {
      console.error(`❌ updateQuestProgress 오류 발생:`, error);
      console.error(`오류 상세:`, {
        gameUuid,
        questId,
        progress,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error; // 상위로 전파
    }
  }

  async createQuest(
    gameUuid: number,
    questId: string,
    title: string,
    maxProgress: number,
    reward: number,
    type: 'once' | 'daily' | 'weekly'
  ): Promise<Quest | null> {
    try {
      // 타입 매핑: 코드 타입 -> Prisma enum
      const typeMapping = {
        'once': 'SINGLE',
        'daily': 'DAILY', 
        'weekly': 'WEEKLY'
      };
      
      const quest = await prisma.quest.create({
        data: {
          id: questId,
          userId: gameUuid, // 숫자 UUID 직접 사용
          title,
          description: title, // 기본적으로 title을 description으로 사용
          type: typeMapping[type] as QuestType,
          progress: 0,
          maxProgress,
          reward,
          isCompleted: false,
        },
      });

      // 타입 매핑: Prisma enum -> 코드 타입
      const typeReverseMapping = {
        'SINGLE': 'once',
        'DAILY': 'daily',
        'WEEKLY': 'weekly',
        'MONTHLY': 'monthly'
      };

      return {
        id: quest.id,
        title: quest.title,
        description: quest.description,
        type: typeReverseMapping[quest.type] as Quest['type'] || 'once',
        progress: quest.progress,
        maxProgress: quest.maxProgress,
        reward: quest.reward,
        isCompleted: quest.isCompleted,
        expiresAt: quest.expiresAt || undefined,
        createdAt: quest.createdAt,
        lastResetTime: quest.lastResetTime || undefined,
      };
    } catch (error) {
      console.error('Create quest error:', error);
      return null;
    }
  }

  // 게임 상태 관련 메서드
  async saveGameState(gameUuid: number, gameState: TetrisGameState): Promise<void> {
    await prisma.gameState.upsert({
      where: { userId: gameUuid }, // 숫자 UUID 직접 사용
      update: {
        board: JSON.stringify(gameState.board),
        score: gameState.score,
        level: gameState.level,
        lines: gameState.lines,
        isGameOver: gameState.isGameOver,
        isPaused: gameState.isPaused,
      },
      create: {
        userId: gameUuid, // 숫자 UUID 직접 사용
        board: JSON.stringify(gameState.board),
        score: gameState.score,
        level: gameState.level,
        lines: gameState.lines,
        isGameOver: gameState.isGameOver,
        isPaused: gameState.isPaused,
      },
    });
  }

  async getGameState(gameUuid: number): Promise<TetrisGameState | undefined> {
    const gameState = await prisma.gameState.findUnique({
      where: { userId: gameUuid }, // 숫자 UUID 직접 사용
    });

    if (!gameState) return undefined;

    return {
      board: JSON.parse(gameState.board),
      currentBlock: null, // 게임 시작 시 새로 생성
      nextBlock: null,    // 게임 시작 시 새로 생성
      score: gameState.score,
      level: gameState.level,
      lines: gameState.lines,
      isGameOver: gameState.isGameOver,
      isPaused: gameState.isPaused,
    };
  }

  // 임시 코드 관련 메서드
  async createTempCode(gameUuid: number): Promise<{ code: string; expiresAt: Date }> {
    console.log('🔐 Creating temp code for user:', gameUuid);
    try {
      const code = uuidv4();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15분 후 만료
      console.log('🔑 Generated code:', code);
      console.log('⏰ Expires at:', expiresAt);

      await prisma.tempCode.create({
        data: {
          code,
          userId: gameUuid, // 숫자 UUID 직접 사용
          expiresAt,
        },
      });
      console.log('✅ Temp code saved to database');

      return { code, expiresAt };
    } catch (error) {
      console.error('❌ Error creating temp code:', error);
      throw error;
    }
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
