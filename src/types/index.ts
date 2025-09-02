// 사용자 관련 타입
export interface User {
  id: string;
  username: string;
  uuid: number;
  createdAt: Date;
  lastLoginAt: Date;
}

// 테트리스 관련 타입
export interface TetrisBlock {
  shape: number[][];
  color: string;
  x: number;
  y: number;
}

export interface TetrisGameState {
  board: number[][];
  currentBlock: TetrisBlock | null;
  nextBlock: TetrisBlock | null;
  score: number;
  level: number;
  lines: number;
  isGameOver: boolean;
  isPaused: boolean;
}

// 출석체크 관련 타입
export interface AttendanceRecord {
  id: string;
  userId: number;
  date: string;
  createdAt: Date;
}

// 퀘스트 관련 타입
export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'single';
  progress: number;
  maxProgress: number;
  reward: string | number;
  isCompleted: boolean;
  expiresAt?: Date;
  createdAt?: Date;
  lastResetTime?: Date;
  userId?: number; // 숫자 UUID (User.uuid)
}

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  error: string | null;
  payload: T;
}

// 계정 연동 관련 타입
export interface AccountLinkRequest {
  uuid: string;
}

export interface AccountLinkResponse {
  requestCode: string;
  expiresAt: Date;
}

// 퀘스트 진행도 업데이트 타입
export interface QuestProgressUpdate {
  questId: string;
  progress: number;
}
