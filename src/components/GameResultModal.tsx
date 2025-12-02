'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Target, BarChart3, Coins, Award, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface GameResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameResult: {
    score: number;
    level: number;
    lines: number;
    earnedGold: number;
    isNewHighScore?: boolean;
    isRankingUpdated?: boolean;
    rankingInfo?: {
      currentRank: number;
      previousRank?: number;
      rankChange?: number;
      totalPlayers: number;
    };
  };
}

export default function GameResultModal({
  isOpen,
  onClose,
  gameResult
}: GameResultModalProps) {
  const { score, level, lines, earnedGold, isNewHighScore, rankingInfo } = gameResult;


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
            게임 결과
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {/* 새로운 최고 기록 알림 */}
          {isNewHighScore && (
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-green-800">새로운 최고 기록!</h3>
                    <p className="text-xs text-green-600">축하합니다! 새로운 개인 최고 점수를 달성했습니다.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 점수 카드 */}
          <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm font-semibold text-gray-700">최종 점수</span>
                </div>
                <span className="text-xl font-bold text-yellow-600">
                  {score.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 레벨과 라인 */}
          <div className="grid grid-cols-2 gap-2">
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Target className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium text-gray-700">레벨</span>
                  </div>
                  <span className="text-sm font-bold text-blue-600">
                    {level}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <BarChart3 className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-medium text-gray-700">라인</span>
                  </div>
                  <span className="text-sm font-bold text-green-600">
                    {lines}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 랭킹 정보 */}
          {rankingInfo && rankingInfo.currentRank > 0 && (
            <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-semibold text-gray-700">랭킹 정보</span>
                  </div>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
                    {rankingInfo.currentRank}위
                  </Badge>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">현재 순위:</span>
                    <span className="font-semibold">{rankingInfo.currentRank}위</span>
                  </div>

                  {/* 순위 변동이 있을 때만 이전 순위와 변동 표시 */}
                  {rankingInfo.previousRank && rankingInfo.rankChange && rankingInfo.rankChange !== 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">이전 순위:</span>
                        <span className="font-semibold">{rankingInfo.previousRank}위</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-600">순위 변동:</span>
                        <span className={`font-semibold flex items-center gap-1 ${rankingInfo.rankChange > 0
                            ? 'text-red-600'
                            : 'text-green-600'
                          }`}>
                          <TrendingUp className={`w-3 h-3 ${rankingInfo.rankChange > 0 ? 'rotate-180' : ''}`} />
                          {Math.abs(rankingInfo.rankChange)}위
                        </span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between">
                    <span className="text-gray-600">전체 플레이어:</span>
                    <span className="font-semibold">{rankingInfo.totalPlayers.toLocaleString()}명</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 획득 골드 */}
          {earnedGold > 0 && (
            <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-600" />
                    <span className="text-sm font-semibold text-gray-700">획득 골드</span>
                  </div>
                  <span className="text-lg font-bold text-amber-600">
                    +{earnedGold.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  점수의 1/10이 골드로 지급됩니다
                </p>
              </CardContent>
            </Card>
          )}

          {/* 버튼 */}
          <div className="flex justify-center pt-1">
            <Button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold text-sm"
            >
              확인
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
