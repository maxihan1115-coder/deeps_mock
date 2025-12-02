import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { gameUuid, address, chain, label } = body;

        if (!gameUuid || !address) {
            return NextResponse.json(
                { success: false, error: 'MISSING_PARAMETERS', payload: '필수 파라미터가 누락되었습니다.' },
                { status: 400 }
            );
        }

        // 유저 존재 확인
        const user = await prisma.user.findUnique({
            where: { uuid: parseInt(gameUuid) },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'USER_NOT_FOUND', payload: '사용자를 찾을 수 없습니다.' },
                { status: 404 }
            );
        }

        // 지갑 정보 저장 또는 업데이트 (Upsert)
        const wallet = await prisma.externalWallet.upsert({
            where: {
                userId_address: {
                    userId: parseInt(gameUuid),
                    address: address,
                },
            },
            update: {
                chain: chain || 'MATIC-AMOY',
                label: label || 'External Wallet',
                updatedAt: new Date(),
            },
            create: {
                userId: parseInt(gameUuid),
                address: address,
                chain: chain || 'MATIC-AMOY',
                label: label || 'External Wallet',
                isPrimary: true, // 첫 지갑을 기본 지갑으로 설정 (로직 개선 가능)
            },
        });

        return NextResponse.json({
            success: true,
            payload: wallet,
        });
    } catch (error: unknown) {
        console.error('지갑 연결 저장 실패:', error);
        return NextResponse.json(
            { success: false, error: 'INTERNAL_SERVER_ERROR', payload: (error as Error).message },
            { status: 500 }
        );
    }
}
