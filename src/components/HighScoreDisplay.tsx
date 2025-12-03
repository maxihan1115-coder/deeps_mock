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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameUuid]);

  // 게임 종료 시에만 최고 점수 저장 (실시간 저장 제거)
  // useEffect(() => {
  //   if (currentScore > 0) {
  //     saveHighScore();
  //   }
  // }, [currentScore, currentLevel, currentLines]);

  if (isLoading) {
    return (
      <Card className="border border-gray-200 dark:border-gray-700 shadow-sm dark:bg-gray-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            High Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 dark:text-gray-400">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  // 현재 점수와 최고 점수 비교는 제거 (props에서 currentScore 제거됨)

  return (
    <Card className="border border-gray-200 dark:border-gray-700 shadow-sm dark:bg-gray-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          High Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {highScore ? (
          <>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Score</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {highScore.score.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Level</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{highScore.level}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Lines</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{highScore.lines}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Achieved</span>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(highScore.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

          </>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 py-4">
            <p className="text-sm">No record</p>
            <p className="text-xs mt-1">Play your first game!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
