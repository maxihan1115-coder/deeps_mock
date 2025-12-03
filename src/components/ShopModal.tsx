'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Coins, Gem, ShoppingBag, Loader2, Sparkles, AlertCircle, History } from 'lucide-react';
import GachaRouletteModal from './GachaRouletteModal';
import GachaHistoryModal from './GachaHistoryModal';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameUuid: number;
  onPurchaseSuccess?: () => void;
}

interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: 'GOLD' | 'DIAMOND';
  isGacha: boolean;
  gachaRewards?: Array<{ diamonds: number, probability: number }>;
}

interface PurchaseResult {
  item: {
    id: string;
    name: string;
    price: number;
    currency: 'GOLD' | 'DIAMOND';
  };
  remainingBalance: {
    gold: number;
    diamond: number;
  };
}

export default function ShopModal({
  isOpen,
  onClose,
  gameUuid,
  onPurchaseSuccess
}: ShopModalProps) {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [purchasedItem, setPurchasedItem] = useState<PurchaseResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showGachaModal, setShowGachaModal] = useState(false);
  const [selectedGachaItem, setSelectedGachaItem] = useState<ShopItem | null>(null);
  const [showGachaHistory, setShowGachaHistory] = useState(false);

  // 상점 아이템 목록 조회
  const fetchItems = async () => {
    try {
      const response = await fetch('/api/shop/items');
      const data = await response.json();
      if (data.success) {
        // 가챠 아이템을 항상 최상단으로 정렬
        const sorted: ShopItem[] = [...data.payload].sort((a: ShopItem, b: ShopItem) => {
          if (a.isGacha === b.isGacha) return 0;
          return a.isGacha ? -1 : 1;
        });
        setItems(sorted);
      } else {
        console.error('상점 아이템 조회 실패:', data.error);
      }
    } catch (error) {
      console.error('상점 아이템 조회 중 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchItems();
    }
  }, [isOpen]);

  // 아이템 구매
  const handlePurchase = async (item: ShopItem) => {
    setPurchasing(item.id);

    try {
      const response = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: gameUuid,
          itemId: item.id
        })
      });

      console.log('🛒 구매 API 응답:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 구매 성공 응답:', result);
        setPurchasedItem(result.payload);
        setShowSuccessModal(true);
      } else {
        const errorData = await response.json();
        console.log('❌ 구매 실패 응답:', errorData);
        setErrorMessage(errorData.error?.message || '구매에 실패했습니다. 다시 시도해주세요.');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('아이템 구매 중 오류:', error);
      setErrorMessage('구매 중 오류가 발생했습니다. 다시 시도해주세요.');
      setShowErrorModal(true);
    } finally {
      setPurchasing(null);
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString();
  };

  const getCurrencyIcon = (currency: string) => {
    return currency === 'GOLD' ? <Coins className="w-4 h-4" /> : <Gem className="w-4 h-4" />;
  };



  const handleGachaPurchase = (item: ShopItem) => {
    setSelectedGachaItem(item);
    setShowGachaModal(true);
  };

  const handleGachaSuccess = () => {
    setShowGachaModal(false);
    setSelectedGachaItem(null);
    onPurchaseSuccess?.();
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              Item Shop
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading items...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-800">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-slate-400" />
                Item Shop
              </DialogTitle>
              <Button
                onClick={() => setShowGachaHistory(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <History className="w-4 h-4" />
                History
              </Button>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 mt-4">
            {items.map((item) => (
              <Card key={item.id} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg text-white">{item.name}</h3>
                      {item.description && (
                        <p className="text-sm text-slate-400 mt-1">{item.description}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-200">
                        {getCurrencyIcon(item.currency)}
                        <span className="font-bold text-lg">
                          {formatPrice(item.price)}
                        </span>
                      </div>

                      <Button
                        onClick={() => item.isGacha ? handleGachaPurchase(item) : handlePurchase(item)}
                        disabled={purchasing === item.id}
                        variant="outline"
                        className="min-w-[80px] border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        {purchasing === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          item.isGacha ? 'Gacha' : 'Buy'
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {items.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-slate-700" />
              <p>No items available.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 구매 성공 모달 */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-green-600" />
              Purchase Successful!
            </DialogTitle>
          </DialogHeader>

          {purchasedItem && purchasedItem.item && (
            <div className="text-center space-y-4 py-4">
              <div className="flex items-center justify-center gap-3">
                {getCurrencyIcon(purchasedItem.item.currency)}
                <span className="text-2xl font-bold text-white">
                  {purchasedItem.item.name}
                </span>
              </div>

              <p className="text-lg text-slate-300">
                Purchase completed successfully!
              </p>

              <div className="bg-slate-800 rounded-lg p-4 space-y-2">
                <p className="text-sm text-slate-400">Cost</p>
                <div className="flex items-center justify-center gap-2 text-slate-200">
                  {getCurrencyIcon(purchasedItem.item.currency)}
                  <span className="font-bold">
                    {formatPrice(purchasedItem.item.price)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                onClose();

                // 잔액 업데이트
                if (onPurchaseSuccess) {
                  onPurchaseSuccess();
                }
              }}
              className="px-8 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold"
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 에러 모달 */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
              <AlertCircle className="w-6 h-6 text-red-600" />
              Purchase Failed
            </DialogTitle>
          </DialogHeader>

          <div className="text-center space-y-4 py-4">
            <div className="flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>

            <p className="text-lg text-slate-300">
              {errorMessage}
            </p>

            <p className="text-sm text-slate-500">
              If you lack currency, play the game to earn Gold or purchase Diamonds.
            </p>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={() => setShowErrorModal(false)}
              className="px-8 py-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold"
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 가챠 룰렛 모달 */}
      {selectedGachaItem && (
        <GachaRouletteModal
          isOpen={showGachaModal}
          onClose={() => {
            setShowGachaModal(false);
            setSelectedGachaItem(null);
          }}
          gameUuid={gameUuid}
          gachaItem={{
            id: selectedGachaItem.id,
            name: selectedGachaItem.name,
            description: selectedGachaItem.description || '',
            price: selectedGachaItem.price,
            gachaRewards: selectedGachaItem.gachaRewards || []
          }}
          onPurchaseSuccess={handleGachaSuccess}
        />
      )}

      {/* 가챠 내역 모달 */}
      <GachaHistoryModal
        isOpen={showGachaHistory}
        onClose={() => setShowGachaHistory(false)}
        gameUuid={gameUuid}
      />
    </>
  );
}
