'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar } from 'lucide-react';

interface HighScore {
  score: number;
  level: number;
  lines: number;
  createdAt: string;
}

interface HighScoreDisplayProps {
  userId: string;
  currentScore: number;
  currentLevel: number;
  currentLines: number;
}

export default function HighScoreDisplay({ 
  userId, 
  currentScore, 
  currentLevel, 
  currentLines 
}: HighScoreDisplayProps) {
  const [highScore, setHighScore] = useState<HighScore | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 최고 점수 조회
  const fetchHighScore = async () => {
    try {
      const response = await fetch(`/api/highscore?userId=${userId}`);
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

  // 최고 점수 저장
  const saveHighScore = async () => {
    try {
      const response = await fetch('/api/highscore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          score: currentScore,
          level: currentLevel,
          lines: currentLines,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setHighScore(data.highScore);
        setIsNewRecord(data.isNewRecord);
        
        // 새 기록 달성 시 축하 메시지
        if (data.isNewRecord) {
          setTimeout(() => {
            setIsNewRecord(false);
          }, 3000);
        }
      }
    } catch (error) {
      console.error('최고 점수 저장 오류:', error);
    }
  };

  // 컴포넌트 마운트 시 최고 점수 조회
  useEffect(() => {
    fetchHighScore();
  }, [userId]);

  // 현재 점수가 변경될 때마다 최고 점수 저장 시도
  useEffect(() => {
    if (currentScore > 0) {
      saveHighScore();
    }
  }, [currentScore, currentLevel, currentLines]);

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

  const isCurrentScoreHigher = highScore ? currentScore > highScore.score : true;

  return (
    <Card className="w-80 lg:w-80 min-w-80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          최고 점수
          {isNewRecord && (
            <Badge variant="destructive" className="ml-2">
              NEW!
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {highScore ? (
          <>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">최고 점수:</span>
                <span className={`text-sm font-bold ${isCurrentScoreHigher ? 'text-green-600' : 'text-gray-900'}`}>
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

            {/* 현재 점수와 비교 */}
            {currentScore > 0 && (
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">현재 점수:</span>
                  <span className={`text-sm font-bold ${isCurrentScoreHigher ? 'text-green-600' : 'text-gray-900'}`}>
                    {currentScore.toLocaleString()}
                  </span>
                </div>
                {isCurrentScoreHigher && (
                  <div className="text-xs text-green-600 text-center mt-1">
                    🎉 새로운 기록 달성!
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-gray-500">
            <p className="text-sm">아직 기록이 없습니다.</p>
            {currentScore > 0 && (
              <p className="text-xs mt-1">첫 번째 기록을 만들어보세요!</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
