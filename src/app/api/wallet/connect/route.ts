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

        // ⭐️ 지갑 주소가 이미 다른 사용자에게 연결되어 있는지 확인
        const existingWallet = await prisma.externalWallet.findFirst({
            where: { address: address.toLowerCase() }
        });

        if (existingWallet && existingWallet.userId !== parseInt(gameUuid)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'WALLET_ALREADY_LINKED',
                    payload: '이 지갑은 이미 다른 계정에 연결되어 있습니다.'
                },
                { status: 409 }
            );
        }

        // 지갑 정보 저장 또는 업데이트 (Upsert)
        const wallet = await prisma.externalWallet.upsert({
            where: {
                userId_address: {
                    userId: parseInt(gameUuid),
                    address: address.toLowerCase(),
                },
            },
            update: {
                chain: chain || 'MATIC-AMOY',
                label: label || 'External Wallet',
                updatedAt: new Date(),
            },
            create: {
                userId: parseInt(gameUuid),
                address: address.toLowerCase(),
                chain: chain || 'MATIC-AMOY',
                label: label || 'External Wallet',
                isPrimary: true, // 첫 지갑을 기본 지갑으로 설정
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

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const gameUuid = searchParams.get('gameUuid');

        if (!gameUuid) {
            return NextResponse.json(
                { success: false, error: 'MISSING_PARAMETERS', payload: 'gameUuid가 필요합니다.' },
                { status: 400 }
            );
        }

        const wallets = await prisma.externalWallet.findMany({
            where: { userId: parseInt(gameUuid) },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            success: true,
            payload: wallets,
        });
    } catch (error: unknown) {
        console.error('지갑 조회 실패:', error);
        return NextResponse.json(
            { success: false, error: 'INTERNAL_SERVER_ERROR', payload: (error as Error).message },
            { status: 500 }
        );
    }
}
