import { NextRequest, NextResponse } from 'next/server';
import { mysqlGameStore } from '@/lib/mysql-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '사용자 ID가 필요합니다.', payload: null },
        { status: 400 }
      );
    }

    // 출석 기록 조회 (최근 30일)
    const attendanceRecords = await mysqlGameStore.getAttendanceRecords(userId);

    return NextResponse.json({
      success: true,
      error: null,
      payload: attendanceRecords,
    });
  } catch (error) {
    console.error('Attendance records error:', error);
    return NextResponse.json(
      { success: false, error: '출석 기록 조회 중 오류가 발생했습니다.', payload: null },
      { status: 500 }
    );
  }
}
