const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateGachaProbability() {
  try {
    console.log('🎰 가챠 확률 업데이트 시작...');

    // 새로운 확률 설정: 가챠 가격 2000, 기대값 80% (EV=1600)
    // 합계 = 100.00, EV ≈ 1601
    const newGachaRewards = [
      { diamonds: 500, probability: 38.6 },    // 38.60%
      { diamonds: 1000, probability: 28.0 },   // 28.00%
      { diamonds: 2000, probability: 14.0 },   // 14.00%
      { diamonds: 3000, probability: 8.4 },    // 8.40%
      { diamonds: 4000, probability: 4.5 },    // 4.50%
      { diamonds: 5000, probability: 2.5 },    // 2.50%
      { diamonds: 6000, probability: 1.5 },    // 1.50%
      { diamonds: 7000, probability: 1.0 },    // 1.00%
      { diamonds: 8000, probability: 0.7 },    // 0.70%
      { diamonds: 9000, probability: 0.5 },    // 0.50%
      { diamonds: 10000, probability: 0.3 }    // 0.30%
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
        price: 2000,
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
