import { NextRequest, NextResponse } from 'next/server';
import { validateRequestCode, cleanupExpiredCodes } from '../request-code/route';

export async function POST(request: NextRequest) {
  try {
    const { requestCode, socialCode, socialProvider } = await request.json();

    if (!requestCode || !socialCode || !socialProvider) {
      return NextResponse.json(
        { success: false, error: 'request_code, social_code, social_provider가 필요합니다.', payload: null },
        { status: 400 }
      );
    }

    // 만료된 코드 정리
    await cleanupExpiredCodes();

    // 임시 코드 검증
    const validation = await validateRequestCode(requestCode);

    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: '유효하지 않거나 만료된 임시 코드입니다.', payload: null },
        { status: 400 }
      );
    }

    // 여기서 실제 소셜 로그인 검증 로직이 들어가야 함
    // 현재는 목업이므로 항상 성공으로 처리

    return NextResponse.json({
      success: true,
      error: null,
      payload: {
        message: '계정 연동이 완료되었습니다.',
        userId: validation.userId,
        socialProvider,
      },
    });
  } catch (error) {
    console.error('Verify account link error:', error);
    return NextResponse.json(
      { success: false, error: '계정 연동 검증 중 오류가 발생했습니다.', payload: null },
      { status: 500 }
    );
  }
}
