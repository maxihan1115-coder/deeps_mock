import { NextRequest, NextResponse } from 'next/server';

// 현재 시즌 정보 조회
export async function GET(_request: NextRequest) {
  try {
    // 현재 시즌 정보 (임시로 하드코딩)
    const currentSeason = {
      seasonName: '2025-01',
      seasonStartDate: new Date('2025-01-01T00:00:00+09:00'), // 한국시간
      seasonEndDate: new Date('2025-10-15T11:00:00+09:00'), // 한국시간 2025년 10월 15일 11시
      isActive: true,
      daysRemaining: Math.ceil((new Date('2025-10-15T11:00:00+09:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    };

    return NextResponse.json({
      success: true,
      season: currentSeason
    });
  } catch (error) {
    console.error('현재 시즌 정보 조회 실패:', error);
    return NextResponse.json({ error: '시즌 정보 조회에 실패했습니다.' }, { status: 500 });
  }
}
