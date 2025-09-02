import { NextRequest, NextResponse } from 'next/server';
import { mysqlGameStore } from '@/lib/mysql-store';
import { calculateConsecutiveDays } from '@/lib/quest-utils';

// 출석 연속일 계산은 quest-utils의 calculateConsecutiveDays 사용

export async function POST(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!isProduction) console.log('🔐 Login API called');
  
  try {
    const { username } = await request.json();
    
    if (!isProduction) console.log('📝 Login attempt for username:', username);

    if (!username) {
      return NextResponse.json(
        { success: false, error: '사용자명이 필요합니다.', payload: null },
        { status: 400 }
      );
    }

    // 기존 사용자 확인
    let user = await mysqlGameStore.getUserByUsername(username);
    if (!isProduction) console.log('👤 User found:', user ? 'Yes' : 'No');

    // 사용자가 없으면 새로 생성 (패스워드는 무시)
    if (!user) {
      if (!isProduction) console.log('➕ Creating new user...');
      user = await mysqlGameStore.createUser(username);
      if (!isProduction) console.log('✅ New user created:', user.id);
    } else {
      // 기존 사용자의 마지막 로그인 시간 업데이트
      if (!isProduction) console.log('🔄 Updating last login...');
      await mysqlGameStore.updateLastLogin(user.id);
      if (!isProduction) console.log('✅ Last login updated');
    }

    // 병렬로 출석체크와 퀘스트 확인 처리
    const [hasAttendanceToday, existingQuests] = await Promise.all([
      mysqlGameStore.hasAttendanceToday(user.uuid), // user.id → user.uuid (숫자)
      mysqlGameStore.getQuests(user.uuid) // user.id → user.uuid (숫자)
    ]);

    // 출석체크 추가 (필요한 경우만)
    if (!hasAttendanceToday) {
      const today = new Date().toISOString().split('T')[0];
      await mysqlGameStore.addAttendanceRecord(user.uuid, today); // user.id → user.uuid (숫자)
      
      // DAILY_LOGIN 퀘스트 업데이트 (7일 연속 로그인) - 비동기로 처리
      try {
        const attendanceRecords = await mysqlGameStore.getAttendanceRecords(user.uuid); // user.id → user.uuid (숫자)
        const consecutiveDays = calculateConsecutiveDays(attendanceRecords);
        
        // DAILY_LOGIN 퀘스트 ID: '12'
        await mysqlGameStore.updateQuestProgress(user.uuid, '12', Math.min(consecutiveDays, 7)); // user.id → user.uuid (숫자)
        if (!isProduction) console.log('✅ DAILY_LOGIN 퀘스트 업데이트:', consecutiveDays, '일 연속');
      } catch (error) {
        console.error('❌ DAILY_LOGIN 퀘스트 업데이트 실패:', error);
      }
    }

    // 공통 카탈로그 구조로 전환: 개별 유저 퀘스트 초기화 제거

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
