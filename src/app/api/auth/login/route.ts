import { NextRequest, NextResponse } from 'next/server';
import { mysqlGameStore } from '@/lib/mysql-store';

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
    }

    // 퀘스트 초기화 (없는 경우)
    const existingQuests = await mysqlGameStore.getQuests(user.id);
    console.log('Existing quests for user:', user.id, 'count:', existingQuests.length);
    
    if (existingQuests.length === 0) {
      console.log('Initializing quests for user:', user.id);
      await mysqlGameStore.initializeQuests(user.id);
      console.log('Quests initialized, new count:', (await mysqlGameStore.getQuests(user.id)).length);
    }

    return NextResponse.json({
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
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: '로그인 중 오류가 발생했습니다.', payload: null },
      { status: 500 }
    );
  }
}
