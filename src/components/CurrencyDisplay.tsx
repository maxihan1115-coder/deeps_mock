'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Coins, Gem } from 'lucide-react';
import DiamondPurchaseModal from '@/components/DiamondPurchaseModal';

interface CurrencyDisplayProps {
  gameUuid: number;
}

interface CurrencyBalance {
  gold: number;
  diamond: number;
}

export default function CurrencyDisplay({ gameUuid }: CurrencyDisplayProps) {
  const [balance, setBalance] = useState<CurrencyBalance>({ gold: 0, diamond: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const fetchBalance = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/currency/balance?gameUuid=${gameUuid}`);
      const data = await response.json();
      
      if (data.success) {
        setBalance(data.payload);
      }
    } catch (error) {
      console.error('재화 잔액 조회 오류:', error);
    } finally {
      setIsLoading(false);
    }
  }, [gameUuid]);

  useEffect(() => {
    if (gameUuid) {
      fetchBalance();
    }
  }, [gameUuid, fetchBalance]);

  // 재화 잔액 업데이트를 위한 함수 (외부에서 호출 가능)
  const updateBalance = useCallback(() => {
    fetchBalance();
  }, [fetchBalance]);

  // 다이아몬드 구매 성공 시 잔액 업데이트
  const handlePurchaseSuccess = useCallback(() => {
    fetchBalance();
  }, [fetchBalance]);

  // 전역 함수로 등록 (게임 종료 시 호출용)
  React.useEffect(() => {
    (window as unknown as { updateCurrencyBalance?: () => void }).updateCurrencyBalance = updateBalance;
    return () => {
      delete (window as unknown as { updateCurrencyBalance?: () => void }).updateCurrencyBalance;
    };
  }, [updateBalance]);

  if (isLoading) {
    return (
      <div className="flex gap-2">
        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 rounded-md">
          <Coins className="w-4 h-4 text-yellow-600" />
          <span className="text-sm font-medium text-yellow-700">-</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-md">
          <Gem className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-700">-</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {/* 골드 */}
      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 rounded-md border border-yellow-200">
        <Coins className="w-4 h-4 text-yellow-600" />
        <span className="text-sm font-medium text-yellow-700">
          {balance.gold.toLocaleString()}
        </span>
      </div>

      {/* 다이아 (클릭 가능) */}
      <div 
        className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-md border border-blue-200 cursor-pointer hover:bg-blue-200 transition-colors"
        onClick={() => setShowPurchaseModal(true)}
        title="다이아몬드 구매"
      >
        <Gem className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-700">
          {balance.diamond.toLocaleString()}
        </span>
      </div>

      {/* 다이아몬드 구매 모달 */}
      <DiamondPurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        gameUuid={gameUuid}
        onPurchaseSuccess={handlePurchaseSuccess}
      />
    </div>
  );
}
