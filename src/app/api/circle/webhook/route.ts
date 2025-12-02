import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { circlePaymentService } from '@/lib/circle/CirclePaymentService';
import {
    createSuccessResponse,
    createErrorResponse,
    getErrorStatusCode,
    API_ERROR_CODES
} from '@/lib/api-errors';

/**
 * Webhook 서명 검증
 */
function verifyWebhookSignature(payload: string, signature: string): boolean {
    const webhookSecret = process.env.CIRCLE_WEBHOOK_SECRET || '';

    if (!webhookSecret) {
        console.error('❌ CIRCLE_WEBHOOK_SECRET이 설정되지 않았습니다.');
        return false;
    }

    try {
        const hmac = crypto.createHmac('sha256', webhookSecret);
        hmac.update(payload);
        const expectedSignature = hmac.digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature.toLowerCase()),
            Buffer.from(expectedSignature.toLowerCase())
        );
    } catch (error) {
        console.error('Webhook 서명 검증 중 오류:', error);
        return false;
    }
}

/**
 * POST /api/circle/webhook
 * Circle Webhook 수신
 */
export async function POST(request: NextRequest) {
    try {
        // 1. 요청 본문 읽기
        const rawBody = await request.text();
        const signature = request.headers.get('x-circle-signature') || '';

        console.log('🔔 Circle Webhook 수신:', {
            signature: signature.substring(0, 20) + '...',
            bodyLength: rawBody.length,
        });

        // 2. 서명 검증 (프로덕션에서는 필수)
        const isProduction = process.env.NODE_ENV === 'production';

        if (isProduction && !verifyWebhookSignature(rawBody, signature)) {
            console.error('❌ Webhook 서명 검증 실패');
            return NextResponse.json(
                createErrorResponse(API_ERROR_CODES.UNAUTHORIZED, 'Invalid webhook signature'),
                { status: getErrorStatusCode(API_ERROR_CODES.UNAUTHORIZED) }
            );
        }

        // 3. 이벤트 파싱
        const event = JSON.parse(rawBody);
        const { type, data } = event;

        console.log('📨 Webhook 이벤트:', {
            type,
            transactionId: data?.transaction?.id,
            state: data?.transaction?.state,
        });

        // 4. 이벤트 타입별 처리
        switch (type) {
            case 'transaction.confirmed':
            case 'transactions.confirmed':
                await handleTransactionConfirmed(data.transaction);
                break;

            case 'transaction.failed':
            case 'transactions.failed':
                await handleTransactionFailed(data.transaction);
                break;

            case 'transaction.sent':
            case 'transactions.sent':
                console.log('ℹ️ 트랜잭션 전송됨:', data.transaction.id);
                break;

            default:
                console.log(`⚠️ 처리되지 않은 Webhook 이벤트: ${type}`);
        }

        // 5. 응답 (Circle은 200 OK를 기대)
        return NextResponse.json(
            createSuccessResponse({ received: true })
        );
    } catch (error) {
        console.error('❌ Webhook 처리 중 오류:', error);

        // Webhook은 실패해도 200 OK 반환 (재시도 방지)
        return NextResponse.json(
            createSuccessResponse({
                received: true,
                error: error instanceof Error ? error.message : 'Unknown error'
            })
        );
    }
}

/**
 * 트랜잭션 완료 처리
 */
async function handleTransactionConfirmed(transaction: {
    id: string;
    txHash?: string;
    state: string;
    [key: string]: unknown;
}) {
    try {
        const { id, txHash, state } = transaction;

        console.log(`🎉 트랜잭션 완료: ${id}`);
        console.log(`🔗 TxHash: ${txHash}`);
        console.log(`📊 State: ${state}`);

        // CirclePaymentService를 통해 결제 완료 처리
        await circlePaymentService.completePayment(id, txHash);

        console.log(`✅ 트랜잭션 완료 처리 성공: ${id}`);
    } catch (error) {
        console.error(`❌ 트랜잭션 완료 처리 실패:`, error);
        throw error;
    }
}

/**
 * 트랜잭션 실패 처리
 */
async function handleTransactionFailed(transaction: {
    id: string;
    errorReason?: string;
    [key: string]: unknown;
}) {
    try {
        const { id, errorReason } = transaction;

        console.error(`❌ 트랜잭션 실패: ${id}`);
        console.error(`📋 실패 사유: ${errorReason}`);

        // CirclePaymentService를 통해 결제 실패 처리
        await circlePaymentService.failPayment(id);

        console.log(`✅ 트랜잭션 실패 처리 완료: ${id}`);
    } catch (error) {
        console.error(`❌ 트랜잭션 실패 처리 중 오류:`, error);
        throw error;
    }
}

/**
 * GET /api/circle/webhook
 * Webhook 엔드포인트 헬스체크
 */
export async function GET() {
    return NextResponse.json({
        service: 'Circle Webhook Endpoint',
        status: 'active',
        timestamp: new Date().toISOString(),
    });
}
