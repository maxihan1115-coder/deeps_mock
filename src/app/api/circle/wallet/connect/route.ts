import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    createSuccessResponse,
    createErrorResponse,
    getErrorStatusCode,
    API_ERROR_CODES
} from '@/lib/api-errors';

/**
 * POST /api/circle/wallet/connect
 * 외부 지갑 연결 (ExternalWallet에 저장)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { gameUuid, address, chain = 'MATIC-AMOY', label = 'MetaMask' } = body;

        if (!gameUuid || !address) {
            return NextResponse.json(
                createErrorResponse(API_ERROR_CODES.INVALID_INPUT, 'gameUuid와 address가 필요합니다.'),
                { status: getErrorStatusCode(API_ERROR_CODES.INVALID_INPUT) }
            );
        }

        const parsedGameUuid = Number.parseInt(gameUuid, 10);

        if (isNaN(parsedGameUuid)) {
            return NextResponse.json(
                createErrorResponse(API_ERROR_CODES.INVALID_USER, '유효하지 않은 gameUuid입니다.'),
                { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
            );
        }

        // 기존 지갑이 있으면 업데이트, 없으면 생성
        // 1. 해당 유저의 기존 지갑 확인
        const userWallets = await prisma.externalWallet.findMany({
            where: { userId: parsedGameUuid }
        });

        // 2. 이미 등록된 지갑 중 현재 연결하려는 주소와 다른 지갑이 있다면 삭제 (1인 1지갑 정책)
        const otherWallets = userWallets.filter(w => w.address.toLowerCase() !== address.toLowerCase());
        if (otherWallets.length > 0) {
            await prisma.externalWallet.deleteMany({
                where: {
                    id: { in: otherWallets.map(w => w.id) }
                }
            });
        }

        // 3. 현재 지갑 주소가 이미 있는지 확인
        const existingWallet = userWallets.find(w => w.address.toLowerCase() === address.toLowerCase());

        let wallet;

        if (existingWallet) {
            // 이미 존재하는 지갑이면 정보 업데이트
            wallet = await prisma.externalWallet.update({
                where: { id: existingWallet.id },
                data: {
                    isPrimary: true,
                    label,
                    chain,
                    updatedAt: new Date()
                }
            });
        } else {
            // 새로운 지갑 생성
            wallet = await prisma.externalWallet.create({
                data: {
                    userId: parsedGameUuid,
                    address: address.toLowerCase(),
                    chain,
                    label,
                    isPrimary: true
                }
            });
        }

        return NextResponse.json(
            createSuccessResponse({
                id: wallet.id,
                address: wallet.address,
                chain: wallet.chain,
                label: wallet.label,
                isPrimary: wallet.isPrimary
            })
        );
    } catch (error) {
        console.error('지갑 연결 중 오류:', error);
        return NextResponse.json(
            createErrorResponse(
                API_ERROR_CODES.SERVICE_UNAVAILABLE,
                '지갑 연결 중 오류가 발생했습니다.'
            ),
            { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
        );
    }
}
