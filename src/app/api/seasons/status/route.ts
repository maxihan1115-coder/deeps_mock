import { NextRequest, NextResponse } from 'next/server';

// 시즌 상태 조회
export async function GET(_request: NextRequest) {
  try {
    // 현재 시즌 정보 (임시로 하드코딩, 나중에 데이터베이스에서 관리)
    const currentSeason = {
      seasonName: '2025-01',
      seasonStartDate: new Date('2025-01-01T00:00:00+09:00'), // 한국시간
      seasonEndDate: new Date('2025-10-15T11:00:00+09:00'), // 한국시간 2025년 10월 15일 11시
      isActive: true, // 기본값: 활성 상태
      status: 'active' as 'active' | 'ended'
    };

    // TODO: 나중에 데이터베이스에서 시즌 상태를 관리하도록 변경
    // 현재는 환경변수나 설정 파일에서 관리
    const seasonStatus = process.env.SEASON_STATUS || 'active';
    
    if (seasonStatus === 'ended') {
      currentSeason.isActive = false;
      currentSeason.status = 'ended';
    }

    return NextResponse.json({
      success: true,
      season: currentSeason
    });
  } catch (error) {
    console.error('시즌 상태 조회 실패:', error);
    return NextResponse.json({ error: '시즌 상태 조회에 실패했습니다.' }, { status: 500 });
  }
}
