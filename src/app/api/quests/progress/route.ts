import { NextRequest, NextResponse } from 'next/server';
import { mysqlGameStore } from '@/lib/mysql-store';

export async function POST(request: NextRequest) {
  try {
    const { userId, questId, progress } = await request.json();

    if (!userId || !questId || progress === undefined) {
      return NextResponse.json(
        { success: false, error: '사용자 ID, 퀘스트 ID, 진행도가 필요합니다.', payload: null },
        { status: 400 }
      );
    }

    const updatedQuest = await mysqlGameStore.updateQuestProgress(userId, questId, progress);

    if (!updatedQuest) {
      return NextResponse.json(
        { success: false, error: '퀘스트를 찾을 수 없습니다.', payload: null },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      error: null,
      payload: updatedQuest,
    });
  } catch (error) {
    console.error('Update quest progress error:', error);
    return NextResponse.json(
      { success: false, error: '퀘스트 진행도 업데이트 중 오류가 발생했습니다.', payload: null },
      { status: 500 }
    );
  }
}
