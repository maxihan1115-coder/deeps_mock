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

  // 퀘스트 조회
  const fetchQuests = async () => {
    try {
      console.log('Fetching quests for userId:', userId);
      const response = await fetch(`/api/quests?userId=${userId}`);
      const data = await response.json();
      
      console.log('Quest API response:', data);
      
      if (data.success) {
        setQuests(data.payload);
        console.log('Quests set:', data.payload);
      } else {
        console.error('Quest API error:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch quests:', error);
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
    <Card className="w-full max-w-4xl max-h-96 overflow-y-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          퀘스트
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
