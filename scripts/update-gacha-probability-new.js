const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateGachaProbability() {
  try {
    console.log('🎰 가챠 확률 업데이트 시작...');

    // 새로운 확률 설정 (총 100%가 되도록 조정)
    const newGachaRewards = [
      { diamonds: 500, probability: 20.0 },    // 20%
      { diamonds: 1000, probability: 17.0 },   // 17% (18%에서 17%로 변경)
      { diamonds: 2000, probability: 15.0 },   // 15%
      { diamonds: 3000, probability: 12.0 },   // 12% (13%에서 12%로 변경)
      { diamonds: 4000, probability: 11.0 },   // 11%
      { diamonds: 5000, probability: 10.0 },   // 10%
      { diamonds: 6000, probability: 5.0 },    // 5%
      { diamonds: 7000, probability: 4.0 },    // 4%
      { diamonds: 8000, probability: 3.0 },    // 3%
      { diamonds: 9000, probability: 2.0 },    // 2% (1%에서 2%로 변경)
      { diamonds: 10000, probability: 1.0 }    // 1% (0%에서 1%로 변경)
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
