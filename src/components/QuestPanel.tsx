'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false); // 새로고침 상태 추가
  // 카탈로그 방식: 별도 초기화 불필요
  const [error, setError] = useState<string | null>(null);
  const [isLinked, setIsLinked] = useState<boolean | null>(null);

  // 탭별 설명 데이터
  const tabDescriptions = {
    general: {
      title: "플랫폼 연동_인게임",
      description: "플랫폼 연동 시 카운팅 되는 게임 퀘스트",
      icon: Star
    },
    daily: {
      title: "일일 퀘스트",
      description: "매일 초기화되는 퀘스트입니다. 초기화 시간은 자정 입니다.",
      icon: RefreshCw
    },
    attendance: {
      title: "출석체크 퀘스트",
      description: "출석체크를 통해 완료할 수 있는 퀘스트.",
      icon: Calendar
    },
    ranking: {
      title: "랭킹형 퀘스트",
      description: "시즌 랭킹에 따른 퀘스트 달성 여부를 체크합니다.",
      icon: Award
    },
    purchase: {
      title: "구매 퀘스트",
      description: "아이템 구매를 통해 퀘스트 달성 여부 체크",
      icon: ShoppingCart
    },
    other: {
      title: "기타 퀘스트",
      description: "특별한 조건을 만족해야 완료할 수 있는 퀘스트입니다.",
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

  // 퀘스트 목록 가져오기
  const fetchQuests = useCallback(async () => {
    try {
      const response = await fetch(`/api/quests?gameUuid=${gameUuid}`);
      const data = await response.json();

      if (data.success) {
        const questsData = data.payload || [];
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
      } else {
        console.error('퀘스트 목록 가져오기 실패:', data.error);
        setQuests([]);
        setIsLinked(false);
        setError(data.error || '퀘스트 조회에 실패했습니다.');
      }
    } catch (error) {
      console.error('퀘스트 목록 가져오기 중 오류:', error);
      setQuests([]);
      setIsLinked(false);
      setError('퀘스트 조회 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [gameUuid]);

  // 새로고침 핸들러 추가
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return; // 이미 새로고침 중이면 중복 실행 방지

    setIsRefreshing(true);
    try {
      await fetchQuests();
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, fetchQuests]);

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

  // 퀘스트 타입별 한글 이름
  const getQuestTypeName = (type: Quest['type']) => {
    switch (type) {
      case 'daily':
        return '일일';
      case 'weekly':
        return '주간';
      case 'monthly':
        return '월간';
      case 'single':
        return '단일';
      default:
        return '기타';
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
        className={`border rounded-lg p-3 space-y-2 ${isFailed ? 'bg-gray-100 opacity-60' : ''}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getQuestIcon(quest.type)}
            <span className={`font-medium text-sm ${isFailed ? 'text-gray-600' : ''}`}>
              {quest.title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getQuestBadgeVariant(quest.type)} className="text-xs">
              {getQuestTypeName(quest.type)}
            </Badge>
            {isFailed && (
              <Badge variant="destructive" className="text-xs">
                실패
              </Badge>
            )}
          </div>
        </div>

        <p className={`text-xs ${isFailed ? 'text-gray-500' : 'text-gray-600'}`}>
          {quest.description}
        </p>

        {isFailed && (
          <p className="text-xs text-red-500 font-medium">
            {quest.id === '13'
              ? '30분 내에 완료하지 못했습니다'
              : '일주일 내에 완료하지 못했습니다'
            }
          </p>
        )}

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>진행도</span>
            <span>{quest.progress} / {quest.maxProgress}</span>
          </div>
          <Progress
            value={(quest.progress / quest.maxProgress) * 100}
            className={`h-2 ${isFailed ? 'bg-gray-200' : ''}`}
          />
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">보상:</span>
            {quest.claimValue && quest.claimSymbol ? (
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-blue-600">
                  {formatClaimValue(quest.claimValue)}
                </span>
                {quest.claimSymbol !== 'REPL' && (
                  <span className="text-xs font-medium text-blue-500">
                    {quest.claimSymbol}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm font-medium text-gray-500">
                {quest.reward} 포인트
              </span>
            )}
          </div>
          {quest.isCompleted && !isFailed && (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs bg-green-500">
                완료
              </Badge>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-6 px-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                onClick={() => window.open('https://www.boradeeps.cc/?bappId=10006', '_blank')}
              >
                보상받기
              </Button>
            </div>
          )}
        </div>

        {quest.expiresAt && (
          <div className="text-xs text-gray-500">
            만료: {new Date(quest.expiresAt).toLocaleDateString()}
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

  // 초기 연동 상태 확인 및 퀘스트 로드 (병렬 처리)
  useEffect(() => {
    const initializePanel = async () => {
      // 플랫폼 연동 상태 확인과 퀘스트 로드를 병렬로 실행
      await Promise.all([
        checkPlatformLinkStatus(),
        fetchQuests()
      ]);
    };

    if (gameUuid) {
      initializePanel();
    }
  }, [gameUuid, fetchQuests, checkPlatformLinkStatus]);

  // 주기적으로 퀘스트 상태 새로고침 (연동된 유저만)
  useEffect(() => {
    if (!isLinked || !gameUuid) return;

    const refreshInterval = setInterval(() => {
      fetchQuests();
    }, 30000); // 30초마다 새로고침

    return () => {
      clearInterval(refreshInterval);
    };
  }, [isLinked, gameUuid, fetchQuests]);

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl">
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
            퀘스트 로딩 중...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            퀘스트
          </CardTitle>
          <div className="flex items-center gap-3">
            {/* 플랫폼 연동 상태 표시 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">플랫폼 연동 여부:</span>
              <span className={`text-sm font-medium ${isLinked === true ? 'text-green-600' : 'text-red-600'}`}>
                {isLinked === true ? '연동 됨' : isLinked === false ? '미연동' : '확인 중...'}
              </span>
            </div>
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
                fetchQuests();
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
                <span className="hidden sm:inline">일반</span>
              </TabsTrigger>
              <TabsTrigger value="daily" className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                <span className="hidden sm:inline">초기화</span>
              </TabsTrigger>
              <TabsTrigger value="attendance" className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span className="hidden sm:inline">출석체크</span>
              </TabsTrigger>
              <TabsTrigger value="ranking" className="flex items-center gap-1">
                <Award className="w-3 h-3" />
                <span className="hidden sm:inline">랭킹형</span>
              </TabsTrigger>
              <TabsTrigger value="purchase" className="flex items-center gap-1">
                <ShoppingCart className="w-3 h-3" />
                <span className="hidden sm:inline">아이템 구매</span>
              </TabsTrigger>
              <TabsTrigger value="other" className="flex items-center gap-1">
                <UserX className="w-3 h-3" />
                <span className="hidden sm:inline">기타</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-3 mt-4">
              {/* 탭별 설명 영역 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">{tabDescriptions.general.title}</span>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  {tabDescriptions.general.description}
                </p>
              </div>


              {getQuestsByCategory('general').length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  플랫폼 연동_인게임 퀘스트가 없습니다.
                </div>
              ) : (
                getQuestsByCategory('general').map(renderQuest)
              )}
            </TabsContent>

            <TabsContent value="daily" className="space-y-3 mt-4">
              {/* 탭별 설명 영역 */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">{tabDescriptions.daily.title}</span>
                </div>
                <p className="text-xs text-orange-700 mt-1">
                  {tabDescriptions.daily.description}
                </p>
              </div>


              {getQuestsByCategory('daily').length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  초기화 퀘스트가 없습니다.
                </div>
              ) : (
                getQuestsByCategory('daily').map(renderQuest)
              )}
            </TabsContent>

            <TabsContent value="attendance" className="space-y-3 mt-4">
              {/* 탭별 설명 영역 */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">{tabDescriptions.attendance.title}</span>
                </div>
                <p className="text-xs text-purple-700 mt-1">
                  {tabDescriptions.attendance.description}
                </p>
              </div>


              {getQuestsByCategory('attendance').length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  출석체크 퀘스트가 없습니다.
                </div>
              ) : (
                getQuestsByCategory('attendance').map(renderQuest)
              )}
            </TabsContent>

            <TabsContent value="ranking" className="space-y-3 mt-4">
              {/* 탭별 설명 영역 - 문구 제거 */}


              {/* 현재 시즌 랭킹 정보 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">현재 시즌 랭킹</span>
                </div>
                <p className="text-xs text-blue-700">
                  시즌이 종료되면 랭킹에 따른 퀘스트가 자동으로 달성됩니다. (종료일: 2025년 10월 15일 11:00 KST)
                </p>
              </div>

              {getQuestsByCategory('ranking').length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  <div className="space-y-2">
                    <p>시즌 랭킹 퀘스트가 없습니다.</p>
                    <p className="text-sm">시즌이 종료되면 랭킹에 따른 퀘스트가 표시됩니다.</p>
                  </div>
                </div>
              ) : (
                getQuestsByCategory('ranking').map(renderQuest)
              )}
            </TabsContent>

            <TabsContent value="purchase" className="space-y-3 mt-4">
              {/* 탭별 설명 영역 */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">{tabDescriptions.purchase.title}</span>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  {tabDescriptions.purchase.description}
                </p>
              </div>


              {getQuestsByCategory('purchase').length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  아이템 구매 퀘스트가 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {getQuestsByCategory('purchase').map(renderQuest)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="other" className="space-y-3 mt-4">
              {/* 탭별 설명 영역 */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-800">{tabDescriptions.other.title}</span>
                </div>
                <p className="text-xs text-gray-700 mt-1">
                  {tabDescriptions.other.description}
                </p>
              </div>


              {getQuestsByCategory('other').length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  기타 퀘스트가 없습니다.
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
