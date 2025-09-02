// 한국 시간 기준 퀘스트 초기화 유틸리티

// 한국 시간대 설정
const KST_OFFSET = 9 * 60; // UTC+9 (분 단위)

// 현재 한국 시간 가져오기
export function getCurrentKST(): Date {
  const utc = new Date().getTime() + (new Date().getTimezoneOffset() * 60000);
  return new Date(utc + (KST_OFFSET * 60000));
}

// 오늘 자정 (한국 시간) 가져오기
export function getTodayMidnightKST(): Date {
  const kst = getCurrentKST();
  return new Date(kst.getFullYear(), kst.getMonth(), kst.getDate());
}

// 이번 주 일요일 자정 (한국 시간) 가져오기
export function getThisWeekSundayMidnightKST(): Date {
  const kst = getCurrentKST();
  const dayOfWeek = kst.getDay(); // 0 = 일요일, 1 = 월요일, ..., 6 = 토요일
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  
  const sunday = new Date(kst);
  sunday.setDate(kst.getDate() + daysUntilSunday);
  sunday.setHours(0, 0, 0, 0);
  
  return sunday;
}

// 퀘스트 타입별 초기화 시간 확인
export function shouldResetQuest(questType: string, lastResetTime?: Date): boolean {
  if (!lastResetTime) return true;
  
  const lastReset = new Date(lastResetTime);
  
  switch (questType) {
    case 'daily':
      const todayMidnight = getTodayMidnightKST();
      return lastReset < todayMidnight;
      
    case 'weekly':
      const thisWeekSunday = getThisWeekSundayMidnightKST();
      return lastReset < thisWeekSunday;
      
    default:
      return false; // single 퀘스트는 초기화하지 않음
  }
}

// 퀘스트 타입별 다음 초기화 시간 가져오기
export function getNextResetTime(questType: string): Date {
  switch (questType) {
    case 'daily':
      const tomorrow = getTodayMidnightKST();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
      
    case 'weekly':
      const nextSunday = getThisWeekSundayMidnightKST();
      nextSunday.setDate(nextSunday.getDate() + 7);
      return nextSunday;
      
    default:
      return new Date(0); // single 퀘스트는 초기화 없음
  }
}

// 퀘스트 진행도 초기화
export function resetQuestProgress(_questType: string): { progress: number, lastResetTime: Date } {
  return {
    progress: 0,
    lastResetTime: getCurrentKST()
  };
}

// 출석 연속일 계산
import type { AttendanceRecord } from '@/types';
export function calculateConsecutiveDays(records: AttendanceRecord[]): number {
  // records: 최신 날짜부터 정렬되어 있다고 가정하지 않고 정렬
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  let consecutive = 0;
  let lastDate: string | null = null;
  for (const r of sorted) {
    if (!lastDate) {
      lastDate = r.date;
      consecutive = 1;
      continue;
    }
    // YYYY-MM-DD 또는 YYYYMMDD 둘 다 허용할 수 있으나 현재는 YYYY-MM-DD/문자열 비교 간단 처리
    const prev = new Date(lastDate.replaceAll('-', ''));
    const cur = new Date(r.date.replaceAll('-', ''));
    const diff = (cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      consecutive += 1;
      lastDate = r.date;
    } else if (diff > 1) {
      consecutive = 1;
      lastDate = r.date;
    }
  }
  return consecutive;
}
