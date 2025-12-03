/**
 * 중복 지갑 주소 확인 및 정리 스크립트
 * 
 * 실행: node prisma/fix-duplicate-wallets.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔍 중복 지갑 주소 확인 중...\n');

    // 1. 모든 외부 지갑 조회
    const allWallets = await prisma.externalWallet.findMany({
        orderBy: [
            { address: 'asc' },
            { createdAt: 'asc' } // 오래된 것 먼저
        ]
    });

    console.log(`총 ${allWallets.length}개의 지갑이 등록되어 있습니다.\n`);

    // 2. address별로 그룹화
    const walletsByAddress = {};

    for (const wallet of allWallets) {
        if (!walletsByAddress[wallet.address]) {
            walletsByAddress[wallet.address] = [];
        }
        walletsByAddress[wallet.address].push(wallet);
    }

    // 3. 중복된 address 찾기
    const duplicates = Object.entries(walletsByAddress).filter(
        ([_, wallets]) => wallets.length > 1
    );

    if (duplicates.length === 0) {
        console.log('✅ 중복된 지갑 주소가 없습니다!');
        return;
    }

    console.log(`⚠️  ${duplicates.length}개의 중복된 지갑 주소 발견:\n`);

    const walletsToDelete = [];

    for (const [address, wallets] of duplicates) {
        console.log(`\n📍 지갑 주소: ${address}`);
        console.log(`   중복 개수: ${wallets.length}`);

        wallets.forEach((w, idx) => {
            console.log(`   ${idx + 1}. ID: ${w.id} | User: ${w.userId} | Primary: ${w.isPrimary} | Created: ${w.createdAt.toISOString()}`);
        });

        // 유지할 지갑 선택 로직:
        // 1. isPrimary가 true인 것 우선
        // 2. 그 다음 가장 먼저 생성된 것
        const primaryWallet = wallets.find(w => w.isPrimary);
        const keepWallet = primaryWallet || wallets[0]; // 가장 오래된 것

        console.log(`   ✅ 유지: ${keepWallet.id} (User: ${keepWallet.userId}${keepWallet.isPrimary ? ', Primary' : ''})`);

        // 나머지는 삭제 대상
        const toDelete = wallets.filter(w => w.id !== keepWallet.id);
        toDelete.forEach(w => {
            console.log(`   ❌ 삭제 예정: ${w.id} (User: ${w.userId})`);
            walletsToDelete.push(w.id);
        });
    }

    if (walletsToDelete.length > 0) {
        console.log(`\n\n🗑️  총 ${walletsToDelete.length}개의 중복 지갑을 삭제합니다...\n`);

        // 삭제 실행
        const deleteResult = await prisma.externalWallet.deleteMany({
            where: {
                id: {
                    in: walletsToDelete
                }
            }
        });

        console.log(`✅ ${deleteResult.count}개의 중복 지갑이 삭제되었습니다!`);
    }

    console.log('\n✨ 중복 정리 완료!');
}

main()
    .catch((e) => {
        console.error('❌ 오류 발생:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
