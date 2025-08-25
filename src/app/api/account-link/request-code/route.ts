import { NextRequest, NextResponse } from 'next/server';
import { mysqlGameStore } from '@/lib/mysql-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uuid = searchParams.get('uuid');

    if (!uuid) {
      return NextResponse.json(
        { success: false, error: 'UUID가 필요합니다.', payload: null },
        { status: 400 }
      );
    }

    // UUID로 사용자 찾기 (UUID 필드로 검색)
    const user = await mysqlGameStore.getUserByUuid(parseInt(uuid));

    if (!user) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 UUID입니다.', payload: null },
        { status: 404 }
      );
    }

    // 임시 코드 생성
    const requestCode = await mysqlGameStore.createTempCode(user.id);

    return NextResponse.json({
      success: true,
      error: null,
      payload: requestCode,
    });
  } catch (error) {
    console.error('Request code error:', error);
    return NextResponse.json(
      { success: false, error: '임시 코드 요청 중 오류가 발생했습니다.', payload: null },
      { status: 500 }
    );
  }
}


