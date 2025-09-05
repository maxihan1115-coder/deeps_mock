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

// 출석 연속일 계산 (7일 연속 출석체크)
import type { AttendanceRecord } from '@/types';
export function calculateConsecutiveDays(records: AttendanceRecord[]): number {
  if (records.length === 0) return 0;
  
  // 최신 날짜부터 정렬 (내림차순)
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  
  let consecutive = 0;
  const today = new Date();
  
  // 오늘 날짜를 YYYY-MM-DD 형식으로 변환
  const todayStr = today.toISOString().split('T')[0];
  
  // 오늘 출석했는지 확인
  const hasTodayAttendance = sorted.some(record => record.date === todayStr);
  if (!hasTodayAttendance) {
    // 오늘 출석하지 않았으면 연속 출석은 0
    return 0;
  }
  
  consecutive = 1; // 오늘 출석했으므로 1부터 시작
  
  // 어제부터 역순으로 연속 출석 확인
  const checkDate = new Date(today);
  for (let i = 1; i < sorted.length; i++) {
    checkDate.setDate(checkDate.getDate() - 1);
    const expectedDateStr = checkDate.toISOString().split('T')[0];
    
    // 해당 날짜에 출석 기록이 있는지 확인
    const hasAttendanceOnDate = sorted.some(record => record.date === expectedDateStr);
    
    if (hasAttendanceOnDate) {
      // 연속 출석
      consecutive++;
    } else {
      // 연속이 끊어짐
      break;
    }
  }
  
  return consecutive;
}
