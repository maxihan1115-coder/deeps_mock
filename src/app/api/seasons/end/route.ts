import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 시즌 종료 처리
export async function POST(request: NextRequest) {
  try {
    const { seasonName, periodStartDate, periodEndDate, adminUserId } = await request.json();

    // 관리자 권한 검증 (maxi.moff 계정 UUID 허용)
    const adminUuids = ['1', 1, '138afdb1-d873-4032-af80-77b5fb8a23cf'];
    if (!adminUuids.includes(adminUserId)) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    if (!seasonName || !periodStartDate || !periodEndDate) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }

    console.log(`🏁 시즌 종료 처리 시작: ${seasonName}`);

    // 1. 시즌 랭킹 계산 (직접 처리)
    const rankings = await prisma.ranking.findMany({
      where: {
        rankingPeriod: 'season',
        periodStartDate: new Date(periodStartDate),
        periodEndDate: new Date(periodEndDate),
      },
      orderBy: {
        score: 'desc',
      },
      include: {
        user: {
          select: {
            username: true,
            uuid: true,
          },
        },
      },
    });

    // 2. 순위 업데이트
    for (let i = 0; i < rankings.length; i++) {
      const ranking = rankings[i];
      await prisma.ranking.update({
        where: { id: ranking.id },
        data: {
          rankPosition: i + 1,
        },
      });
    }

    // 3. 랭킹 퀘스트 달성 체크
    const questAchievements = [];
    
    console.log(`🎯 랭킹 퀘스트 달성 체크 시작: ${rankings.length}명 대상`);
    
    for (const ranking of rankings) {
      const { userId, rankPosition } = ranking;
      console.log(`\n📊 순위 ${rankPosition} - 사용자 ID: ${userId}`);
      
      // 1등 퀘스트 체크
      if (rankPosition === 1) {
        console.log(`🥇 1등 퀘스트 체크 시작`);
        const completed = await checkAndCompleteQuest(userId, '22', 'SEASON_RANK_1ST');
        if (completed) {
          questAchievements.push({ userId, questId: '22', rank: rankPosition });
          console.log(`✅ 1등 퀘스트 달성 완료`);
        } else {
          console.log(`❌ 1등 퀘스트 달성 실패`);
        }
      }
      
      // 2등 퀘스트 체크
      if (rankPosition === 2) {
        console.log(`🥈 2등 퀘스트 체크 시작`);
        const completed = await checkAndCompleteQuest(userId, '23', 'SEASON_RANK_2ND');
        if (completed) {
          questAchievements.push({ userId, questId: '23', rank: rankPosition });
          console.log(`✅ 2등 퀘스트 달성 완료`);
        } else {
          console.log(`❌ 2등 퀘스트 달성 실패`);
        }
      }
      
      // 3등 퀘스트 체크
      if (rankPosition === 3) {
        console.log(`🥉 3등 퀘스트 체크 시작`);
        const completed = await checkAndCompleteQuest(userId, '24', 'SEASON_RANK_3RD');
        if (completed) {
          questAchievements.push({ userId, questId: '24', rank: rankPosition });
          console.log(`✅ 3등 퀘스트 달성 완료`);
        } else {
          console.log(`❌ 3등 퀘스트 달성 실패`);
        }
      }
      
      // 4~10등 퀘스트 체크
      if (rankPosition >= 4 && rankPosition <= 10) {
        console.log(`🏅 4~10등 퀘스트 체크 시작 (순위: ${rankPosition})`);
        const completed = await checkAndCompleteQuest(userId, '25', 'SEASON_RANK_TOP10');
        if (completed) {
          questAchievements.push({ userId, questId: '25', rank: rankPosition });
          console.log(`✅ 4~10등 퀘스트 달성 완료`);
        } else {
          console.log(`❌ 4~10등 퀘스트 달성 실패`);
        }
      }
    }

    console.log(`✅ 시즌 랭킹 계산 완료: ${rankings.length}명, ${questAchievements.length}개 퀘스트 달성`);

    // 4. 시즌 상태를 종료로 변경
    // TODO: 나중에 데이터베이스에서 시즌 상태를 관리하도록 변경
    // 현재는 환경변수로 관리
    process.env.SEASON_STATUS = 'ended';
    console.log(`📝 시즌 상태를 'ended'로 변경`);

    // 5. 시즌 종료 로그 기록
    console.log(`🎉 시즌 ${seasonName} 종료 완료`);
    console.log('📊 최종 랭킹:', rankings.slice(0, 10).map(r => ({ rank: r.rankPosition, username: r.user.username, score: r.score })));

    return NextResponse.json({
      success: true,
      message: `시즌 ${seasonName} 종료 처리 완료`,
      seasonName,
      totalRankings: rankings.length,
      questAchievements: questAchievements.length,
      topRankings: rankings.slice(0, 10).map(r => ({
        rank: r.rankPosition,
        username: r.user.username,
        score: r.score,
        level: r.level,
        lines: r.lines,
      })),
      seasonStatus: 'ended'
    });
  } catch (error) {
    console.error('시즌 종료 처리 실패:', error);
    return NextResponse.json({ error: '시즌 종료 처리에 실패했습니다.' }, { status: 500 });
  }
}

// 퀘스트 달성 체크 및 완료 처리
async function checkAndCompleteQuest(userId: string, questId: string, questTitle: string) {
  try {
    // 사용자의 게임 UUID 찾기 (userId는 User.id, questProgress는 User.uuid 사용)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { uuid: true },
    });

    if (!user) {
      console.error(`사용자를 찾을 수 없습니다: ${userId}`);
      return;
    }

    console.log(`🔍 퀘스트 달성 체크: ${questTitle} - User.id: ${userId}, User.uuid: ${user.uuid}`);

    // 퀘스트 진행도 확인 (questProgress는 user.uuid 사용)
    const questProgress = await prisma.questProgress.findUnique({
      where: {
        userId_catalogId: {
          userId: user.uuid, // Int 타입
          catalogId: questId,
        },
      },
    });

    console.log(`📊 퀘스트 진행도 조회 결과:`, {
      questId,
      userId: user.uuid,
      exists: !!questProgress,
      isCompleted: questProgress?.isCompleted,
      progress: questProgress?.progress
    });

    if (questProgress && !questProgress.isCompleted) {
      // 퀘스트 완료 처리
      await prisma.questProgress.update({
        where: {
          userId_catalogId: {
            userId: user.uuid, // Int 타입
            catalogId: questId,
          },
        },
        data: {
          progress: 1,
          isCompleted: true,
          updatedAt: new Date(),
        },
      });

      console.log(`✅ 퀘스트 완료: ${questTitle} - 사용자: ${userId} (uuid: ${user.uuid})`);
      return true;
    } else if (!questProgress) {
      // 퀘스트 진행도가 없으면 새로 생성
      await prisma.questProgress.create({
        data: {
          userId: user.uuid, // Int 타입
          catalogId: questId,
          progress: 1,
          isCompleted: true,
        },
      });

      console.log(`✅ 퀘스트 새로 완료: ${questTitle} - 사용자: ${userId} (uuid: ${user.uuid})`);
      return true;
    } else {
      console.log(`ℹ️ 퀘스트 이미 완료됨: ${questTitle} - 사용자: ${userId} (uuid: ${user.uuid})`);
      return false;
    }
  } catch (error) {
    console.error(`❌ 퀘스트 달성 체크 실패: ${questTitle} - ${userId}`, error);
    return false;
  }
}
