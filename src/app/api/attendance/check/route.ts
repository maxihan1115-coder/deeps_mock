import { NextRequest, NextResponse } from 'next/server';
import { mysqlGameStore } from '@/lib/mysql-store';

// 출석 기록 타입 정의
interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  createdAt: Date;
}

// 연속 출석일 계산 함수
function calculateConsecutiveDays(attendanceRecords: AttendanceRecord[]): number {
  if (attendanceRecords.length === 0) return 0;
  
  // 날짜를 내림차순으로 정렬 (최신 날짜가 먼저)
  const sortedDates = attendanceRecords
    .map(record => new Date(record.date))
    .sort((a, b) => b.getTime() - a.getTime());
  
  let consecutiveDays = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // 오늘 날짜가 없으면 0 반환
  if (sortedDates[0].getTime() !== today.getTime()) {
    return 0;
  }
  
  // 연속된 날짜 계산
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const currentDate = sortedDates[i];
    const nextDate = sortedDates[i + 1];
    
    // 하루 차이인지 확인 (밀리초 단위로 계산)
    const diffTime = currentDate.getTime() - nextDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    if (diffDays === 1) {
      consecutiveDays++;
    } else {
      break; // 연속이 끊어지면 중단
    }
  }
  
  return consecutiveDays;
}

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

    // DAILY_LOGIN 퀘스트 업데이트 (7일 연속 로그인)
    try {
      const attendanceRecords = await mysqlGameStore.getAttendanceRecords(userId);
      const consecutiveDays = calculateConsecutiveDays(attendanceRecords);
      
      // DAILY_LOGIN 퀘스트 ID: '12'
      await mysqlGameStore.updateQuestProgress(userId, '12', Math.min(consecutiveDays, 7));
      console.log('✅ DAILY_LOGIN 퀘스트 업데이트:', consecutiveDays, '일 연속');
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
