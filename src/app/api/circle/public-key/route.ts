import { NextResponse } from 'next/server';




export async function GET() {
    try {
        // 환경 변수에서 따옴표 제거
        let apiKey = (process.env.CIRCLE_API_KEY || '').trim();
        apiKey = apiKey.replace(/^["']|["']$/g, ''); // 앞뒤 따옴표 제거

        console.log('🔵 Public Key API 호출 시작');
        console.log('- API Key Length:', apiKey.length);
        console.log('- API Key Preview:', apiKey.substring(0, 20) + '...');
        console.log('- CIRCLE_TESTNET:', process.env.CIRCLE_TESTNET);

        if (!apiKey) {
            throw new Error('Circle API 키가 설정되지 않았습니다.');
        }

        // Circle Payments API의 카드 암호화용 공개키 엔드포인트
        const baseUrl = process.env.CIRCLE_TESTNET === 'true'
            ? 'https://api-sandbox.circle.com/v1'
            : 'https://api.circle.com/v1';

        console.log('- Base URL:', baseUrl);
        console.log('- Endpoint:', `${baseUrl}/encryption/public`);

        const axios = (await import('axios')).default;
        const response = await axios.get(`${baseUrl}/encryption/public`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
            },
        });

        console.log('✅ Circle API 응답 성공');
        console.log('- Status:', response.status);
        console.log('- Data Keys:', Object.keys(response.data || {}));

        const { publicKey, keyId } = response.data.data;

        // 디버깅: 공개키 형식 확인
        console.log('🔑 Circle Payments Public Key Response:');
        console.log('- Key ID:', keyId);
        console.log('- Public Key Type:', typeof publicKey);
        console.log('- Public Key Length:', publicKey?.length);
        console.log('- Public Key Preview:', publicKey?.substring(0, 100));

        return NextResponse.json({
            success: true,
            payload: {
                publicKey,
                keyId,
            },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('❌ Public Key 조회 실패:');
        console.error('- Error Message:', error.message);
        console.error('- Response Status:', error.response?.status);
        console.error('- Response Data:', JSON.stringify(error.response?.data, null, 2));
        console.error('- Full Error:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'PUBLIC_KEY_ERROR',
                payload: error.response?.data?.message || error.message
            },
            { status: 500 }
        );
    }
}
