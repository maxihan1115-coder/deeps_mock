/**
 * 시즌 관련 유틸리티 함수들
 */

/**
 * 현재 시즌 상태를 조회합니다.
 * @returns 'active' | 'ended'
 */
export async function getSeasonStatus(): Promise<'active' | 'ended'> {
  try {
    // TODO: 나중에 데이터베이스에서 시즌 상태를 관리하도록 변경
    // 현재는 환경변수로 관리
    const seasonStatus = process.env.SEASON_STATUS || 'active';
    return seasonStatus as 'active' | 'ended';
  } catch (error) {
    console.error('시즌 상태 조회 실패:', error);
    return 'active'; // 기본값은 활성 상태
  }
}

/**
 * 현재 시즌이 활성 상태인지 확인합니다.
 * @returns true if season is active, false if ended
 */
export async function isSeasonActive(): Promise<boolean> {
  const status = await getSeasonStatus();
  return status === 'active';
}

/**
 * 현재 시즌이 종료 상태인지 확인합니다.
 * @returns true if season is ended, false if active
 */
export async function isSeasonEnded(): Promise<boolean> {
  const status = await getSeasonStatus();
  return status === 'ended';
}

/**
 * 현재 시즌 정보를 조회합니다.
 * @returns 시즌 정보 객체
 */
export async function getCurrentSeasonInfo() {
  try {
    const seasonStatus = await getSeasonStatus();
    
    return {
      seasonName: '2025-01',
      seasonStartDate: new Date('2025-01-01T00:00:00+09:00'),
      seasonEndDate: new Date('2025-10-15T11:00:00+09:00'),
      isActive: seasonStatus === 'active',
      status: seasonStatus,
      daysRemaining: Math.ceil((new Date('2025-10-15T11:00:00+09:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    };
  } catch (error) {
    console.error('시즌 정보 조회 실패:', error);
    return {
      seasonName: '2025-01',
      seasonStartDate: new Date('2025-01-01T00:00:00+09:00'),
      seasonEndDate: new Date('2025-10-15T11:00:00+09:00'),
      isActive: true,
      status: 'active' as const,
      daysRemaining: 0
    };
  }
}
