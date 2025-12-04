'use client';

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Gem } from 'lucide-react';
import RouletteWheel, { RouletteWheelRef } from './RouletteWheel';

interface GachaRouletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameUuid: number;
  gachaItem: {
    id: string;
    name: string;
    description: string;
    price: number;
    gachaRewards: Array<{ diamonds: number, probability: number }>;
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
  gachaItem
}: GachaRouletteModalProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLocked, setIsLocked] = useState(false); // 한번 클릭 후 재활성화 방지
  const [result, setResult] = useState<GachaResult | null>(null);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const rouletteRef = useRef<RouletteWheelRef>(null);

  // 룰렛 보상 데이터
  const rewards = gachaItem.gachaRewards.map(reward => reward.diamonds);

  // 룰렛 색상 배열 (11개) - 다크 테마에 어울리는 블루/네이비 톤온톤
  const colors = [
    '#3b82f6', '#1e40af', '#3b82f6', '#1e40af', '#3b82f6',
    '#1e40af', '#3b82f6', '#1e40af', '#3b82f6', '#1e40af', '#60a5fa'
  ];

  const handlePurchase = async () => {
    if (isProcessing || isLocked) return;

    setIsProcessing(true);
    setIsSpinning(true);
    setIsLocked(true);

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

        // 서버 응답을 룰렛 회전과 함께 전달
        rouletteRef.current?.spinRandom(data.payload);

      } else {
        console.error('❌ 가챠 구매 실패:', data);
        setIsSpinning(false);
        setIsLocked(false);

        // 다이아몬드 부족 에러인지 확인
        const errorMessage = data.payload || data.error || '';
        if (errorMessage.includes('다이아몬드가 부족합니다')) {
          setShowInsufficientModal(true);
        } else {
          alert(errorMessage || '가챠 구매에 실패했습니다.');
        }
      }
    } catch (error) {
      console.error('❌ 가챠 구매 중 오류:', error);
      setIsSpinning(false);
      setIsLocked(false);
      alert('가챠 구매 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 룰렛 회전 완료 콜백
  const handleSpinComplete = (serverResponse?: GachaResult) => {
    setIsSpinning(false);
    setIsLocked(false);
    // 회전 완료 후 결과 표시 (서버 응답을 직접 받음)
    if (serverResponse) {
      setResult(serverResponse);
    }
  };

  const handleClose = () => {
    // 헤더 잔액 갱신 (확인 버튼 클릭 시)
    (window as unknown as { updateCurrencyBalance?: () => void }).updateCurrencyBalance?.();
    setResult(null);
    setIsLocked(false);
    onClose();
  };

  const handlePlayAgain = () => {
    // 헤더 잔액 갱신 (다시 구매 클릭 시)
    (window as unknown as { updateCurrencyBalance?: () => void }).updateCurrencyBalance?.();
    setResult(null);
    setIsLocked(false);
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
      <DialogContent className="max-w-4xl bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-white">
            {result ? '🎉 Congratulations!' : '🎰 Diamond Roulette'}
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-6">
            {/* 룰렛 휠 */}
            <div className="flex justify-center">
              <RouletteWheel
                ref={rouletteRef}
                rewards={rewards}
                colors={colors}
                onSpinComplete={handleSpinComplete}
              />
            </div>

            {/* 구매 정보 */}
            <div className="text-center space-y-2">
              <p className="text-slate-400">Win between 500 and 10,000 Diamonds randomly.</p>
              <div className="flex justify-center items-center gap-2">
                <span className="text-2xl">💎</span>
                <span className="text-xl font-bold text-white">{gachaItem.price.toLocaleString()}</span>
                <span className="text-slate-400">Diamonds</span>
              </div>
            </div>

            {/* 구매 버튼 */}
            <div className="flex justify-center">
              <Button
                onClick={handlePurchase}
                disabled={isProcessing || isLocked}
                className="px-8 py-3 text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30"
              >
                {isProcessing ? (
                  isSpinning ? 'Spinning...' : 'Processing...'
                ) : (
                  isLocked ? 'Completed' : 'Spin Roulette'
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
                {result.earnedDiamonds.toLocaleString()} Diamonds
              </div>
              <div className="text-xl text-slate-400 mb-4">
                Earned!
              </div>
            </div>

            {/* 보유 다이아몬드 */}
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="text-lg font-semibold mb-2 text-slate-300">💎 Current Balance</div>
              <div className="text-2xl font-bold text-blue-400">
                {result.finalBalance.diamond.toLocaleString()}
              </div>
            </div>

            {/* 버튼들 */}
            <div className="flex gap-4 justify-center">
              <Button
                onClick={handleClose}
                variant="outline"
                className="px-6 border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                Close
              </Button>
              <Button
                onClick={handlePlayAgain}
                className="px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                Spin Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      {/* 다이아몬드 부족 모달 */}
      <Dialog open={showInsufficientModal} onOpenChange={setShowInsufficientModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
              <AlertCircle className="w-6 h-6" />
              다이아몬드 부족
            </DialogTitle>
          </DialogHeader>

          <div className="text-center space-y-4 py-4">
            <div className="flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>

            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-800">
                다이아몬드가 부족합니다
              </p>
              <p className="text-gray-600">
                가챠를 구매하려면 <span className="font-bold text-blue-600">{gachaItem.price.toLocaleString()} 다이아몬드</span>가 필요합니다.
              </p>
            </div>

            <div className="bg-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <Gem className="w-5 h-5" />
                <span className="text-sm">게임을 플레이하여 다이아몬드를 획득하세요!</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={() => setShowInsufficientModal(false)}
              className="px-8 py-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold"
            >
              확인
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
