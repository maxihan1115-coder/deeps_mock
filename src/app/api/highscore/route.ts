import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 최고 점수 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameUuid = searchParams.get('gameUuid') || searchParams.get('userId');

    if (!gameUuid) {
      return NextResponse.json(
        { success: false, error: '게임 UUID가 필요합니다.' },
        { status: 400 }
      );
    }

    // gameUuid를 숫자로 파싱
    const parsedGameUuid = parseInt(gameUuid, 10);
    if (isNaN(parsedGameUuid)) {
      return NextResponse.json(
        { success: false, error: '게임 UUID는 숫자여야 합니다.' },
        { status: 400 }
      );
    }

    console.log('하이스코어 조회 요청:', { gameUuid, parsedGameUuid, type: typeof parsedGameUuid });

    // 사용자의 최고 점수 조회
    const highScore = await prisma.highScore.findFirst({
      where: { userId: parsedGameUuid }, // 숫자 UUID 사용
      orderBy: { score: 'desc' },
    });

    return NextResponse.json({
      success: true,
      highScore: highScore ? {
        score: highScore.score,
        level: highScore.level,
        lines: highScore.lines,
        createdAt: highScore.createdAt,
      } : null,
    });
  } catch (error) {
    console.error('High score 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: '최고 점수 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 최고 점수 저장
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('하이스코어 API 요청 받음:', body);
    console.log('요청 데이터 타입:', {
      gameUuid: typeof body.gameUuid,
      score: typeof body.score,
      level: typeof body.level,
      lines: typeof body.lines
    });
    
    const { gameUuid, score, level, lines } = body; // userId → gameUuid

    if (!gameUuid || score === undefined || level === undefined || lines === undefined) {
      console.error('하이스코어 API 400 에러: 필수 정보 누락', { gameUuid, score, level, lines });
      return NextResponse.json(
        { success: false, error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // gameUuid가 숫자인지 확인
    if (typeof gameUuid !== 'number' || !Number.isFinite(gameUuid)) {
      console.error('하이스코어 API 400 에러: gameUuid 타입 오류', { gameUuid, type: typeof gameUuid });
      return NextResponse.json(
        { success: false, error: '게임 UUID는 숫자여야 합니다.' },
        { status: 400 }
      );
    }

    // 트랜잭션: HighScore 업서트 + Ranking 업서트 (동시 호출 안전)
    const result = await prisma.$transaction(async (tx) => {
      const currentHigh = await tx.highScore.findUnique({
        where: { userId: gameUuid },
        select: { score: true, level: true, lines: true, createdAt: true }
      });

      let finalHigh = currentHigh;
      let isNewRecord = false;

      if (!currentHigh) {
        finalHigh = await tx.highScore.create({
          data: { userId: gameUuid, score, level, lines },
          select: { score: true, level: true, lines: true, createdAt: true }
        });
        isNewRecord = true;
      } else if (score > currentHigh.score) {
        finalHigh = await tx.highScore.update({
          where: { userId: gameUuid },
          data: { score, level, lines },
          select: { score: true, level: true, lines: true, createdAt: true }
        });
        isNewRecord = true;
      }

      // 랭킹 업서트
      const user = await tx.user.findUnique({ where: { uuid: gameUuid }, select: { id: true } });
      if (user) {
        const periodStartDate = new Date('2025-01-01T00:00:00+09:00');
        const periodEndDate = new Date('2025-10-15T11:00:00+09:00');
        const existingRanking = await tx.ranking.findFirst({
          where: { userId: user.id, rankingPeriod: 'season', periodStartDate }
        });
        if (!existingRanking) {
          await tx.ranking.create({
            data: { userId: user.id, gameUuid, score, level, lines, rankingPeriod: 'season', periodStartDate, periodEndDate, rankPosition: 0 }
          });
        } else if (score > existingRanking.score) {
          await tx.ranking.update({ where: { id: existingRanking.id }, data: { score, level, lines } });
        }
      }

      return { finalHigh, isNewRecord };
    });

    return NextResponse.json({
      success: true,
      isNewRecord: result.isNewRecord,
      highScore: result.finalHigh ? {
        score: result.finalHigh.score,
        level: result.finalHigh.level,
        lines: result.finalHigh.lines,
        createdAt: result.finalHigh.createdAt,
      } : null,
    });
  } catch (error) {
    console.error('High score 저장 오류:', error);
    console.error('에러 스택:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        success: false, 
        error: '최고 점수 저장 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
