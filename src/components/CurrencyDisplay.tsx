'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Coins, Gem } from 'lucide-react';
import DiamondPurchaseModal from '@/components/DiamondPurchaseModal';
import GoldPurchaseModal from '@/components/GoldPurchaseModal';

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
  const [showDiamondPurchaseModal, setShowDiamondPurchaseModal] = useState(false);
  const [showGoldPurchaseModal, setShowGoldPurchaseModal] = useState(false);

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
    (window as unknown as { adjustCurrencyBalance?: (delta: { gold?: number; diamond?: number }) => void }).adjustCurrencyBalance = (delta) => {
      setBalance((prev) => ({
        gold: Math.max(0, prev.gold + (delta.gold ?? 0)),
        diamond: Math.max(0, prev.diamond + (delta.diamond ?? 0)),
      }));
    };
    return () => {
      delete (window as unknown as { updateCurrencyBalance?: () => void }).updateCurrencyBalance;
      delete (window as unknown as { adjustCurrencyBalance?: (delta: { gold?: number; diamond?: number }) => void }).adjustCurrencyBalance;
    };
  }, [updateBalance]);

  return (
    <>
      {isLoading ? (
        <div className="flex gap-1 sm:gap-2">
          <div className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-gray-100 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
            <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 dark:text-gray-500" />
            <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">-</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-gray-100 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
            <Gem className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 dark:text-gray-500" />
            <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">-</span>
          </div>
        </div>
      ) : (
        <div className="flex gap-1 sm:gap-2">
          {/* 골드 (클릭 가능) */}
          <div
            className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={() => setShowGoldPurchaseModal(true)}
            title="Buy Gold"
          >
            <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
              {balance.gold.toLocaleString()}
            </span>
          </div>

          {/* 다이아 (클릭 가능) */}
          <div
            className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={() => setShowDiamondPurchaseModal(true)}
            title="Buy Diamonds"
          >
            <Gem className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
              {balance.diamond.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* 골드 구매 모달 */}
      <GoldPurchaseModal
        isOpen={showGoldPurchaseModal}
        onClose={() => setShowGoldPurchaseModal(false)}
        gameUuid={gameUuid}
        onPurchaseSuccess={handlePurchaseSuccess}
      />

      {/* 다이아몬드 구매 모달 */}
      <DiamondPurchaseModal
        isOpen={showDiamondPurchaseModal}
        onClose={() => setShowDiamondPurchaseModal(false)}
        gameUuid={gameUuid}
        onPurchaseSuccess={handlePurchaseSuccess}
      />
    </>
  );
}
