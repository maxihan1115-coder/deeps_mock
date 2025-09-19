'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface GachaRouletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameUuid: number;
  gachaItem: {
    id: string;
    name: string;
    description: string;
    price: number;
    gachaRewards: Array<{diamonds: number, probability: number}>;
  };
  onPurchaseSuccess?: () => void;
}

interface GachaResult {
  earnedDiamonds: number;
  finalBalance: {
    diamond: number;
  };
}

export default function GachaRouletteModal({ 
  isOpen, 
  onClose, 
  gameUuid,
  gachaItem,
  onPurchaseSuccess 
}: GachaRouletteModalProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<GachaResult | null>(null);
  const [currentHighlight, setCurrentHighlight] = useState(0);

  // 룰렛 아이템들 (11개)
  const rouletteItems = gachaItem.gachaRewards.map(reward => ({
    diamonds: reward.diamonds,
    probability: reward.probability
  }));

  // 룰렛 스핀 애니메이션
  useEffect(() => {
    if (isSpinning) {
      const interval = setInterval(() => {
        setCurrentHighlight(prev => (prev + 1) % rouletteItems.length);
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isSpinning, rouletteItems.length]);

  const handlePurchase = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setIsSpinning(true);

    try {
      console.log('🎰 가챠 구매 시작:', { gameUuid, gachaItemId: gachaItem.id });

      const response = await fetch('/api/gacha/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameUuid,
          gachaItemId: gachaItem.id
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ 가챠 구매 성공:', data.payload);
        
        // 스핀 애니메이션 후 결과 표시
        setTimeout(() => {
          setIsSpinning(false);
          setResult(data.payload);
        }, 3000); // 3초간 스핀

      } else {
        console.error('❌ 가챠 구매 실패:', data.error);
        setIsSpinning(false);
        alert(data.error || '가챠 구매에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ 가챠 구매 중 오류:', error);
      setIsSpinning(false);
      alert('가챠 구매 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setCurrentHighlight(0);
    onClose();
  };

  const handlePlayAgain = () => {
    setResult(null);
    setCurrentHighlight(0);
  };

  const getDiamondColor = (diamonds: number) => {
    if (diamonds >= 8000) return 'bg-gradient-to-r from-purple-500 to-pink-500';
    if (diamonds >= 5000) return 'bg-gradient-to-r from-yellow-400 to-orange-500';
    if (diamonds >= 2000) return 'bg-gradient-to-r from-blue-500 to-cyan-500';
    return 'bg-gradient-to-r from-gray-400 to-gray-600';
  };

  const getDiamondEmoji = (diamonds: number) => {
    if (diamonds >= 8000) return '💎';
    if (diamonds >= 5000) return '💠';
    if (diamonds >= 2000) return '🔷';
    return '💎';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            {result ? '🎉 축하합니다!' : '🎰 다이아몬드 룰렛'}
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-6">
            {/* 룰렛 그리드 */}
            <div className="grid grid-cols-4 gap-3 p-4 bg-gray-100 rounded-lg">
              {rouletteItems.map((item, index) => (
                <Card 
                  key={index}
                  className={`transition-all duration-200 ${
                    isSpinning && currentHighlight === index 
                      ? 'ring-4 ring-yellow-400 shadow-lg scale-105' 
                      : 'hover:shadow-md'
                  }`}
                >
                  <CardContent className="p-3 text-center">
                    <div className={`text-2xl mb-1 ${getDiamondColor(item.diamonds)} bg-clip-text text-transparent`}>
                      {getDiamondEmoji(item.diamonds)}
                    </div>
                    <div className="text-sm font-bold">
                      {item.diamonds.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.probability}%
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 구매 정보 */}
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold">{gachaItem.name}</p>
              <p className="text-gray-600">{gachaItem.description}</p>
              <div className="flex justify-center items-center gap-2">
                <span className="text-2xl">💎</span>
                <span className="text-xl font-bold">{gachaItem.price.toLocaleString()}</span>
                <span className="text-gray-600">다이아몬드</span>
              </div>
            </div>

            {/* 구매 버튼 */}
            <div className="flex justify-center">
              <Button 
                onClick={handlePurchase}
                disabled={isProcessing}
                className="px-8 py-3 text-lg font-bold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {isProcessing ? (
                  isSpinning ? '🎰 돌리는 중...' : '처리 중...'
                ) : (
                  '🎰 룰렛 돌리기'
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* 결과 표시 */
          <div className="space-y-6 text-center">
            {/* 결과 애니메이션 */}
            <div className="relative">
              <div className={`text-8xl mb-4 ${getDiamondColor(result.earnedDiamonds)} bg-clip-text text-transparent`}>
                {getDiamondEmoji(result.earnedDiamonds)}
              </div>
              <div className="text-4xl font-bold text-green-600 mb-2">
                {result.earnedDiamonds.toLocaleString()} 다이아몬드
              </div>
              <div className="text-xl text-gray-600 mb-4">
                획득!
              </div>
            </div>

            {/* 보유 다이아몬드 */}
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="text-lg font-semibold mb-2">💎 보유 다이아몬드</div>
              <div className="text-2xl font-bold text-blue-600">
                {result.finalBalance.diamond.toLocaleString()}개
              </div>
            </div>

            {/* 버튼들 */}
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={handleClose}
                variant="outline"
                className="px-6"
              >
                확인
              </Button>
              <Button 
                onClick={handlePlayAgain}
                className="px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                다시 구매
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
