import { NextRequest, NextResponse } from 'next/server';

// 시즌 종료 처리
export async function POST(request: NextRequest) {
  try {
    const { seasonName, periodStartDate, periodEndDate, adminUserId } = await request.json();

    // 관리자 권한 검증 (maxi.moff 계정 UUID 허용)
    const adminUuids = ['1', 1, '138afdb1-d873-4032-af80-77b5fb8a23cf'];
    if (!adminUuids.includes(adminUserId)) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    if (!seasonName || !periodStartDate || !periodEndDate) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }

    console.log(`🏁 시즌 종료 처리 시작: ${seasonName}`);

    // 1. 시즌 랭킹 계산 및 퀘스트 달성 체크
    const rankingResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/rankings/season/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        seasonName,
        periodStartDate,
        periodEndDate
      })
    });

    if (!rankingResponse.ok) {
      throw new Error('시즌 랭킹 계산에 실패했습니다.');
    }

    const rankingResult = await rankingResponse.json();
    console.log(`✅ 시즌 랭킹 계산 완료: ${rankingResult.totalRankings}명, ${rankingResult.questAchievements}개 퀘스트 달성`);

    // 2. 시즌 상태를 종료로 변경
    // TODO: 나중에 데이터베이스에서 시즌 상태를 관리하도록 변경
    // 현재는 환경변수로 관리
    process.env.SEASON_STATUS = 'ended';
    console.log(`📝 시즌 상태를 'ended'로 변경`);

    // 3. 시즌 종료 로그 기록
    console.log(`🎉 시즌 ${seasonName} 종료 완료`);
    console.log('📊 최종 랭킹:', rankingResult.rankings.slice(0, 10));

    return NextResponse.json({
      success: true,
      message: `시즌 ${seasonName} 종료 처리 완료`,
      seasonName,
      totalRankings: rankingResult.totalRankings,
      questAchievements: rankingResult.questAchievements,
      topRankings: rankingResult.rankings.slice(0, 10),
      seasonStatus: 'ended'
    });
  } catch (error) {
    console.error('시즌 종료 처리 실패:', error);
    return NextResponse.json({ error: '시즌 종료 처리에 실패했습니다.' }, { status: 500 });
  }
}
