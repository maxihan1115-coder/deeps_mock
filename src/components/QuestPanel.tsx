'use client';

import React, { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Quest } from '@/types';
import { Trophy, Calendar, Clock, Target, Star, RefreshCw, UserX, Award, ShoppingCart, Info } from 'lucide-react';

interface QuestPanelProps {
  userId: string;
  gameUuid: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function QuestPanel({ userId, gameUuid }: QuestPanelProps) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false); // 새로고침 상태 추가
  // 카탈로그 방식: 별도 초기화 불필요
  const [error, setError] = useState<string | null>(null);
  const [isLinked, setIsLinked] = useState<boolean | null>(null);

  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data: apiData, error: swrError, isLoading, mutate } = useSWR(
    gameUuid ? `/api/quests?gameUuid=${gameUuid}` : null,
    fetcher,
    {
      refreshInterval: 900000, // 15분마다 자동 갱신
      revalidateOnFocus: true, // 탭 전환 시 갱신 (반응성 확보)
    }
  );

  // 탭별 설명 데이터
  const tabDescriptions = {
    general: {
      title: "Platform Link & In-Game",
      description: "Quests related to platform linking and gameplay.",
      icon: Star
    },
    daily: {
      title: "Daily Quests",
      description: "Quests that reset every day at midnight.",
      icon: RefreshCw
    },
    attendance: {
      title: "Attendance",
      description: "Quests completed through daily attendance.",
      icon: Calendar
    },
    ranking: {
      title: "Ranking",
      description: "Quests based on season ranking achievements.",
      icon: Award
    },
    purchase: {
      title: "Purchase",
      description: "Quests completed by purchasing items.",
      icon: ShoppingCart
    },
    other: {
      title: "Other",
      description: "Special quests with unique conditions.",
      icon: UserX
    }
  };

  // 플랫폼 연동 상태 확인
  const checkPlatformLinkStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/platform-link/status?gameUuid=${gameUuid}`);
      const data = await response.json();

      if (data.success && data.payload?.isLinked) {
        setIsLinked(true);
      } else {
        setIsLinked(false);
      }
    } catch (error) {
      console.error('플랫폼 연동 상태 확인 실패:', error);
      setIsLinked(false);
    }
  }, [gameUuid]);

  // 퀘스트 데이터 처리
  useEffect(() => {
    if (apiData && apiData.success) {
      const questsData = apiData.payload || [];
      setError(null);

      // 미완료 퀘스트를 위에, 완료된 퀘스트를 아래에 정렬
      const sortedQuests = questsData.sort((a: Quest, b: Quest) => {
        // 미완료 퀘스트가 위에 오도록 정렬
        if (a.isCompleted && !b.isCompleted) return 1;
        if (!a.isCompleted && b.isCompleted) return -1;
        // 완료 상태가 같으면 ID 순으로 정렬
        return parseInt(a.id) - parseInt(b.id);
      });

      setQuests(sortedQuests);
    } else if (swrError || (apiData && !apiData.success)) {
      console.error('퀘스트 목록 가져오기 실패:', swrError || apiData?.error);
      setQuests([]);
      setIsLinked(false);
      setError(apiData?.error || '퀘스트 조회에 실패했습니다.');
    }
  }, [apiData, swrError]);

  // 새로고침 핸들러 수정
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await mutate();
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, mutate]);

  // claimValue 포맷팅 함수
  const formatClaimValue = (claimValue: string | number | object): string => {
    if (typeof claimValue === 'string') {
      // JSON 문자열인 경우 파싱 시도
      try {
        const parsed = JSON.parse(claimValue);
        if (typeof parsed === 'object') {
          // 복잡한 보상 구조인 경우 (예: {"1":"100.00","2":"20.00"})
          const values = Object.values(parsed).filter(v => v !== "0.00" && v !== "0");
          if (values.length > 0) {
            return String(values[0]);
          }
        }
        return claimValue;
      } catch {
        // JSON 파싱 실패 시 원본 값 반환
        return claimValue;
      }
    }

    // 숫자인 경우 그대로 반환
    return claimValue.toString();
  };

  // 퀘스트 타입별 아이콘
  const getQuestIcon = (type: Quest['type']) => {
    switch (type) {
      case 'daily':
        return <Calendar className="w-4 h-4" />;
      case 'weekly':
        return <Clock className="w-4 h-4" />;
      case 'monthly':
        return <Calendar className="w-4 h-4" />;
      case 'single':
        return <Target className="w-4 h-4" />;
      default:
        return <Trophy className="w-4 h-4" />;
    }
  };

  // 퀘스트 타입별 배지 색상
  const getQuestBadgeVariant = (type: Quest['type']) => {
    switch (type) {
      case 'daily':
        return 'default';
      case 'weekly':
        return 'secondary';
      case 'monthly':
        return 'outline';
      case 'single':
        return 'destructive';
      default:
        return 'default';
    }
  };

  // 퀘스트 타입별 영문 이름
  const getQuestTypeName = (type: Quest['type']) => {
    switch (type) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      case 'single':
        return 'Single';
      default:
        return 'Other';
    }
  };

  // 퀘스트 실패 상태 확인
  const isQuestFailed = (quest: Quest) => {
    // 백엔드에서 설정한 isFailed 플래그 사용
    return quest.isFailed === true;
  };

  // 퀘스트 분류 함수
  const getQuestCategory = (questId: string) => {
    const id = parseInt(questId);
    if (id >= 1 && id <= 8) return 'general';
    if (id === 9 || id === 10) return 'daily';
    if (id === 12) return 'attendance';
    if (id >= 14 && id <= 21) return 'purchase'; // 아이템 구매 퀘스트
    if (id >= 22 && id <= 25) return 'ranking'; // 랭킹 퀘스트 (22~25)
    if (id === 13) return 'other';
    return 'other'; // 기타 퀘스트
  };

  // 퀘스트 필터링 함수
  const getQuestsByCategory = (category: string) => {
    return quests.filter(quest => getQuestCategory(quest.id) === category);
  };

  // 퀘스트 렌더링 함수
  const renderQuest = (quest: Quest) => {
    const isFailed = isQuestFailed(quest);

    return (
      <div
        key={quest.id}
        className={`border border-slate-700 rounded-lg p-3 space-y-2 ${isFailed ? 'bg-slate-900/50 opacity-60' : 'bg-slate-800/50'}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getQuestIcon(quest.type)}
            <span className={`font-medium text-sm ${isFailed ? 'text-slate-500' : 'text-slate-200'}`}>
              {quest.title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getQuestBadgeVariant(quest.type)} className="text-xs">
              {getQuestTypeName(quest.type)}
            </Badge>
            {isFailed && (
              <Badge variant="destructive" className="text-xs">
                Failed
              </Badge>
            )}
          </div>
        </div>

        <p className={`text-xs ${isFailed ? 'text-slate-600' : 'text-slate-400'}`}>
          {quest.description}
        </p>

        {isFailed && (
          <p className="text-xs text-red-500 font-medium">
            {quest.id === '13'
              ? 'Not completed within 30 minutes'
              : 'Not completed within a week'
            }
          </p>
        )}

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Progress</span>
            <span>{quest.progress} / {quest.maxProgress}</span>
          </div>
          <Progress
            value={(quest.progress / quest.maxProgress) * 100}
            className={`h-2 bg-slate-700 ${isFailed ? 'opacity-50' : ''}`}
          />
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Reward:</span>
            {quest.claimValue && quest.claimSymbol ? (
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-blue-400">
                  {formatClaimValue(quest.claimValue)}
                </span>
                {quest.claimSymbol !== 'REPL' && (
                  <span className="text-xs font-medium text-blue-300">
                    {quest.claimSymbol}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm font-medium text-slate-400">
                {quest.reward} Points
              </span>
            )}
          </div>
          {quest.isCompleted && !isFailed && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">
                Completed
              </Badge>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-6 px-2 border-slate-600 text-slate-300 hover:bg-slate-800"
                onClick={() => window.open('https://www.boradeeps.cc/?bappId=10006', '_blank')}
              >
                Claim
              </Button>
            </div>
          )}
        </div>

        {quest.expiresAt && (
          <div className="text-xs text-gray-500">
            Expires: {new Date(quest.expiresAt).toLocaleDateString()}
          </div>
        )}
      </div>
    );
  };

  // 점수 기반 퀘스트 자동 업데이트 제거 (무한 루프 방지)
  // useEffect(() => {
  //   if (currentScore > 0) {
  //     quests.forEach(quest => {
  //       if (!quest.isCompleted) {
  //         let newProgress = quest.progress;
  //         
  //         // 점수 관련 퀘스트 업데이트
  //         if (quest.title.includes('점수')) {
  //           newProgress = Math.min(currentScore, quest.maxProgress);
  //         }
  //         
  //         // 게임 플레이 관련 퀘스트 업데이트
  //         if (quest.title.includes('게임 플레이') && quest.progress === 0) {
  //           newProgress = 1;
  //         }
  //         
  //         if (newProgress !== quest.progress) {
  //           updateQuestProgress(quest.id, newProgress);
  //         }
  //       }
  //     });
  //   }
  // }, [currentScore, quests]);

  // 초기 연동 상태 확인 (퀘스트 로드는 SWR이 담당)
  useEffect(() => {
    if (gameUuid) {
      checkPlatformLinkStatus();
    }
  }, [gameUuid, checkPlatformLinkStatus]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              퀘스트
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2"
              title="퀘스트 새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">새로고침</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
            Loading quests...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-slate-900 border-slate-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
            <Trophy className="w-5 h-5 text-slate-400" />
            Quests
          </CardTitle>
          <div className="flex items-center gap-3">
            {/* 플랫폼 연동 상태 표시 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Platform Link:</span>
              <span className={`text-sm font-medium ${isLinked === true ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {isLinked === true ? 'Linked' : isLinked === false ? 'Unlinked' : 'Checking...'}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 border-slate-700 text-slate-300 hover:bg-slate-800"
              title="Refresh Quests"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 연동 상태 표시 (랭킹형 탭 요구에 따라 문구 제거) */}


        {error && (
          <div className="text-center space-y-3 mb-4">
            <div className="text-red-500 font-medium">{error}</div>
            <Button
              onClick={() => {
                setError(null);
                mutate();
              }}
              size="sm"
              variant="outline"
            >
              다시 시도
            </Button>
          </div>
        )}

        {quests.length === 0 ? (
          <div className="text-center space-y-3">
            <div className="text-gray-500">퀘스트가 없습니다.</div>
          </div>
        ) : (
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="general" className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                <span className="hidden sm:inline">General</span>
              </TabsTrigger>
              <TabsTrigger value="daily" className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                <span className="hidden sm:inline">Daily</span>
              </TabsTrigger>
              <TabsTrigger value="attendance" className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span className="hidden sm:inline">Attendance</span>
              </TabsTrigger>
              <TabsTrigger value="ranking" className="flex items-center gap-1">
                <Award className="w-3 h-3" />
                <span className="hidden sm:inline">Ranking</span>
              </TabsTrigger>
              <TabsTrigger value="purchase" className="flex items-center gap-1">
                <ShoppingCart className="w-3 h-3" />
                <span className="hidden sm:inline">Purchase</span>
              </TabsTrigger>
              <TabsTrigger value="other" className="flex items-center gap-1">
                <UserX className="w-3 h-3" />
                <span className="hidden sm:inline">Other</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-3 mt-4">
              {/* 탭별 설명 영역 */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-200">{tabDescriptions.general.title}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {tabDescriptions.general.description}
                </p>
              </div>


              {getQuestsByCategory('general').length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  No general quests available.
                </div>
              ) : (
                getQuestsByCategory('general').map(renderQuest)
              )}
            </TabsContent>

            <TabsContent value="daily" className="space-y-3 mt-4">
              {/* 탭별 설명 영역 */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-200">{tabDescriptions.daily.title}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {tabDescriptions.daily.description}
                </p>
              </div>


              {getQuestsByCategory('daily').length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  No daily quests available.
                </div>
              ) : (
                getQuestsByCategory('daily').map(renderQuest)
              )}
            </TabsContent>

            <TabsContent value="attendance" className="space-y-3 mt-4">
              {/* 탭별 설명 영역 */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-200">{tabDescriptions.attendance.title}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {tabDescriptions.attendance.description}
                </p>
              </div>


              {getQuestsByCategory('attendance').length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  No attendance quests available.
                </div>
              ) : (
                getQuestsByCategory('attendance').map(renderQuest)
              )}
            </TabsContent>

            <TabsContent value="ranking" className="space-y-3 mt-4">
              {/* 탭별 설명 영역 - 문구 제거 */}


              {/* 현재 시즌 랭킹 정보 */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-200">Current Season Ranking</span>
                </div>
                <p className="text-xs text-slate-400">
                  Quests are automatically completed based on ranking when the season ends. (Ends: 2025-10-15 11:00 KST)
                </p>
              </div>

              {getQuestsByCategory('ranking').length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  <div className="space-y-2">
                    <p>No season ranking quests available.</p>
                    <p className="text-sm">Ranking quests will appear when the season ends.</p>
                  </div>
                </div>
              ) : (
                getQuestsByCategory('ranking').map(renderQuest)
              )}
            </TabsContent>

            <TabsContent value="purchase" className="space-y-3 mt-4">
              {/* 탭별 설명 영역 */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-200">{tabDescriptions.purchase.title}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {tabDescriptions.purchase.description}
                </p>
              </div>


              {getQuestsByCategory('purchase').length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  No purchase quests available.
                </div>
              ) : (
                <div className="space-y-3">
                  {getQuestsByCategory('purchase').map(renderQuest)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="other" className="space-y-3 mt-4">
              {/* 탭별 설명 영역 */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-200">{tabDescriptions.other.title}</span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {tabDescriptions.other.description}
                </p>
              </div>


              {getQuestsByCategory('other').length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  No other quests available.
                </div>
              ) : (
                getQuestsByCategory('other').map(renderQuest)
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
