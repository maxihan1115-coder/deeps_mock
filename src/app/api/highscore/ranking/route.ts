import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 전체 랭킹 조회 (상위 10명)
export async function GET(_request: NextRequest) {
  try {
    // 각 사용자의 최고 점수만 조회하여 랭킹 생성 (사용자별 1개씩만)
    const rankings = await prisma.$queryRaw`
      SELECT 
        h.id,
        h.userId,
        h.score,
        h.level,
        h.lines,
        h.createdAt,
        u.username,
        u.uuid
      FROM high_scores h
      INNER JOIN users u ON h.userId = u.id
      WHERE h.id = (
        SELECT h2.id 
        FROM high_scores h2 
        WHERE h2.userId = h.userId 
        ORDER BY h2.score DESC, h2.createdAt ASC 
        LIMIT 1
      )
      ORDER BY h.score DESC, h.createdAt ASC
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
