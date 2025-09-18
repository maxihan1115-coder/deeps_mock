'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Target, BarChart3, Coins } from 'lucide-react';

interface GameResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameResult: {
    score: number;
    level: number;
    lines: number;
    earnedGold: number;
  };
}

export default function GameResultModal({ 
  isOpen, 
  onClose, 
  gameResult 
}: GameResultModalProps) {
  const { score, level, lines, earnedGold } = gameResult;


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
            게임 결과
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 점수 카드 */}
          <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-yellow-600" />
                  <span className="text-lg font-semibold text-gray-700">최종 점수</span>
                </div>
                <span className="text-2xl font-bold text-yellow-600">
                  {score.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 레벨과 라인 */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">레벨</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">
                    {level}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">라인</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    {lines}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 획득 골드 */}
          {earnedGold > 0 && (
            <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Coins className="w-6 h-6 text-amber-600" />
                    <span className="text-lg font-semibold text-gray-700">획득 골드</span>
                  </div>
                  <span className="text-2xl font-bold text-amber-600">
                    +{earnedGold.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  점수의 1/10이 골드로 지급됩니다
                </p>
              </CardContent>
            </Card>
          )}

          {/* 버튼 */}
          <div className="flex justify-center pt-2">
            <Button
              onClick={onClose}
              className="px-8 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold"
            >
              확인
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
