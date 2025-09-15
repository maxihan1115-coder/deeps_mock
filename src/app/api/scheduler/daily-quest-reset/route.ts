import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentKST, getTodayMidnightKST } from '@/lib/quest-utils';

export async function POST(request: NextRequest) {
  try {
    // API 키 검증 (보안을 위해)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.SCHEDULER_API_KEY;
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const currentKST = getCurrentKST();
    const todayMidnight = getTodayMidnightKST();
    
    console.log('🕛 Daily Quest 스케줄러 실행 시작:', currentKST.toISOString());
    
    // 오늘 자정 이후에 이미 초기화된 퀘스트가 있는지 확인
    const alreadyResetToday = await prisma.questProgress.findFirst({
      where: {
        catalogId: { in: ['9', '10'] },
        updatedAt: { gte: todayMidnight }
      }
    });

    if (alreadyResetToday) {
      console.log('✅ Daily Quest는 이미 오늘 초기화되었습니다.');
      return NextResponse.json({
        success: true,
        message: 'Daily Quest는 이미 오늘 초기화되었습니다.',
        resetCount: 0
      });
    }

    // 모든 유저의 9번, 10번 퀘스트를 한 번에 초기화
    const resetResult = await prisma.questProgress.updateMany({
      where: {
        catalogId: { in: ['9', '10'] }
      },
      data: {
        progress: 0,
        isCompleted: false,
        updatedAt: currentKST
      }
    });
    
    console.log(`✅ Daily Quest 9번, 10번 초기화 완료 - ${resetResult.count}개 퀘스트 초기화됨`);
    
    return NextResponse.json({
      success: true,
      message: `Daily Quest 초기화 완료`,
      resetCount: resetResult.count,
      resetTime: currentKST.toISOString()
    });

  } catch (error) {
    console.error('❌ Daily Quest 스케줄러 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Daily Quest 초기화 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET 요청으로도 실행 가능 (테스트용)
export async function GET(request: NextRequest) {
  return POST(request);
}
