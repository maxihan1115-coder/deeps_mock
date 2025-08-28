import { NextRequest, NextResponse } from 'next/server';
import { mysqlGameStore } from '@/lib/mysql-store';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { requestCode, socialCode, socialProvider } = await request.json();

    if (!requestCode || !socialCode || !socialProvider) {
      return NextResponse.json(
        { success: false, error: 'requestCode, social_code, social_provider가 필요합니다.', payload: null },
        { status: 400 }
      );
    }

    // 만료된 코드 정리
    await mysqlGameStore.cleanupExpiredCodes();

    // 임시 코드 검증
    const validation = await mysqlGameStore.validateTempCode(requestCode);

    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: '유효하지 않거나 만료된 임시 코드입니다.', payload: null },
        { status: 400 }
      );
    }

    // 여기서 실제 소셜 로그인 검증 로직이 들어가야 함
    // 현재는 목업이므로 항상 성공으로 처리

    // 사용자 정보 조회하여 UUID 가져오기
    const user = await prisma.user.findUnique({
      where: { id: validation.userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자 정보를 찾을 수 없습니다.', payload: null },
        { status: 404 }
      );
    }

    // 플랫폼 연동 정보 저장
    try {
      await prisma.platformLink.create({
        data: {
          gameUuid: user.uuid,
          platformUuid: socialCode, // 소셜 코드를 플랫폼 UUID로 사용
          platformType: socialProvider, // 소셜 프로바이더를 플랫폼 타입으로 사용
        },
      });
    } catch (error) {
      // 이미 연동된 경우 무시 (중복 연동 방지)
      console.log('Platform link already exists or error occurred:', error);
    }

    return NextResponse.json({
      success: true,
      error: null,
      payload: {
        message: '계정 연동이 완료되었습니다.',
        userId: validation.userId,
        socialProvider,
        gameUuid: user.uuid,
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
