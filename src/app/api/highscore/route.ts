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

    // 현재 최고 점수 조회 (인덱스 활용으로 최적화)
    const currentHighScore = await prisma.highScore.findFirst({
      where: { userId: gameUuid }, // 숫자 UUID 사용
      orderBy: { score: 'desc' },
      select: { score: true, level: true, lines: true, createdAt: true } // 필요한 필드만 선택
    });

    // 새로운 점수가 최고 점수보다 높거나 같으면 저장
    if (!currentHighScore || score >= currentHighScore.score) {
      const newHighScore = await prisma.highScore.create({
        data: {
          userId: gameUuid, // 숫자 UUID 사용
          score,
          level,
          lines,
        },
        select: { score: true, level: true, lines: true, createdAt: true } // 필요한 필드만 선택
      });

      return NextResponse.json({
        success: true,
        isNewRecord: !currentHighScore || score > currentHighScore.score,
        highScore: {
          score: newHighScore.score,
          level: newHighScore.level,
          lines: newHighScore.lines,
          createdAt: newHighScore.createdAt,
        },
      });
    }

    return NextResponse.json({
      success: true,
      isNewRecord: false,
      highScore: currentHighScore ? {
        score: currentHighScore.score,
        level: currentHighScore.level,
        lines: currentHighScore.lines,
        createdAt: currentHighScore.createdAt,
      } : null,
    });
  } catch (error) {
    console.error('High score 저장 오류:', error);
    return NextResponse.json(
      { success: false, error: '최고 점수 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
