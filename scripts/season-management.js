const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 시즌 관리 도구
class SeasonManager {
  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }

  // 시즌 상태 확인
  async checkSeasonStatus() {
    try {
      console.log('🔍 시즌 상태 확인 중...');
      
      const response = await fetch(`${this.baseUrl}/api/seasons/status`);
      const data = await response.json();
      
      if (data.success) {
        console.log('📊 현재 시즌 정보:');
        console.log(`   시즌명: ${data.season.seasonName}`);
        console.log(`   시작일: ${new Date(data.season.seasonStartDate).toLocaleString('ko-KR')}`);
        console.log(`   종료일: ${new Date(data.season.seasonEndDate).toLocaleString('ko-KR')}`);
        console.log(`   상태: ${data.season.isActive ? '활성' : '종료됨'}`);
        console.log(`   상태 코드: ${data.season.status}`);
      } else {
        console.error('❌ 시즌 상태 확인 실패:', data.error);
      }
    } catch (error) {
      console.error('❌ 시즌 상태 확인 중 오류:', error);
    }
  }

  // 시즌 종료
  async endSeason(seasonName, startDate, endDate) {
    try {
      console.log(`🏁 시즌 종료 처리 시작: ${seasonName}`);
      
      const response = await fetch(`${this.baseUrl}/api/seasons/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seasonName,
          periodStartDate: startDate,
          periodEndDate: endDate
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ 시즌 종료 완료!');
        console.log(`   메시지: ${data.message}`);
        console.log(`   총 랭킹: ${data.totalRankings}명`);
        console.log(`   퀘스트 달성: ${data.questAchievements}개`);
      } else {
        console.error('❌ 시즌 종료 실패:', data.error);
      }
    } catch (error) {
      console.error('❌ 시즌 종료 중 오류:', error);
    }
  }

  // 새 시즌 시작
  async startNewSeason(currentSeasonName, newSeasonName, newStartDate, newEndDate) {
    try {
      console.log(`🆕 새 시즌 시작 처리: ${newSeasonName}`);
      
      const response = await fetch(`${this.baseUrl}/api/seasons/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentSeasonName,
          newSeasonName,
          newSeasonStartDate: newStartDate,
          newSeasonEndDate: newEndDate
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ 새 시즌 시작 완료!');
        console.log(`   메시지: ${data.message}`);
        console.log(`   백업 테이블: ${data.backupTable}`);
        console.log(`   새 시즌: ${data.newSeason.seasonName}`);
      } else {
        console.error('❌ 새 시즌 시작 실패:', data.error);
      }
    } catch (error) {
      console.error('❌ 새 시즌 시작 중 오류:', error);
    }
  }

  // 랭킹 데이터 확인
  async checkRankings() {
    try {
      console.log('📊 랭킹 데이터 확인 중...');
      
      const rankings = await prisma.ranking.findMany({
        where: {
          rankingPeriod: 'season',
          periodStartDate: new Date('2025-01-01T00:00:00+09:00')
        },
        orderBy: { score: 'desc' },
        take: 10,
        include: {
          user: {
            select: {
              username: true
            }
          }
        }
      });

      console.log(`📈 현재 시즌 상위 10명:`);
      rankings.forEach((ranking, index) => {
        console.log(`   ${index + 1}위: ${ranking.user?.username || 'Unknown'} - ${ranking.score.toLocaleString()}점`);
      });
    } catch (error) {
      console.error('❌ 랭킹 데이터 확인 중 오류:', error);
    }
  }
}

// CLI 인터페이스
async function main() {
  const manager = new SeasonManager();
  const command = process.argv[2];

  switch (command) {
    case 'status':
      await manager.checkSeasonStatus();
      break;
    
    case 'end':
      const seasonName = process.argv[3] || '2025-01';
      const startDate = process.argv[4] || '2025-01-01T00:00:00+09:00';
      const endDate = process.argv[5] || '2025-10-15T11:00:00+09:00';
      await manager.endSeason(seasonName, startDate, endDate);
      break;
    
    case 'start':
      const currentSeason = process.argv[3] || '2025-01';
      const newSeason = process.argv[4] || '2025-02';
      const newStartDate = process.argv[5] || '2025-10-15T11:00:00+09:00';
      const newEndDate = process.argv[6] || '2026-01-15T11:00:00+09:00';
      await manager.startNewSeason(currentSeason, newSeason, newStartDate, newEndDate);
      break;
    
    case 'rankings':
      await manager.checkRankings();
      break;
    
    default:
      console.log('📋 시즌 관리 도구 사용법:');
      console.log('  node scripts/season-management.js status                    # 시즌 상태 확인');
      console.log('  node scripts/season-management.js end [시즌명] [시작일] [종료일]  # 시즌 종료');
      console.log('  node scripts/season-management.js start [현재시즌] [새시즌] [시작일] [종료일]  # 새 시즌 시작');
      console.log('  node scripts/season-management.js rankings                 # 랭킹 데이터 확인');
      break;
  }

  await prisma.$disconnect();
}

// 스크립트 실행
if (require.main === module) {
  main()
    .then(() => {
      console.log('✅ 시즌 관리 도구 실행 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 시즌 관리 도구 실행 실패:', error);
      process.exit(1);
    });
}

module.exports = { SeasonManager };
