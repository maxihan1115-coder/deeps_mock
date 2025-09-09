import { NextRequest, NextResponse } from 'next/server';
import { mysqlGameStore } from '@/lib/mysql-store';
import { calculateConsecutiveDays } from '@/lib/quest-utils';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { gameUuid } = await request.json();

    if (typeof gameUuid !== 'number' || !Number.isFinite(gameUuid)) {
      return NextResponse.json(
        { success: false, error: '유효한 gameUuid가 필요합니다.', payload: null },
        { status: 400 }
      );
    }

    // 오늘 이미 출석했는지 확인
    const today = new Date().toISOString().split('T')[0];
    const hasAttendedToday = await mysqlGameStore.hasAttendanceToday(gameUuid);

    if (hasAttendedToday) {
      return NextResponse.json(
        { success: false, error: '오늘 이미 출석했습니다.', payload: null },
        { status: 400 }
      );
    }

    // 출석 기록 추가
    const attendanceRecord = await mysqlGameStore.addAttendanceRecord(gameUuid, today);

    // 플랫폼 연동 상태 확인 후 퀘스트 업데이트
    try {
      const platformLink = await prisma.platformLink.findUnique({
        where: { gameUuid },
        select: { isActive: true }
      });

      if (platformLink && platformLink.isActive) {
        const attendanceRecords = await mysqlGameStore.getAttendanceRecords(gameUuid);
        const consecutiveDays = calculateConsecutiveDays(attendanceRecords);
        
        console.log('📅 출석 기록:', attendanceRecords.map(r => r.date).join(', '));
        console.log('🔢 연속 출석일 계산:', consecutiveDays, '일');
        
        // DAILY_LOGIN 퀘스트 ID: '12' - quest_progress 시스템 사용
        await mysqlGameStore.upsertQuestProgress(gameUuid, '12', Math.min(consecutiveDays, 7));
        console.log('✅ DAILY_LOGIN 퀘스트 업데이트:', consecutiveDays, '일 연속');
      } else {
        console.log('⚠️ 플랫폼 미연동 상태 - 퀘스트 진행도 업데이트 건너뜀');
      }
    } catch (error) {
      console.error('❌ DAILY_LOGIN 퀘스트 업데이트 실패:', error);
    }

    return NextResponse.json({
      success: true,
      error: null,
      payload: {
        message: '출석체크가 완료되었습니다.',
        attendanceRecord,
      },
    });
  } catch (error) {
    console.error('Attendance check error:', error);
    return NextResponse.json(
      { success: false, error: '출석체크 중 오류가 발생했습니다.', payload: null },
      { status: 500 }
    );
  }
}
