const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testInsufficientDiamonds() {
  try {
    console.log('💎 다이아몬드 부족 테스트를 위해 다이아몬드 차감...');

    // 사용자 1의 다이아몬드를 500으로 설정 (가챠 가격 1000보다 적게)
    const updatedCurrency = await prisma.userCurrency.update({
      where: { userId: 1 },
      data: {
        diamond: 500 // 가챠 가격 1000보다 적게 설정
      }
    });

    console.log('✅ 다이아몬드 차감 완료:', {
      userId: 1,
      newDiamondBalance: updatedCurrency.diamond,
      gachaPrice: 1000,
      insufficient: updatedCurrency.diamond < 1000
    });

    console.log('🎰 이제 가챠를 구매해보면 "다이아몬드 부족" 모달이 표시됩니다!');

  } catch (error) {
    console.error('❌ 다이아몬드 차감 실패:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testInsufficientDiamonds();
