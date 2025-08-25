import { prisma } from './prisma';
import { User, AttendanceRecord, Quest, TetrisGameState } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { QuestType } from '@prisma/client';

// SQLite용으로 수정된 저장소 (MySQL과 동일한 인터페이스)

// MySQL 기반 데이터 저장소
class MySQLGameStore {
  // 다음 UUID 번호를 가져오는 메서드
  private async getNextUuid(): Promise<number> {
    const lastUser = await prisma.user.findFirst({
      orderBy: { uuid: 'desc' },
    });
    
    return lastUser ? lastUser.uuid + 1 : 1;
  }
  // 사용자 관련 메서드
  async createUser(username: string): Promise<User> {
    const nextUuid = await this.getNextUuid();
    
    const user = await prisma.user.create({
      data: {
        username,
        uuid: nextUuid,
      },
    });

    return {
      id: user.id,
      username: user.username,
      uuid: user.uuid,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
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
  async addAttendanceRecord(userId: string, date: string): Promise<AttendanceRecord> {
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

  async hasAttendanceToday(userId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    
    const record = await prisma.attendanceRecord.findFirst({
      where: {
        userId,
        date: today,
      },
    });

    return !!record;
  }

  // 퀘스트 관련 메서드
  async initializeQuests(userId: string): Promise<Quest[]> {
    // 기존 퀘스트 삭제
    await prisma.quest.deleteMany({
      where: { userId },
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

    const createdQuests = await prisma.quest.createMany({
      data: questsData.map(quest => ({
        ...quest,
        userId,
      })),
    });

    // 생성된 퀘스트 조회
    const quests = await prisma.quest.findMany({
      where: { userId },
    });

    return quests.map(quest => ({
      id: quest.id,
      title: quest.title,
      description: quest.description,
      type: quest.type.toLowerCase() as Quest['type'],
      progress: quest.progress,
      maxProgress: quest.maxProgress,
      reward: quest.reward,
      isCompleted: quest.isCompleted,
      expiresAt: quest.expiresAt || undefined,
      createdAt: quest.createdAt,
    }));
  }

  async getQuests(userId: string): Promise<Quest[]> {
    const quests = await prisma.quest.findMany({
      where: { userId },
    });

    return quests.map(quest => ({
      id: quest.id,
      title: quest.title,
      description: quest.description,
      type: quest.type.toLowerCase() as Quest['type'],
      progress: quest.progress,
      maxProgress: quest.maxProgress,
      reward: quest.reward,
      isCompleted: quest.isCompleted,
      expiresAt: quest.expiresAt || undefined,
      createdAt: quest.createdAt,
    }));
  }

  async updateQuestProgress(userId: string, questId: string, progress: number): Promise<Quest | null> {
    const quest = await prisma.quest.findFirst({
      where: {
        id: questId,
        userId,
      },
    });

    if (!quest) return null;

    const updatedQuest = await prisma.quest.update({
      where: { id: questId },
      data: {
        progress: Math.min(progress, quest.maxProgress),
        isCompleted: Math.min(progress, quest.maxProgress) >= quest.maxProgress,
      },
    });

    return {
      id: updatedQuest.id,
      title: updatedQuest.title,
      description: updatedQuest.description,
      type: updatedQuest.type.toLowerCase() as Quest['type'],
      progress: updatedQuest.progress,
      maxProgress: updatedQuest.maxProgress,
      reward: updatedQuest.reward,
      isCompleted: updatedQuest.isCompleted,
      expiresAt: updatedQuest.expiresAt || undefined,
      createdAt: updatedQuest.createdAt,
    };
  }

  // 게임 상태 관련 메서드
  async saveGameState(userId: string, gameState: TetrisGameState): Promise<void> {
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

  async getGameState(userId: string): Promise<TetrisGameState | undefined> {
    const gameState = await prisma.gameState.findUnique({
      where: { userId },
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
  async createTempCode(userId: string): Promise<string> {
    const code = uuidv4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15분 후 만료

    await prisma.tempCode.create({
      data: {
        code,
        userId,
        expiresAt,
      },
    });

    return code;
  }

  async validateTempCode(code: string): Promise<{ isValid: boolean; userId?: string }> {
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

    return { isValid: true, userId: tempCode.userId };
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
