import { NextRequest, NextResponse } from 'next/server';
import { circleWalletService } from '@/lib/circle/CircleWalletService';
import {
    createSuccessResponse,
    createErrorResponse,
    getErrorStatusCode,
    API_ERROR_CODES
} from '@/lib/api-errors';

/**
 * GET /api/circle/balance?gameUuid=123
 * USDC 잔액 조회
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

        // 지갑 조회
        const wallet = await circleWalletService.getWalletByUserId(parsedGameUuid);

        if (!wallet) {
            return NextResponse.json(
                createErrorResponse(
                    API_ERROR_CODES.INVALID_INPUT,
                    '지갑이 존재하지 않습니다. 먼저 지갑을 생성해주세요.'
                ),
                { status: getErrorStatusCode(API_ERROR_CODES.INVALID_INPUT) }
            );
        }

        // 실시간 잔액 조회 (Circle API)
        const balance = await circleWalletService.getWalletBalance(wallet.walletId);

        return NextResponse.json(
            createSuccessResponse({
                walletId: wallet.walletId,
                address: wallet.address,
                usdc: balance.usdc,
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
