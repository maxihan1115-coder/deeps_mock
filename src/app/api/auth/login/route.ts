import { NextRequest, NextResponse } from 'next/server';
import { mysqlGameStore } from '@/lib/mysql-store';

// 연속 출석일 계산 함수
function calculateConsecutiveDays(attendanceRecords: any[]): number {
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
  console.log('🔐 Login API called');
  try {
    const { username, password } = await request.json();
    console.log('📝 Login attempt for username:', username);

    if (!username) {
      return NextResponse.json(
        { success: false, error: '사용자명이 필요합니다.', payload: null },
        { status: 400 }
      );
    }

    // 기존 사용자 확인
    console.log('🔍 Checking existing user...');
    let user = await mysqlGameStore.getUserByUsername(username);
    console.log('👤 User found:', user ? 'Yes' : 'No');

    // 사용자가 없으면 새로 생성 (패스워드는 무시)
    if (!user) {
      console.log('➕ Creating new user...');
      user = await mysqlGameStore.createUser(username);
      console.log('✅ New user created:', user.id);
    } else {
      // 기존 사용자의 마지막 로그인 시간 업데이트
      console.log('🔄 Updating last login...');
      await mysqlGameStore.updateLastLogin(user.id);
      console.log('✅ Last login updated');
    }

    // 출석체크 추가
    if (!(await mysqlGameStore.hasAttendanceToday(user.id))) {
      const today = new Date().toISOString().split('T')[0];
      await mysqlGameStore.addAttendanceRecord(user.id, today);
      
      // DAILY_LOGIN 퀘스트 업데이트 (7일 연속 로그인)
      try {
        const attendanceRecords = await mysqlGameStore.getAttendanceRecords(user.id);
        const consecutiveDays = calculateConsecutiveDays(attendanceRecords);
        
        // DAILY_LOGIN 퀘스트 ID: '12'
        await mysqlGameStore.updateQuestProgress(user.id, '12', Math.min(consecutiveDays, 7));
        console.log('✅ DAILY_LOGIN 퀘스트 업데이트:', consecutiveDays, '일 연속');
      } catch (error) {
        console.error('❌ DAILY_LOGIN 퀘스트 업데이트 실패:', error);
      }
    }

    // 퀘스트 초기화 (없는 경우)
    const existingQuests = await mysqlGameStore.getQuests(user.id);
    console.log('Existing quests for user:', user.id, 'count:', existingQuests.length);
    
    if (existingQuests.length === 0) {
      console.log('Initializing quests for user:', user.id);
      await mysqlGameStore.initializeQuests(user.id);
      console.log('Quests initialized, new count:', (await mysqlGameStore.getQuests(user.id)).length);
    }

    const response = NextResponse.json({
      success: true,
      error: null,
      payload: {
        user: {
          id: user.id,
          username: user.username,
          uuid: user.uuid,
          lastLoginAt: user.lastLoginAt,
        },
        message: '로그인 성공',
      },
    });

    // 세션 쿠키 설정 (HTTP/IP 환경 호환: secure=false, sameSite=lax)
    const sessionPayload = Buffer.from(
      JSON.stringify({ id: user.id, username: user.username, uuid: user.uuid })
    ).toString('base64');

    response.cookies.set('session', sessionPayload, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // IP/HTTP 환경 호환. HTTPS 도입 시 true로 변경 권장
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: '로그인 중 오류가 발생했습니다.', payload: null },
      { status: 500 }
    );
  }
}
