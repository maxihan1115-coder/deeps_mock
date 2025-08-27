const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('=== 현재 등록된 사용자 목록 ===');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        uuid: true,
        createdAt: true,
      },
      orderBy: {
        uuid: 'asc',
      },
    });

    if (users.length === 0) {
      console.log('등록된 사용자가 없습니다.');
      return;
    }

    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Game UUID: ${user.uuid}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('---');
    });

    console.log(`총 ${users.length}명의 사용자가 등록되어 있습니다.`);
    
  } catch (error) {
    console.error('사용자 조회 중 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
