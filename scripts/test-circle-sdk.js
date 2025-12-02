const { initiateDeveloperControlledWalletsClient } = require('@circle-fin/developer-controlled-wallets');

// .env 파일 로드
require('dotenv').config();

/**
 * Circle SDK 테스트 스크립트
 * SDK가 정상적으로 동작하는지 확인하고 응답 구조를 파악합니다.
 */

async function testCircleSDK() {
    console.log('🧪 Circle SDK 테스트 시작...\n');

    const apiKey = process.env.CIRCLE_API_KEY;
    const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

    if (!apiKey || !entitySecret) {
        console.error('❌ 환경 변수가 설정되지 않았습니다.');
        process.exit(1);
    }

    console.log('✅ 환경 변수 확인 완료');
    console.log(`   API Key: ${apiKey.substring(0, 20)}...`);
    console.log(`   Entity Secret: ${entitySecret.substring(0, 20)}...\n`);

    // Circle SDK 초기화
    console.log('🔵 Circle SDK 초기화 중...');
    const client = initiateDeveloperControlledWalletsClient({
        apiKey,
        entitySecret,
    });
    console.log('✅ SDK 초기화 완료\n');

    try {
        // 1. Wallet Set 생성 테스트
        console.log('1️⃣ Wallet Set 생성 테스트...');
        const walletSetResponse = await client.createWalletSet({
            name: `test-walletset-${Date.now()}`,
        });

        console.log('✅ Wallet Set 생성 성공!');
        console.log('   응답 데이터:', walletSetResponse.data);

        const walletSetId = walletSetResponse.data?.walletSet?.id;
        console.log(`   Wallet Set ID: ${walletSetId}\n`);

        if (!walletSetId) {
            console.error('❌ Wallet Set ID를 가져올 수 없습니다.');
            return;
        }

        // 2. Wallet 생성 테스트
        console.log('2️⃣ Wallet 생성 테스트...');
        const walletResponse = await client.createWallets({
            walletSetId: walletSetId,
            blockchains: ['MATIC-AMOY'],
            count: 1,
            accountType: 'EOA',
        });

        console.log('✅ Wallet 생성 성공!');
        console.log('   응답 데이터:', walletResponse.data);

        const wallet = walletResponse.data?.wallets?.[0];
        console.log(`   Wallet ID: ${wallet?.id}`);
        console.log(`   Address: ${wallet?.address}\n`);

        // 3. Wallet 정보 조회 테스트
        if (wallet?.id) {
            console.log('3️⃣ Wallet 정보 조회 테스트...');
            const walletInfoResponse = await client.getWallet({
                id: wallet.id,
            });

            console.log('✅ Wallet 정보 조회 성공!');
            console.log('   지갑 상태:', walletInfoResponse.data?.wallet?.state);
            console.log('   지갑 주소:', walletInfoResponse.data?.wallet?.address);
        }

        console.log('\n🎉 모든 테스트 성공! SDK가 정상적으로 작동합니다.\n');

    } catch (error) {
        console.error('❌ 테스트 실패:', error);
        if (error.response) {
            console.error('   응답 데이터:', error.response.data);
        }
        process.exit(1);
    }
}

// 테스트 실행
testCircleSDK().catch(error => {
    console.error('스크립트 실행 중 오류:', error);
    process.exit(1);
});
