import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 최고 점수 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '사용자 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 사용자의 최고 점수 조회
    const highScore = await prisma.highScore.findFirst({
      where: { userId },
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
    const { userId, score, level, lines } = body;

    if (!userId || score === undefined || level === undefined || lines === undefined) {
      return NextResponse.json(
        { success: false, error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 현재 최고 점수 조회
    const currentHighScore = await prisma.highScore.findFirst({
      where: { userId },
      orderBy: { score: 'desc' },
    });

    // 새로운 점수가 최고 점수보다 높거나 같으면 저장
    if (!currentHighScore || score >= currentHighScore.score) {
      const newHighScore = await prisma.highScore.create({
        data: {
          userId,
          score,
          level,
          lines,
        },
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
