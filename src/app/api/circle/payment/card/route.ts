import { NextResponse } from 'next/server';
import { circlePaymentService } from '@/lib/circle/CirclePaymentService';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { gameUuid, amount, encryptedData, keyId, toAddress, sessionId, ipAddress } = body;

        if (!gameUuid || !amount || !encryptedData || !keyId || !toAddress) {
            return NextResponse.json(
                { success: false, error: 'MISSING_PARAMETERS', payload: '필수 파라미터가 누락되었습니다.' },
                { status: 400 }
            );
        }

        const result = await circlePaymentService.processCardPayment({
            userId: gameUuid,
            amount,
            encryptedData,
            keyId,
            toAddress,
            ipAddress: ipAddress || '127.0.0.1',
            sessionId: sessionId || crypto.randomUUID(),
        });

        return NextResponse.json({
            success: true,
            payload: result,
        });
    } catch (error: any) {
        console.error('카드 결제 API 오류:', error);
        return NextResponse.json(
            { success: false, error: 'PAYMENT_FAILED', payload: error.message },
            { status: 500 }
        );
    }
}
