import { NextRequest, NextResponse } from 'next/server';
import { mysqlGameStore } from '@/lib/mysql-store';
import { prisma } from '@/lib/prisma';

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

    console.log('Platform link verified for UUID:', user.uuid, 'Linked at:', platformLink.linkedAt);
    
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
