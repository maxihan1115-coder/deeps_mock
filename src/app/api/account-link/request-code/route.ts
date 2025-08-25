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

// 임시 코드 검증 함수 (다른 API에서 사용)
export async function validateRequestCode(code: string): Promise<{ isValid: boolean; userId?: string }> {
  return await mysqlGameStore.validateTempCode(code);
}

// 만료된 코드 정리 함수
export async function cleanupExpiredCodes(): Promise<void> {
  await mysqlGameStore.cleanupExpiredCodes();
}
