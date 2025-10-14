const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('🔍 사용자 목록 조회 중...');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        uuid: true,
        createdAt: true
      },
      orderBy: {
        uuid: 'asc'
      }
    });

    console.log(`📊 총 ${users.length}명의 사용자 발견:`);
    console.log('='.repeat(80));
    
    users.forEach(user => {
      console.log(`UUID: ${user.uuid.toString().padStart(3, ' ')} | ID: ${user.id} | Username: ${user.username} | 생성일: ${user.createdAt.toISOString()}`);
    });
    
    console.log('='.repeat(80));
    
    // ranking 사용자 찾기
    const rankingUser = users.find(user => user.username === 'ranking');
    if (rankingUser) {
      console.log(`✅ ranking 사용자 발견: UUID ${rankingUser.uuid}, ID ${rankingUser.id}`);
    } else {
      console.log('❌ ranking 사용자를 찾을 수 없습니다.');
    }
    
  } catch (error) {
    console.error('❌ 사용자 조회 실패:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
