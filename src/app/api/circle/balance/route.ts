import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUSDCBalance } from '@/lib/blockchain/usdcBalance';
import {
    createSuccessResponse,
    createErrorResponse,
    getErrorStatusCode,
    API_ERROR_CODES
} from '@/lib/api-errors';

/**
 * GET /api/circle/balance?gameUuid=123
 * 외부 지갑 주소 및 USDC 잔액 조회
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const gameUuidParam = searchParams.get('gameUuid');

        if (!gameUuidParam) {
            return NextResponse.json(
                createErrorResponse(API_ERROR_CODES.INVALID_INPUT, 'gameUuid가 필요합니다.'),
                { status: getErrorStatusCode(API_ERROR_CODES.INVALID_INPUT) }
            );
        }

        const parsedGameUuid = Number.parseInt(gameUuidParam, 10);

        if (isNaN(parsedGameUuid)) {
            return NextResponse.json(
                createErrorResponse(API_ERROR_CODES.INVALID_USER, '유효하지 않은 gameUuid입니다.'),
                { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
            );
        }

        // 외부 지갑 조회 (ExternalWallet)
        const externalWallet = await prisma.externalWallet.findFirst({
            where: {
                userId: parsedGameUuid,
                isPrimary: true
            }
        });

        if (!externalWallet) {
            // 외부 지갑이 없으면 기본값 반환
            return NextResponse.json(
                createSuccessResponse({
                    walletId: null,
                    address: null,
                    usdc: '0',
                    updatedAt: new Date().toISOString(),
                })
            );
        }

        // 블록체인에서 USDC 잔액 조회
        const balance = await getUSDCBalance(externalWallet.address);

        return NextResponse.json(
            createSuccessResponse({
                walletId: externalWallet.id,
                address: externalWallet.address,
                usdc: balance,
                updatedAt: new Date().toISOString(),
            })
        );
    } catch (error) {
        console.error('잔액 조회 중 오류:', error);
        return NextResponse.json(
            createErrorResponse(
                API_ERROR_CODES.SERVICE_UNAVAILABLE,
                '잔액 조회 중 오류가 발생했습니다.'
            ),
            { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
        );
    }
}
