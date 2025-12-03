import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { gameUuid, address } = body;

        if (!gameUuid || !address) {
            return NextResponse.json(
                { success: false, error: 'MISSING_PARAMETERS', payload: '필수 파라미터가 누락되었습니다.' },
                { status: 400 }
            );
        }

        // 지갑 연결 해제 (삭제)
        await prisma.externalWallet.deleteMany({
            where: {
                userId: parseInt(gameUuid),
                address: address,
            },
        });

        return NextResponse.json({
            success: true,
            payload: '지갑 연결이 해제되었습니다.',
        });
    } catch (error: unknown) {
        console.error('지갑 연결 해제 실패:', error);
        return NextResponse.json(
            { success: false, error: 'INTERNAL_SERVER_ERROR', payload: (error as Error).message },
            { status: 500 }
        );
    }
}
