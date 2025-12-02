const { registerEntitySecretCiphertext } = require('@circle-fin/developer-controlled-wallets');
const fs = require('fs');
const path = require('path');

// .env 파일 로드
require('dotenv').config();

/**
 * Circle Entity Secret 등록 스크립트
 * 
 * 수동으로 생성된 Entity Secret을 Circle에 등록합니다.
 */

async function registerEntitySecret() {
    console.log('🔐 Circle Entity Secret 등록 시작...\n');

    // 생성된 Entity Secret (generateEntitySecret() 출력값)
    const entitySecret = '7054198353571770498ffcabb799a5e60d9d176cbc008657b9fcaa8d78764edd';

    console.log(`Entity Secret: ${entitySecret}\n`);

    // API 키 확인
    const apiKey = process.env.CIRCLE_API_KEY;
    if (!apiKey) {
        console.error('❌ CIRCLE_API_KEY 환경 변수가 설정되지 않았습니다.');
        console.log('   .env 파일에 CIRCLE_API_KEY를 추가해주세요.\n');
        process.exit(1);
    }

    console.log('✅ API Key 확인 완료\n');

    // Recovery 파일 저장 경로 설정
    const recoveryPath = path.join(process.cwd(), '.circle');
    if (!fs.existsSync(recoveryPath)) {
        fs.mkdirSync(recoveryPath, { recursive: true });
    }

    // Entity Secret을 Circle에 등록
    console.log('📡 Entity Secret을 Circle API에 등록 중...');
    try {
        const response = await registerEntitySecretCiphertext({
            apiKey: apiKey,
            entitySecret: entitySecret,
            recoveryFileDownloadPath: recoveryPath,
        });

        console.log('✅ Entity Secret이 Circle에 성공적으로 등록되었습니다!\n');
        console.log(`   Recovery 파일 저장 위치: ${recoveryPath}\n`);

        if (response.data?.recoveryFile) {
            const recoveryFilePath = path.join(recoveryPath, 'recovery_file.dat');
            fs.writeFileSync(recoveryFilePath, response.data.recoveryFile);
            console.log(`   Recovery 파일: ${recoveryFilePath}\n`);
        }

        // .env 파일 업데이트 안내
        console.log('📝 다음 내용을 .env 파일에 추가하세요:\n');
        console.log(`CIRCLE_ENTITY_SECRET="${entitySecret}"`);
        console.log(`CIRCLE_APP_ID="844e7166-0701-5fef-901f-e6f8c920c30b"\n`);

        console.log('⚠️  중요 사항:');
        console.log('1. Entity Secret은 안전하게 보관하세요');
        console.log('2. Recovery 파일(.circle/)도 백업하세요');
        console.log('3. Git에 커밋하지 마세요 (.gitignore에 추가됨)');
        console.log('4. 매 API 요청마다 SDK가 자동으로 새로운 ciphertext를 생성합니다\n');

        console.log('✨ 설정 완료! 이제 Circle Wallet API를 사용할 수 있습니다.');

    } catch (error) {
        console.error('❌ Entity Secret 등록 실패:', error);
        console.log('\n💡 문제 해결:');
        console.log('1. CIRCLE_API_KEY가 올바른지 확인하세요');
        console.log('2. Circle Console에서 API 키가 활성화되어 있는지 확인하세요');
        console.log('3. 네트워크 연결을 확인하세요\n');
        process.exit(1);
    }
}

// 스크립트 실행
registerEntitySecret().catch(error => {
    console.error('스크립트 실행 중 오류:', error);
    process.exit(1);
});
