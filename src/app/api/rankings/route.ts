import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 랭킹 데이터 저장
export async function POST(request: NextRequest) {
  try {
    const { userId, gameUuid, score, level, lines, rankingPeriod, periodStartDate, periodEndDate } = await request.json();

    if (!userId || !gameUuid || score === undefined) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }

    // 기존 랭킹 데이터가 있는지 확인
    const existingRanking = await prisma.ranking.findFirst({
      where: {
        userId,
        rankingPeriod,
        periodStartDate: new Date(periodStartDate),
      },
    });

    if (existingRanking) {
      // 기존 데이터 업데이트 (더 높은 점수로)
      if (score > existingRanking.score) {
        await prisma.ranking.update({
          where: { id: existingRanking.id },
          data: {
            score,
            level,
            lines,
            updatedAt: new Date(),
          },
        });
      }
    } else {
      // 새 랭킹 데이터 생성
      await prisma.ranking.create({
        data: {
          userId,
          gameUuid,
          score,
          level,
          lines,
          rankingPeriod,
          periodStartDate: new Date(periodStartDate),
          periodEndDate: new Date(periodEndDate),
          rankPosition: 0, // 임시로 0, 나중에 계산
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('랭킹 데이터 저장 실패:', error);
    return NextResponse.json({ error: '랭킹 데이터 저장에 실패했습니다.' }, { status: 500 });
  }
}

// 랭킹 데이터 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rankingPeriod = searchParams.get('period');
    const periodStartDate = searchParams.get('startDate');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!rankingPeriod || !periodStartDate) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
    }

    const rankings = await prisma.ranking.findMany({
      where: {
        rankingPeriod,
        periodStartDate: new Date(periodStartDate),
      },
      orderBy: {
        score: 'desc',
      },
      take: limit,
      include: {
        user: {
          select: {
            username: true,
            uuid: true,
          },
        },
      },
    });

    // BigInt를 문자열로 변환
    const serializedRankings = rankings.map(ranking => ({
      ...ranking,
      id: ranking.id.toString(),
    }));

    return NextResponse.json(serializedRankings);
  } catch (error) {
    console.error('랭킹 데이터 조회 실패:', error);
    console.error('에러 스택:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      error: '랭킹 데이터 조회에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
