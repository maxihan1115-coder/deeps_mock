'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Calendar } from 'lucide-react';

interface HighScore {
  score: number;
  level: number;
  lines: number;
  createdAt: string;
}

interface HighScoreDisplayProps {
  gameUuid: number; // userId → gameUuid (숫자)
}

export default function HighScoreDisplay({ 
  gameUuid // userId → gameUuid (숫자)
}: HighScoreDisplayProps) {
  const [highScore, setHighScore] = useState<HighScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 최고 점수 조회
  const fetchHighScore = async () => {
    try {
      const response = await fetch(`/api/highscore?gameUuid=${gameUuid}`);
      const data = await response.json();

      if (data.success) {
        setHighScore(data.highScore);
      }
    } catch (error) {
      console.error('최고 점수 조회 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };



  // 컴포넌트 마운트 시 최고 점수 조회
  useEffect(() => {
    fetchHighScore();
  }, [gameUuid]);

  // 게임 종료 시에만 최고 점수 저장 (실시간 저장 제거)
  // useEffect(() => {
  //   if (currentScore > 0) {
  //     saveHighScore();
  //   }
  // }, [currentScore, currentLevel, currentLines]);

  if (isLoading) {
    return (
      <Card className="w-80 lg:w-80 min-w-80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            최고 점수
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">로딩 중...</div>
        </CardContent>
      </Card>
    );
  }

  // 현재 점수와 최고 점수 비교는 제거 (props에서 currentScore 제거됨)

  return (
    <Card className="w-80 lg:w-80 min-w-80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          최고 점수
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {highScore ? (
          <>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">최고 점수:</span>
                <span className="text-sm font-bold text-gray-900">
                  {highScore.score.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">달성 레벨:</span>
                <span className="text-sm font-bold">{highScore.level}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">클리어 라인:</span>
                <span className="text-sm font-bold">{highScore.lines}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">달성일:</span>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-gray-500" />
                  <span className="text-xs text-gray-600">
                    {new Date(highScore.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
            </div>

          </>
        ) : (
          <div className="text-center text-gray-500">
            <p className="text-sm">아직 기록이 없습니다.</p>
            <p className="text-xs mt-1">첫 번째 기록을 만들어보세요!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
