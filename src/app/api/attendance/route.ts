import { NextRequest, NextResponse } from 'next/server';
import { mysqlGameStore } from '@/lib/mysql-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameUuid = searchParams.get('gameUuid') || searchParams.get('userId');

    if (!gameUuid) {
      return NextResponse.json(
        { success: false, error: '게임 UUID가 필요합니다.', payload: null },
        { status: 400 }
      );
    }

    // gameUuid를 숫자로 파싱
    const parsedGameUuid = parseInt(gameUuid, 10);
    if (isNaN(parsedGameUuid)) {
      return NextResponse.json(
        { success: false, error: '게임 UUID는 숫자여야 합니다.', payload: null },
        { status: 400 }
      );
    }

    // 출석 기록 조회 (최근 30일)
    const attendanceRecords = await mysqlGameStore.getAttendanceRecords(parsedGameUuid);

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
