import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 연동 완료 정보 저장
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameUuid, platformUuid, platformType } = body;

    if (!gameUuid || !platformUuid || !platformType) {
      return NextResponse.json(
        { success: false, error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 이미 연동된 게임 UUID인지 확인
    const existingLink = await prisma.platformLink.findUnique({
      where: { gameUuid },
    });

    if (existingLink) {
      return NextResponse.json(
        { 
          success: false, 
          error: '이미 연동된 게임 계정입니다.',
          linkedAt: existingLink.linkedAt,
          platformType: existingLink.platformType
        },
        { status: 409 }
      );
    }

    // 새로운 연동 정보 저장
    const platformLink = await prisma.platformLink.create({
      data: {
        gameUuid,
        platformUuid,
        platformType,
      },
    });

    return NextResponse.json({
      success: true,
      platformLink: {
        id: platformLink.id,
        gameUuid: platformLink.gameUuid,
        platformUuid: platformLink.platformUuid,
        platformType: platformLink.platformType,
        linkedAt: platformLink.linkedAt,
      },
    });
  } catch (error) {
    console.error('플랫폼 연동 저장 오류:', error);
    return NextResponse.json(
      { success: false, error: '플랫폼 연동 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 연동 정보 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameUuid = searchParams.get('gameUuid');
    const platformUuid = searchParams.get('platformUuid');

    if (!gameUuid && !platformUuid) {
      return NextResponse.json(
        { success: false, error: '조회할 UUID가 필요합니다.' },
        { status: 400 }
      );
    }

    let platformLink;
    
    if (gameUuid) {
      // 게임 UUID로 연동 정보 조회
      platformLink = await prisma.platformLink.findUnique({
        where: { gameUuid: parseInt(gameUuid) },
      });
    } else if (platformUuid) {
      // 플랫폼 UUID로 연동 정보 조회
      platformLink = await prisma.platformLink.findFirst({
        where: { platformUuid },
      });
    }

    return NextResponse.json({
      success: true,
      platformLink: platformLink ? {
        id: platformLink.id,
        gameUuid: platformLink.gameUuid,
        platformUuid: platformLink.platformUuid,
        platformType: platformLink.platformType,
        linkedAt: platformLink.linkedAt,
        isActive: platformLink.isActive,
      } : null,
    });
  } catch (error) {
    console.error('플랫폼 연동 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: '플랫폼 연동 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
