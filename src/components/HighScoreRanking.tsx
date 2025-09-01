'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Calendar } from 'lucide-react';

interface RankingEntry {
  id: string;
  userId: string;
  score: number;
  level: number;
  lines: number;
  createdAt: string;
  username: string;
  uuid: number;
}

interface HighScoreRankingProps {
  currentUserId?: string;
}

export default function HighScoreRanking({ currentUserId }: HighScoreRankingProps) {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 랭킹 조회
  const fetchRankings = async () => {
    try {
      const response = await fetch('/api/highscore/ranking');
      const data = await response.json();

      if (data.success) {
        setRankings(data.rankings);
      }
    } catch (error) {
      console.error('랭킹 조회 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 랭킹 조회
  useEffect(() => {
    fetchRankings();
  }, []);

  // 랭킹 새로고침 (5분마다)
  useEffect(() => {
    const interval = setInterval(fetchRankings, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Medal className="w-4 h-4 text-yellow-500" />;
      case 2:
        return <Medal className="w-4 h-4 text-gray-400" />;
      case 3:
        return <Medal className="w-4 h-4 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-gray-600">{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-50 border-yellow-200';
      case 2:
        return 'bg-gray-50 border-gray-200';
      case 3:
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <Card className="w-80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            랭킹
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">로딩 중...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-80 lg:w-80 min-w-80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          랭킹
          <Badge variant="outline" className="ml-auto text-xs">
            TOP 10
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rankings.length > 0 ? (
          rankings.map((entry, index) => {
            const rank = index + 1;
            const isCurrentUser = currentUserId === entry.userId;
            
            return (
              <div
                key={entry.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  isCurrentUser ? 'bg-blue-50 border-blue-200' : getRankColor(rank)
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6">
                    {getRankIcon(rank)}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        isCurrentUser ? 'text-blue-700' : 'text-gray-900'
                      }`}>
                        {entry.username}
                      </span>
                      {isCurrentUser && (
                        <Badge variant="secondary" className="text-xs">
                          나
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {new Date(entry.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-gray-900">
                    {entry.score.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Lv.{entry.level}</span>
                    <span>•</span>
                    <span>{entry.lines}라인</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center text-gray-500 py-8">
            <Trophy className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">아직 랭킹이 없습니다.</p>
            <p className="text-xs mt-1">첫 번째 기록을 만들어보세요!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
