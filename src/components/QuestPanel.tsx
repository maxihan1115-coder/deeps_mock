'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Quest } from '@/types';
import { Trophy, Calendar, Clock, Target } from 'lucide-react';

interface QuestPanelProps {
  userId: string;
  gameUuid: number;
}

export default function QuestPanel({ userId, gameUuid }: QuestPanelProps) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // 카탈로그 방식: 별도 초기화 불필요
  const [error, setError] = useState<string | null>(null);
  const [isLinked, setIsLinked] = useState<boolean | null>(null);

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
  }, [gameUuid, userId]);

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
  }, [gameUuid, userId]);


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
          </div>
        ) : (
          quests.map((quest) => {
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
                    30분 내에 완료하지 못했습니다
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
                        onClick={() => window.open('https://www.boradeeps.cc/quest', '_blank')}
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
          })
        )}
      </CardContent>
    </Card>
  );
}
