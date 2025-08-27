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

    // BORA 플랫폼 API 호출하여 임시 코드 요청
    console.log('🌐 Calling BORA platform API for temp code');
    const platformResponse = await fetch(`https://api.boradeeps.cc/m/auth/v1/bapp/request-code?uuid=${uuid}`, {
      method: 'GET',
      headers: {
        'Authorization': process.env.BAPP_API_KEY || '',
        'Content-Type': 'application/json',
      },
    });

    const platformData = await platformResponse.json();
    console.log('📡 BORA platform response:', platformData);

    if (!platformResponse.ok || !platformData.success) {
      console.log('❌ BORA platform API failed');
      return NextResponse.json(
        { success: false, error: '플랫폼 임시 코드 요청에 실패했습니다.', payload: null },
        { status: platformResponse.status }
      );
    }

    // 게임 내부에도 임시 코드 저장 (검증용)
    console.log('🔐 Creating local temp code for user:', user.id);
    const localRequestCode = await mysqlGameStore.createTempCode(user.id);
    console.log('✅ Local temp code created:', localRequestCode.code);

    // 플랫폼에서 받은 코드 반환
    return NextResponse.json({
      success: true,
      error: null,
      payload: {
        code: platformData.payload.code,
        expiresAt: platformData.payload.expiresAt,
      },
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


