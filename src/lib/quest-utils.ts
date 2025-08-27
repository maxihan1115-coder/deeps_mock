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
  
  const now = getCurrentKST();
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
