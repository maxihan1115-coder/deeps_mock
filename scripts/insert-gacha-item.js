const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function insertGachaItem() {
  try {
    console.log('🎰 가챠 아이템 삽입 시작...');

    // 가챠 보상 데이터 (500~10000 다이아몬드, 11개 아이템)
    const gachaRewards = [
      { diamonds: 500, probability: 25.0 },    // 25%
      { diamonds: 1000, probability: 20.0 },   // 20%
      { diamonds: 2000, probability: 15.0 },   // 15%
      { diamonds: 3000, probability: 12.0 },   // 12%
      { diamonds: 4000, probability: 10.0 },   // 10%
      { diamonds: 5000, probability: 8.0 },    // 8%
      { diamonds: 6000, probability: 5.0 },    // 5%
      { diamonds: 7000, probability: 3.0 },    // 3%
      { diamonds: 8000, probability: 1.5 },    // 1.5%
      { diamonds: 9000, probability: 0.4 },    // 0.4%
      { diamonds: 10000, probability: 0.1 }    // 0.1%
    ];

    // 확률 합계 검증
    const totalProbability = gachaRewards.reduce((sum, reward) => sum + reward.probability, 0);
    console.log(`📊 총 확률: ${totalProbability}%`);

    if (Math.abs(totalProbability - 100) > 0.01) {
      throw new Error(`확률 합계가 100%가 아닙니다: ${totalProbability}%`);
    }

    // 기존 가챠 아이템이 있는지 확인
    const existingGacha = await prisma.shopItem.findFirst({
      where: { isGacha: true }
    });

    if (existingGacha) {
      console.log('⚠️ 기존 가챠 아이템이 존재합니다. 삭제 후 재생성합니다.');
      await prisma.shopItem.delete({
        where: { id: existingGacha.id }
      });
    }

    // 가챠 아이템 생성
    const gachaItem = await prisma.shopItem.create({
      data: {
        id: 'gacha-roulette',
        name: '🎰 다이아몬드 룰렛',
        description: '500 ~ 10000 다이아몬드 를 랜덤으로 획득 합니다.',
        price: 1000, // 구매 가격 (다이아몬드)
        currency: 'DIAMOND',
        isActive: true,
        isGacha: true,
        gachaRewards: gachaRewards
      }
    });

    console.log('✅ 가챠 아이템 생성 완료:', {
      id: gachaItem.id,
      name: gachaItem.name,
      price: gachaItem.price,
      rewards: gachaRewards.length
    });

    // 확률 분포 출력
    console.log('\n📈 확률 분포:');
    gachaRewards.forEach((reward, index) => {
      console.log(`  ${index + 1}. ${reward.diamonds.toLocaleString()} 다이아몬드: ${reward.probability}%`);
    });

  } catch (error) {
    console.error('❌ 가챠 아이템 삽입 실패:', error);
  } finally {
    await prisma.$disconnect();
  }
}

insertGachaItem();
