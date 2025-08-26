import { NextRequest, NextResponse } from 'next/server';
import { mysqlGameStore } from '@/lib/mysql-store';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    console.log('Quest API called with userId:', userId);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '사용자 ID가 필요합니다.', payload: null },
        { status: 400 }
      );
    }

    // 사용자 정보 조회하여 UUID 가져오기
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자 정보를 찾을 수 없습니다.', payload: null },
        { status: 404 }
      );
    }

    // 플랫폼 연동 완료 여부 확인
    const platformLink = await prisma.platformLink.findUnique({
      where: { gameUuid: user.uuid },
    });

    if (!platformLink) {
      return NextResponse.json(
        { 
          success: false, 
          error: '퀘스트 서비스를 이용하려면 먼저 플랫폼 연동을 완료해주세요.',
          payload: null 
        },
        { status: 403 }
      );
    }

    const quests = await mysqlGameStore.getQuests(userId);
    console.log('Retrieved quests for userId:', userId, 'count:', quests.length);

    return NextResponse.json({
      success: true,
      error: null,
      payload: quests,
    });
  } catch (error) {
    console.error('Get quests error:', error);
    return NextResponse.json(
      { success: false, error: '퀘스트 조회 중 오류가 발생했습니다.', payload: null },
      { status: 500 }
    );
  }
}
