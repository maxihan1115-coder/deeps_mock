import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 전체 랭킹 조회 (상위 10명)
export async function GET(_request: NextRequest) {
  try {
    // Window Function을 사용한 최적화된 랭킹 쿼리 (성능 개선)
    const rankings = await prisma.$queryRaw`
      SELECT 
        id,
        userId,
        score,
        level,
        lines,
        createdAt,
        username,
        uuid
      FROM (
        SELECT 
          h.id,
          h.userId,
          h.score,
          h.level,
          h.lines,
          h.createdAt,
          u.username,
          u.uuid,
          ROW_NUMBER() OVER (PARTITION BY h.userId ORDER BY h.score DESC, h.createdAt ASC) as rn
        FROM high_scores h
        INNER JOIN users u ON h.userId = u.id
      ) ranked
      WHERE rn = 1
      ORDER BY score DESC, createdAt ASC
      LIMIT 10
    `;

    return NextResponse.json({
      success: true,
      rankings: rankings,
    });
  } catch (error) {
    console.error('랭킹 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: '랭킹 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
