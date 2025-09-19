const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function restoreDiamonds() {
  try {
    console.log('💎 다이아몬드 잔액 복구...');

    // 사용자 1의 다이아몬드를 원래대로 복구
    const updatedCurrency = await prisma.userCurrency.update({
      where: { userId: 1 },
      data: {
        diamond: 19400 // 원래 잔액으로 복구
      }
    });

    console.log('✅ 다이아몬드 복구 완료:', {
      userId: 1,
      restoredDiamondBalance: updatedCurrency.diamond
    });

  } catch (error) {
    console.error('❌ 다이아몬드 복구 실패:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreDiamonds();
