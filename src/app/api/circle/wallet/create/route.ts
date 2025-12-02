import { NextRequest, NextResponse } from 'next/server';
import { circleWalletService } from '@/lib/circle/CircleWalletService';
import {
    createSuccessResponse,
    createErrorResponse,
    getErrorStatusCode,
    API_ERROR_CODES
} from '@/lib/api-errors';

/**
 * POST /api/circle/wallet/create
 * Circle 지갑 생성
 */
export async function POST(request: NextRequest) {
    try {
        const { gameUuid, blockchain } = await request.json();

        // 입력 검증
        if (!gameUuid) {
            return NextResponse.json(
                createErrorResponse(API_ERROR_CODES.INVALID_INPUT, 'gameUuid가 필요합니다.'),
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

        // 지갑 생성 (이미 있으면 기존 것 반환)
        const wallet = await circleWalletService.ensureWalletExists(
            parsedGameUuid,
            blockchain || 'MATIC-AMOY'
        );

        return NextResponse.json(
            createSuccessResponse({
                walletId: wallet.walletId,
                address: wallet.address,
                blockchain: wallet.blockchain,
                state: wallet.state,
                createdAt: wallet.createdAt,
            })
        );
    } catch (error) {
        console.error('Circle 지갑 생성 중 오류:', error);
        return NextResponse.json(
            createErrorResponse(
                API_ERROR_CODES.SERVICE_UNAVAILABLE,
                error instanceof Error ? error.message : '지갑 생성 중 오류가 발생했습니다.'
            ),
            { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
        );
    }
}

/**
 * GET /api/circle/wallet/create?gameUuid=123
 * Circle 지갑 정보 조회
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
                createErrorResponse(API_ERROR_CODES.INVALID_INPUT, '지갑이 존재하지 않습니다.'),
                { status: getErrorStatusCode(API_ERROR_CODES.INVALID_INPUT) }
            );
        }

        // 잔액 조회
        const balance = await circleWalletService.getWalletBalance(wallet.walletId);

        return NextResponse.json(
            createSuccessResponse({
                walletId: wallet.walletId,
                address: wallet.address,
                blockchain: wallet.blockchain,
                state: wallet.state,
                balance: {
                    usdc: balance.usdc,
                },
                createdAt: wallet.createdAt,
            })
        );
    } catch (error) {
        console.error('Circle 지갑 조회 중 오류:', error);
        return NextResponse.json(
            createErrorResponse(
                API_ERROR_CODES.SERVICE_UNAVAILABLE,
                '지갑 조회 중 오류가 발생했습니다.'
            ),
            { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
        );
    }
}
