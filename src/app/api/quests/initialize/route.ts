import { NextRequest, NextResponse } from 'next/server';
import { mysqlGameStore } from '@/lib/mysql-store';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '사용자 ID가 필요합니다.', payload: null },
        { status: 400 }
      );
    }

    console.log('Force initializing quests for userId:', userId);
    
    // 기존 퀘스트 삭제 후 새로 초기화
    const quests = await mysqlGameStore.initializeQuests(userId);
    
    console.log('Quests initialized, count:', quests.length);

    return NextResponse.json({
      success: true,
      error: null,
      payload: {
        message: '퀘스트가 초기화되었습니다.',
        quests: quests,
        count: quests.length
      },
    });
  } catch (error) {
    console.error('Initialize quests error:', error);
    return NextResponse.json(
      { success: false, error: '퀘스트 초기화 중 오류가 발생했습니다.', payload: null },
      { status: 500 }
    );
  }
}
