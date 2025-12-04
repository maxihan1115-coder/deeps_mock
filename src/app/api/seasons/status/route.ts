import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 시즌 상태 조회
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    // DB에서 최신 시즌 정보 조회
    const latestSeasonRanking = await prisma.ranking.findFirst({
      where: {
        rankingPeriod: 'season'
      },
      orderBy: {
        periodEndDate: 'desc'
      }
    });

    // 현재 시즌 정보 (기본값)
    let currentSeason = {
      seasonName: '2025-01',
      seasonStartDate: new Date('2025-01-01T00:00:00+09:00'),
      seasonEndDate: new Date('2025-10-15T11:00:00+09:00'),
      isActive: true,
      status: 'active' as 'active' | 'ended'
    };

    // DB에 시즌 정보가 있으면 업데이트
    if (latestSeasonRanking) {
      const endDate = new Date(latestSeasonRanking.periodEndDate);
      const year = endDate.getFullYear();
      const month = String(endDate.getMonth() + 1).padStart(2, '0');

      currentSeason = {
        seasonName: `${year}-${month}`,
        seasonStartDate: new Date(latestSeasonRanking.periodStartDate),
        seasonEndDate: endDate,
        isActive: true,
        status: 'active' as 'active' | 'ended'
      };
    }

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
