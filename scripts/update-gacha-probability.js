const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateGachaProbability() {
  try {
    console.log('🎰 가챠 확률 업데이트 시작...');

    // 새로운 확률 설정 (예시)
    const newGachaRewards = [
      { diamonds: 500, probability: 30.0 },    // 30%
      { diamonds: 1000, probability: 25.0 },   // 25%
      { diamonds: 2000, probability: 20.0 },   // 20%
      { diamonds: 3000, probability: 15.0 },   // 15%
      { diamonds: 4000, probability: 10.0 }    // 10%
    ];

    // 확률 합계 검증
    const totalProbability = newGachaRewards.reduce((sum, reward) => sum + reward.probability, 0);
    console.log(`📊 총 확률: ${totalProbability}%`);

    if (Math.abs(totalProbability - 100) > 0.01) {
      throw new Error(`확률 합계가 100%가 아닙니다: ${totalProbability}%`);
    }

    // 가챠 아이템 업데이트
    const updatedItem = await prisma.shopItem.update({
      where: { id: 'gacha-roulette' },
      data: {
        gachaRewards: newGachaRewards
      }
    });

    console.log('✅ 가챠 확률 업데이트 완료:', {
      id: updatedItem.id,
      name: updatedItem.name,
      newRewards: newGachaRewards.length
    });

    // 새로운 확률 분포 출력
    console.log('\n📈 새로운 확률 분포:');
    newGachaRewards.forEach((reward, index) => {
      console.log(`  ${index + 1}. ${reward.diamonds.toLocaleString()} 다이아몬드: ${reward.probability}%`);
    });

  } catch (error) {
    console.error('❌ 가챠 확률 업데이트 실패:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateGachaProbability();
