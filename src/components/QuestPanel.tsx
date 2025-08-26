'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Quest } from '@/types';
import { Trophy, Calendar, Clock, Target } from 'lucide-react';

interface QuestPanelProps {
  userId: string;
  currentScore: number;
}

export default function QuestPanel({ userId, currentScore }: QuestPanelProps) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLinked, setIsLinked] = useState<boolean | null>(null);

  // 퀘스트 조회
  const fetchQuests = async () => {
    try {
      console.log('Fetching quests for userId:', userId);
      const response = await fetch(`/api/quests?userId=${userId}`);
      const data = await response.json();
      
      console.log('Quest API response:', data);
      
      if (data.success) {
        setQuests(data.payload.quests || data.payload);
        setIsLinked(true);
        setError(null);
        console.log('Quests set:', data.payload.quests || data.payload);
      } else {
        console.error('Quest API error:', data.error);
        // 미연동 유저인 경우에도 기본 퀘스트 목록을 보여줌
        if (data.error === 'INVALID_USER' && data.payload === '미연동 유저') {
          setIsLinked(false);
          setError('미연동 상태: 플랫폼 연동을 완료하면 퀘스트 진행도가 저장됩니다.');
          // 테트리스 게임에 맞는 기본 퀘스트 목록 설정
          setQuests([
            {
              id: '1',
              title: 'FIRST_GAME',
              description: '첫 번째 테트리스 게임을 플레이하세요',
              type: 'single',
              progress: 0,
              maxProgress: 1,
              reward: 50,
              isCompleted: false,
            },
            {
              id: '2',
              title: 'SCORE_1000',
              description: '1000점 이상을 달성하세요',
              type: 'single',
              progress: 0,
              maxProgress: 1,
              reward: 100,
              isCompleted: false,
            },
            {
              id: '3',
              title: 'SCORE_5000',
              description: '5000점 이상을 달성하세요',
              type: 'single',
              progress: 0,
              maxProgress: 1,
              reward: 200,
              isCompleted: false,
            },
            {
              id: '4',
              title: 'SCORE_10000',
              description: '10000점 이상을 달성하세요',
              type: 'single',
              progress: 0,
              maxProgress: 1,
              reward: 500,
              isCompleted: false,
            },
            {
              id: '5',
              title: 'CLEAR_LINES_10',
              description: '총 10줄을 제거하세요',
              type: 'single',
              progress: 0,
              maxProgress: 10,
              reward: 150,
              isCompleted: false,
            },
            {
              id: '6',
              title: 'CLEAR_LINES_50',
              description: '총 50줄을 제거하세요',
              type: 'single',
              progress: 0,
              maxProgress: 50,
              reward: 300,
              isCompleted: false,
            },
            {
              id: '7',
              title: 'REACH_LEVEL_5',
              description: '레벨 5에 도달하세요',
              type: 'single',
              progress: 0,
              maxProgress: 1,
              reward: 250,
              isCompleted: false,
            },
            {
              id: '8',
              title: 'REACH_LEVEL_10',
              description: '레벨 10에 도달하세요',
              type: 'single',
              progress: 0,
              maxProgress: 1,
              reward: 500,
              isCompleted: false,
            },
            {
              id: '9',
              title: 'PLAY_GAMES_5',
              description: '5게임을 플레이하세요',
              type: 'single',
              progress: 0,
              maxProgress: 5,
              reward: 100,
              isCompleted: false,
            },
            {
              id: '10',
              title: 'PLAY_GAMES_20',
              description: '20게임을 플레이하세요',
              type: 'single',
              progress: 0,
              maxProgress: 20,
              reward: 300,
              isCompleted: false,
            },
            {
              id: '11',
              title: 'HARD_DROP_10',
              description: '하드 드롭을 10번 사용하세요',
              type: 'single',
              progress: 0,
              maxProgress: 10,
              reward: 80,
              isCompleted: false,
            },
            {
              id: '12',
              title: 'DAILY_LOGIN',
              description: '7일 연속 로그인하세요',
              type: 'daily',
              progress: 0,
              maxProgress: 7,
              reward: 200,
              isCompleted: false,
            },
          ]);
        } else {
          setError('퀘스트 조회 중 오류가 발생했습니다.');
        }
      }
    } catch (error) {
      console.error('Failed to fetch quests:', error);
      setError('퀘스트 조회 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 퀘스트 진행도 업데이트
  const updateQuestProgress = async (questId: string, progress: number) => {
    try {
      const response = await fetch('/api/quests/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, questId, progress }),
      });

      const data = await response.json();
      
      if (data.success) {
        // 퀘스트 목록 업데이트
        setQuests(prevQuests => 
          prevQuests.map(quest => 
            quest.id === questId ? data.payload : quest
          )
        );
      }
    } catch (error) {
      console.error('Failed to update quest progress:', error);
    }
  };

  // 퀘스트 초기화
  const initializeQuests = async () => {
    setIsInitializing(true);
    try {
      const response = await fetch('/api/quests/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      
      if (data.success) {
        setQuests(data.payload.quests);
        console.log('Quests initialized successfully:', data.payload.quests);
      } else {
        console.error('Failed to initialize quests:', data.error);
      }
    } catch (error) {
      console.error('Failed to initialize quests:', error);
    } finally {
      setIsInitializing(false);
    }
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

  // 점수 기반 퀘스트 자동 업데이트
  useEffect(() => {
    if (currentScore > 0) {
      quests.forEach(quest => {
        if (!quest.isCompleted) {
          let newProgress = quest.progress;
          
          // 점수 관련 퀘스트 업데이트
          if (quest.title.includes('점수')) {
            newProgress = Math.min(currentScore, quest.maxProgress);
          }
          
          // 게임 플레이 관련 퀘스트 업데이트
          if (quest.title.includes('게임 플레이') && quest.progress === 0) {
            newProgress = 1;
          }
          
          if (newProgress !== quest.progress) {
            updateQuestProgress(quest.id, newProgress);
          }
        }
      });
    }
  }, [currentScore, quests]);

  // 초기 퀘스트 로드
  useEffect(() => {
    fetchQuests();
  }, [userId]);

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            퀘스트
          </CardTitle>
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
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          퀘스트
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 연동 상태 표시 */}
        {isLinked === false && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm font-medium text-yellow-800">미연동 상태</span>
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              플랫폼 연동을 완료하면 퀘스트 진행도가 저장됩니다.
            </p>
          </div>
        )}
        
        {isLinked === true && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-800">연동 완료</span>
            </div>
            <p className="text-xs text-green-700 mt-1">
              퀘스트 진행도가 실시간으로 저장됩니다.
            </p>
          </div>
        )}

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
            <Button
              onClick={initializeQuests}
              disabled={isInitializing}
              size="sm"
              className="w-full"
            >
              {isInitializing ? '초기화 중...' : '퀘스트 초기화'}
            </Button>
          </div>
        ) : (
          quests.map((quest) => (
            <div key={quest.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getQuestIcon(quest.type)}
                  <span className="font-medium text-sm">{quest.title}</span>
                </div>
                <Badge variant={getQuestBadgeVariant(quest.type)} className="text-xs">
                  {getQuestTypeName(quest.type)}
                </Badge>
              </div>
              
              <p className="text-xs text-gray-600">{quest.description}</p>
              
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>진행도</span>
                  <span>{quest.progress} / {quest.maxProgress}</span>
                </div>
                <Progress 
                  value={(quest.progress / quest.maxProgress) * 100} 
                  className="h-2"
                />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  보상: {quest.reward}점
                </span>
                {quest.isCompleted && (
                  <Badge variant="default" className="text-xs bg-green-500">
                    완료
                  </Badge>
                )}
              </div>
              
              {quest.expiresAt && (
                <div className="text-xs text-gray-500">
                  만료: {new Date(quest.expiresAt).toLocaleDateString()}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
