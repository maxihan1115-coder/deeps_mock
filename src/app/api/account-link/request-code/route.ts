import { NextRequest, NextResponse } from 'next/server';
import { mysqlGameStore } from '@/lib/mysql-store';

export async function GET(request: NextRequest) {
  console.log('🔑 Request code API called');
  try {
    const { searchParams } = new URL(request.url);
    const uuid = searchParams.get('uuid');
    console.log('📝 UUID from request:', uuid);

    if (!uuid) {
      console.log('❌ UUID missing');
      return NextResponse.json(
        { success: false, error: 'UUID가 필요합니다.', payload: null },
        { status: 400 }
      );
    }

    // UUID로 사용자 찾기 (UUID 필드로 검색)
    console.log('🔍 Looking for user with UUID:', parseInt(uuid));
    const user = await mysqlGameStore.getUserByUuid(parseInt(uuid));
    console.log('👤 User found:', user ? 'Yes' : 'No');

    if (!user) {
      console.log('❌ User not found');
      return NextResponse.json(
        { success: false, error: '유효하지 않은 UUID입니다.', payload: null },
        { status: 404 }
      );
    }

    // 임시 코드 생성
    console.log('🔐 Creating temp code for user:', user.id);
    const requestCode = await mysqlGameStore.createTempCode(user.id);
    console.log('✅ Temp code created:', requestCode.code);

    return NextResponse.json({
      success: true,
      error: null,
      payload: requestCode,
    });
  } catch (error) {
    console.error('❌ Request code error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { success: false, error: '임시 코드 요청 중 오류가 발생했습니다.', payload: null },
      { status: 500 }
    );
  }
}


