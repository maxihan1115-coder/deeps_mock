import { NextRequest, NextResponse } from 'next/server';
import { mysqlGameStore } from '@/lib/mysql-store';

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
