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

    // 오늘 이미 출석했는지 확인
    const today = new Date().toISOString().split('T')[0];
    const hasAttendedToday = await mysqlGameStore.hasAttendanceToday(userId);

    if (hasAttendedToday) {
      return NextResponse.json(
        { success: false, error: '오늘 이미 출석했습니다.', payload: null },
        { status: 400 }
      );
    }

    // 출석 기록 추가
    const attendanceRecord = await mysqlGameStore.addAttendanceRecord(userId, today);

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
