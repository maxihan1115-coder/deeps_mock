'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Quest } from '@/types';
import { 
  Trophy, 
  Calendar, 
  Clock, 
  Target, 
  Award,
  CheckCircle,
  XCircle
} from 'lucide-react';

export default function QuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null); // string id (미사용 지향)
  const [gameUuid, setGameUuid] = useState<number | null>(null); // numeric uuid 사용
  const [totalRewards, setTotalRewards] = useState(0);
  const [completedQuests, setCompletedQuests] = useState(0);

  // 사용자 정보 가져오기 (세션에서)
  useEffect(() => {
    // 로컬 스토리지에서 사용자 정보 가져오기
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const user = JSON.parse(userInfo);
      setUserId(user.id);
      setGameUuid(user.uuid);
    }
  }, []);

  // 퀘스트 조회
  const fetchQuests = async () => {
    if (gameUuid == null) return;
    
    try {
      console.log('Fetching quests for gameUuid:', gameUuid);
      const response = await fetch(`/api/quests?gameUuid=${gameUuid}`);
      const data = await response.json();
      
      console.log('Quest API response:', data);
      
      if (data.success) {
        setQuests(data.payload);
        console.log('Quests set:', data.payload);
        
        // 통계 계산
        const completed = data.payload.filter((q: Quest) => q.isCompleted).length;
        const totalReward = data.payload
          .filter((q: Quest) => q.isCompleted)
          .reduce((sum: number, q: Quest) => {
            // reward가 문자열인 경우 숫자로 변환 시도, 실패하면 0
            const rewardValue = typeof q.reward === 'string' ? 0 : q.reward;
            return sum + rewardValue;
          }, 0);
        
        setCompletedQuests(completed);
        setTotalRewards(totalReward);
      } else {
        console.error('Quest API error:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch quests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 카탈로그 방식: 초기화 로직 제거



  // 퀘스트 카테고리별 필터링
  const getQuestsByCategory = (category: string) => {
    switch (category) {
      case 'general':
        // 일반 퀘스트 (1-8번)
        return quests.filter(quest => quest.id >= 1 && quest.id <= 8);
      case 'daily':
        // 초기화 퀘스트 (9-10번)
        return quests.filter(quest => quest.id >= 9 && quest.id <= 10);
      case 'attendance':
        // 출석체크 퀘스트 (12번)
        return quests.filter(quest => quest.id === 12);
      case 'ranking':
        // 랭킹형 퀘스트 (placeholder)
        return quests.filter(quest => quest.id === 11);
      case 'other':
        // 기타 퀘스트 (13번)
        return quests.filter(quest => quest.id === 13);
      default:
        return quests;
    }
  };

  // 초기 퀘스트 로드
  useEffect(() => {
    if (gameUuid != null) {
      fetchQuests();
    }
  }, [gameUuid]);

  if (!userId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              로그인이 필요합니다.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
              퀘스트 로딩 중...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-4">
          <Trophy className="w-8 h-8 text-yellow-500" />
          퀘스트
        </h1>
        
        {/* 통계 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">전체 퀘스트</p>
                  <p className="text-2xl font-bold">{quests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">완료된 퀘스트</p>
                  <p className="text-2xl font-bold">{completedQuests}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-600">총 보상</p>
                  <p className="text-2xl font-bold">{totalRewards}점</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 카탈로그 방식: 초기화 버튼 제거 */}
      </div>

      {/* 퀘스트 탭 */}
      {quests.length > 0 && (
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">일반 퀘스트</TabsTrigger>
            <TabsTrigger value="daily">초기화 퀘스트</TabsTrigger>
            <TabsTrigger value="attendance">출석체크 퀘스트</TabsTrigger>
            <TabsTrigger value="ranking">랭킹형 퀘스트</TabsTrigger>
            <TabsTrigger value="other">기타</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getQuestsByCategory('general').length === 0 ? (
                <div className="col-span-full text-center text-gray-500 py-8">
                  일반 퀘스트가 없습니다.
                </div>
              ) : (
                getQuestsByCategory('general').map((quest) => (
                  <QuestCard key={quest.id} quest={quest} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="daily" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getQuestsByCategory('daily').length === 0 ? (
                <div className="col-span-full text-center text-gray-500 py-8">
                  초기화 퀘스트가 없습니다.
                </div>
              ) : (
                getQuestsByCategory('daily').map((quest) => (
                  <QuestCard key={quest.id} quest={quest} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getQuestsByCategory('attendance').length === 0 ? (
                <div className="col-span-full text-center text-gray-500 py-8">
                  출석체크 퀘스트가 없습니다.
                </div>
              ) : (
                getQuestsByCategory('attendance').map((quest) => (
                  <QuestCard key={quest.id} quest={quest} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="ranking" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getQuestsByCategory('ranking').length === 0 ? (
                <div className="col-span-full text-center text-gray-500 py-8">
                  랭킹형 퀘스트가 없습니다.
                </div>
              ) : (
                getQuestsByCategory('ranking').map((quest) => (
                  <QuestCard key={quest.id} quest={quest} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="other" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getQuestsByCategory('other').length === 0 ? (
                <div className="col-span-full text-center text-gray-500 py-8">
                  기타 퀘스트가 없습니다.
                </div>
              ) : (
                getQuestsByCategory('other').map((quest) => (
                  <QuestCard key={quest.id} quest={quest} />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// 퀘스트 카드 컴포넌트
function QuestCard({ quest }: { quest: Quest }) {
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

  return (
    <Card className={`${quest.isCompleted ? 'border-green-200 bg-green-50' : ''}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {getQuestIcon(quest.type)}
              <span className="font-medium">{quest.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getQuestBadgeVariant(quest.type)} className="text-xs">
                {getQuestTypeName(quest.type)}
              </Badge>
              {quest.isCompleted ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </div>
          
          <p className="text-sm text-gray-600">{quest.description}</p>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>진행도</span>
              <span>{quest.progress} / {quest.maxProgress}</span>
            </div>
            <Progress 
              value={(quest.progress / quest.maxProgress) * 100} 
              className="h-2"
            />
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">{quest.reward}점</span>
            </div>
            {quest.isCompleted && (
              <Badge variant="default" className="text-xs bg-green-500">
                완료
              </Badge>
            )}
          </div>
          
          {quest.expiresAt && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              만료: {new Date(quest.expiresAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
