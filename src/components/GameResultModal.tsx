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
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold text-white">
            게임 결과
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {/* 새로운 최고 기록 알림 */}
          {isNewHighScore && (
            <Card className="bg-emerald-900/20 border-emerald-500/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-400">새로운 최고 기록!</h3>
                    <p className="text-xs text-emerald-200/70">축하합니다! 새로운 개인 최고 점수를 달성했습니다.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 점수 카드 */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm font-semibold text-slate-300">최종 점수</span>
                </div>
                <span className="text-xl font-bold text-white">
                  {score.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 레벨과 라인 */}
          <div className="grid grid-cols-2 gap-2">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Target className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-medium text-slate-300">레벨</span>
                  </div>
                  <span className="text-sm font-bold text-blue-400">
                    {level}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <BarChart3 className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-medium text-slate-300">라인</span>
                  </div>
                  <span className="text-sm font-bold text-purple-400">
                    {lines}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 랭킹 정보 */}
          {rankingInfo && rankingInfo.currentRank > 0 && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-400" />
                    <span className="text-sm font-semibold text-slate-300">랭킹 정보</span>
                  </div>
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 text-xs border-purple-500/30">
                    {rankingInfo.currentRank}위
                  </Badge>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">현재 순위:</span>
                    <span className="font-semibold text-slate-200">{rankingInfo.currentRank}위</span>
                  </div>

                  {/* 순위 변동이 있을 때만 이전 순위와 변동 표시 */}
                  {rankingInfo.previousRank && rankingInfo.rankChange && rankingInfo.rankChange !== 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-400">이전 순위:</span>
                        <span className="font-semibold text-slate-200">{rankingInfo.previousRank}위</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-400">순위 변동:</span>
                        <span className={`font-semibold flex items-center gap-1 ${rankingInfo.rankChange > 0
                          ? 'text-red-400'
                          : 'text-green-400'
                          }`}>
                          <TrendingUp className={`w-3 h-3 ${rankingInfo.rankChange > 0 ? 'rotate-180' : ''}`} />
                          {Math.abs(rankingInfo.rankChange)}위
                        </span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between">
                    <span className="text-slate-400">전체 플레이어:</span>
                    <span className="font-semibold text-slate-200">{rankingInfo.totalPlayers.toLocaleString()}명</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 획득 골드 */}
          {earnedGold > 0 && (
            <Card className="bg-amber-900/20 border-amber-500/30">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-500" />
                    <span className="text-sm font-semibold text-amber-200">획득 골드</span>
                  </div>
                  <span className="text-lg font-bold text-amber-400">
                    +{earnedGold.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-amber-200/60 mt-1">
                  점수의 1/10이 골드로 지급됩니다
                </p>
              </CardContent>
            </Card>
          )}

          {/* 버튼 */}
          <div className="flex justify-center pt-1">
            <Button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm w-full"
            >
              확인
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
