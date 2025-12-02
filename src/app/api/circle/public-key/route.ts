import { NextResponse } from 'next/server';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

const getCircleClient = () => {
    const apiKey = process.env.CIRCLE_API_KEY || '';
    const entitySecret = process.env.CIRCLE_ENTITY_SECRET || '';

    if (!apiKey || !entitySecret) {
        throw new Error('Circle API 키 또는 Entity Secret이 설정되지 않았습니다.');
    }

    return initiateDeveloperControlledWalletsClient({
        apiKey,
        entitySecret,
    });
};

export async function GET() {
    try {
        const client = getCircleClient();
        const response = await client.getPublicKey();

        return NextResponse.json({
            success: true,
            payload: {
                publicKey: response.data?.publicKey,
                // keyId는 SDK 버전에 따라 다를 수 있으므로 확인 필요, 없으면 생략
                keyId: (response.data as any)?.keyId || '',
            },
        });
    } catch (error: any) {
        console.error('Public Key 조회 실패:', error);
        return NextResponse.json(
            { success: false, error: 'PUBLIC_KEY_ERROR', payload: error.message },
            { status: 500 }
        );
    }
}
