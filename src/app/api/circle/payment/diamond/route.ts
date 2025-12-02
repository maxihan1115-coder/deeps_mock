import { NextRequest, NextResponse } from 'next/server';
import { circlePaymentService } from '@/lib/circle/CirclePaymentService';
import {
    createSuccessResponse,
    createErrorResponse,
    getErrorStatusCode,
    API_ERROR_CODES
} from '@/lib/api-errors';

/**
 * POST /api/circle/payment/diamond
 * USDC로 다이아몬드 구매
 */
export async function POST(request: NextRequest) {
    try {
        const { gameUuid, diamondAmount, usdcAmount } = await request.json();

        // 입력 검증
        if (!gameUuid || !diamondAmount || !usdcAmount) {
            return NextResponse.json(
                createErrorResponse(API_ERROR_CODES.INVALID_INPUT, '필수 입력값이 누락되었습니다.'),
                { status: getErrorStatusCode(API_ERROR_CODES.INVALID_INPUT) }
            );
        }

        const parsedGameUuid = Number.parseInt(gameUuid, 10);
        const parsedDiamondAmount = Number.parseInt(diamondAmount, 10);
        const parsedUsdcAmount = parseFloat(usdcAmount);

        if (isNaN(parsedGameUuid)) {
            return NextResponse.json(
                createErrorResponse(API_ERROR_CODES.INVALID_USER, '유효하지 않은 gameUuid입니다.'),
                { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
            );
        }

        if (isNaN(parsedDiamondAmount) || parsedDiamondAmount <= 0) {
            return NextResponse.json(
                createErrorResponse(API_ERROR_CODES.INVALID_INPUT, '다이아몬드 수량이 유효하지 않습니다.'),
                { status: getErrorStatusCode(API_ERROR_CODES.INVALID_INPUT) }
            );
        }

        if (isNaN(parsedUsdcAmount) || parsedUsdcAmount <= 0) {
            return NextResponse.json(
                createErrorResponse(API_ERROR_CODES.INVALID_INPUT, 'USDC 금액이 유효하지 않습니다.'),
                { status: getErrorStatusCode(API_ERROR_CODES.INVALID_INPUT) }
            );
        }

        // 최소 구매 금액 검증 (0.01 USDC)
        if (parsedUsdcAmount < 0.01) {
            return NextResponse.json(
                createErrorResponse(API_ERROR_CODES.INVALID_INPUT, '최소 구매 금액은 0.01 USDC입니다.'),
                { status: getErrorStatusCode(API_ERROR_CODES.INVALID_INPUT) }
            );
        }

        // 다이아몬드 구매 처리
        const result = await circlePaymentService.purchaseDiamond({
            gameUuid: parsedGameUuid,
            diamondAmount: parsedDiamondAmount,
            usdcAmount: usdcAmount.toString(),
        });

        console.log(`💎 다이아몬드 구매 요청 완료: User ${parsedGameUuid}, ${parsedDiamondAmount}개, ${usdcAmount} USDC`);

        return NextResponse.json(
            createSuccessResponse({
                transactionId: result.transactionId,
                status: result.status,
                diamondAmount: result.diamondAmount,
                usdcAmount: result.usdcAmount,
                txHash: result.txHash,
                message: result.status === 'COMPLETE'
                    ? '구매가 완료되었습니다.'
                    : '구매 요청이 처리 중입니다. 잠시 후 다이아몬드가 지급됩니다.',
            })
        );
    } catch (error) {
        console.error('다이아몬드 구매 중 오류:', error);

        const errorMessage = error instanceof Error ? error.message : '다이아몬드 구매 중 오류가 발생했습니다.';

        return NextResponse.json(
            createErrorResponse(
                API_ERROR_CODES.SERVICE_UNAVAILABLE,
                errorMessage
            ),
            { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
        );
    }
}

/**
 * GET /api/circle/payment/diamond?gameUuid=123&limit=20
 * 결제 내역 조회
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const gameUuidParam = searchParams.get('gameUuid');
        const limitParam = searchParams.get('limit');

        if (!gameUuidParam) {
            return NextResponse.json(
                createErrorResponse(API_ERROR_CODES.INVALID_INPUT, 'gameUuid가 필요합니다.'),
                { status: getErrorStatusCode(API_ERROR_CODES.INVALID_INPUT) }
            );
        }

        const parsedGameUuid = Number.parseInt(gameUuidParam, 10);
        const limit = limitParam ? Number.parseInt(limitParam, 10) : 20;

        if (isNaN(parsedGameUuid)) {
            return NextResponse.json(
                createErrorResponse(API_ERROR_CODES.INVALID_USER, '유효하지 않은 gameUuid입니다.'),
                { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
            );
        }

        // 결제 내역 조회
        const history = await circlePaymentService.getPaymentHistory(parsedGameUuid, limit);

        return NextResponse.json(
            createSuccessResponse(history)
        );
    } catch (error) {
        console.error('결제 내역 조회 중 오류:', error);
        return NextResponse.json(
            createErrorResponse(
                API_ERROR_CODES.SERVICE_UNAVAILABLE,
                '결제 내역 조회 중 오류가 발생했습니다.'
            ),
            { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
        );
    }
}
