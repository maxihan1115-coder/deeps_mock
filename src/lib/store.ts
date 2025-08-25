import { User, AttendanceRecord, Quest, TetrisGameState } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// 인메모리 데이터 저장소
class GameStore {
  private users: Map<string, User> = new Map();
  private attendanceRecords: Map<string, AttendanceRecord[]> = new Map();
  private quests: Map<string, Quest[]> = new Map();
  private gameStates: Map<string, TetrisGameState> = new Map();

  // 사용자 관련 메서드
  createUser(username: string): User {
    const user: User = {
      id: uuidv4(),
      username,
      uuid: uuidv4(),
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  getUserByUsername(username: string): User | undefined {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  updateLastLogin(userId: string): void {
    const user = this.users.get(userId);
    if (user) {
      user.lastLoginAt = new Date();
      this.users.set(userId, user);
    }
  }

  // 출석체크 관련 메서드
  addAttendanceRecord(userId: string, date: string): AttendanceRecord {
    const record: AttendanceRecord = {
      id: uuidv4(),
      userId,
      date,
      createdAt: new Date(),
    };
    
    if (!this.attendanceRecords.has(userId)) {
      this.attendanceRecords.set(userId, []);
    }
    
    this.attendanceRecords.get(userId)!.push(record);
    return record;
  }

  hasAttendanceToday(userId: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    const userRecords = this.attendanceRecords.get(userId) || [];
    return userRecords.some(record => record.date === today);
  }

  // 퀘스트 관련 메서드
  initializeQuests(userId: string): Quest[] {
    // 기존 퀘스트가 있으면 삭제
    this.quests.delete(userId);
    
    const quests: Quest[] = [
      // Daily 퀘스트
      {
        id: uuidv4(),
        title: '일일 게임 플레이',
        description: '하루에 한 번 테트리스를 플레이하세요',
        type: 'daily',
        progress: 0,
        maxProgress: 1,
        reward: 100,
        isCompleted: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24시간 후
        createdAt: new Date(),
      },
      {
        id: uuidv4(),
        title: '일일 점수 달성',
        description: '하루에 1000점을 달성하세요',
        type: 'daily',
        progress: 0,
        maxProgress: 1000,
        reward: 200,
        isCompleted: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      },
      // Weekly 퀘스트
      {
        id: uuidv4(),
        title: '주간 게임 플레이',
        description: '일주일에 7번 테트리스를 플레이하세요',
        type: 'weekly',
        progress: 0,
        maxProgress: 7,
        reward: 500,
        isCompleted: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일 후
        createdAt: new Date(),
      },
      {
        id: uuidv4(),
        title: '주간 점수 달성',
        description: '일주일에 10000점을 달성하세요',
        type: 'weekly',
        progress: 0,
        maxProgress: 10000,
        reward: 1000,
        isCompleted: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      },
      // Monthly 퀘스트
      {
        id: uuidv4(),
        title: '월간 게임 플레이',
        description: '한 달에 30번 테트리스를 플레이하세요',
        type: 'monthly',
        progress: 0,
        maxProgress: 30,
        reward: 2000,
        isCompleted: false,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30일 후
        createdAt: new Date(),
      },
      // 1회 단일 달성 퀘스트
      {
        id: uuidv4(),
        title: '첫 게임 플레이',
        description: '처음으로 테트리스를 플레이하세요',
        type: 'single',
        progress: 0,
        maxProgress: 1,
        reward: 300,
        isCompleted: false,
        createdAt: new Date(),
      },
      {
        id: uuidv4(),
        title: '10000점 달성',
        description: '한 번의 게임에서 10000점을 달성하세요',
        type: 'single',
        progress: 0,
        maxProgress: 10000,
        reward: 500,
        isCompleted: false,
        createdAt: new Date(),
      },
    ];

    this.quests.set(userId, quests);
    return quests;
  }

  getQuests(userId: string): Quest[] {
    return this.quests.get(userId) || [];
  }

  updateQuestProgress(userId: string, questId: string, progress: number): Quest | null {
    const userQuests = this.quests.get(userId);
    if (!userQuests) return null;

    const quest = userQuests.find(q => q.id === questId);
    if (!quest) return null;

    quest.progress = Math.min(progress, quest.maxProgress);
    quest.isCompleted = quest.progress >= quest.maxProgress;

    return quest;
  }

  // 게임 상태 관련 메서드
  saveGameState(userId: string, gameState: TetrisGameState): void {
    this.gameStates.set(userId, gameState);
  }

  getGameState(userId: string): TetrisGameState | undefined {
    return this.gameStates.get(userId);
  }
}

// 싱글톤 인스턴스
export const gameStore = new GameStore();
