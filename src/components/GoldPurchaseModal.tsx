'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, AlertCircle, Check, Loader2 } from 'lucide-react';

interface GoldPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameUuid: number;
  onPurchaseSuccess?: () => void;
}

interface GoldItem {
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
    currency: string;
  };
  remainingBalance: {
    gold: number;
    diamond: number;
  };
}

export default function GoldPurchaseModal({
  isOpen,
  onClose,
  gameUuid,
  onPurchaseSuccess
}: GoldPurchaseModalProps) {
  const [items, setItems] = useState<GoldItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [purchasedItem, setPurchasedItem] = useState<PurchaseResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // 골드 구매 아이템 목록 조회
  const fetchItems = async () => {
    try {
      const response = await fetch('/api/gold-purchase/items');
      const data = await response.json();
      if (data.success) {
        setItems(data.payload);
      } else {
        console.error('골드 구매 아이템 조회 실패:', data.error);
      }
    } catch (error) {
      console.error('골드 구매 아이템 조회 중 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchItems();
    }
  }, [isOpen]);

  // 골드 구매
  const handlePurchase = async (item: GoldItem) => {
    setPurchasing(item.id);
    try {
      const response = await fetch('/api/gold-purchase/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameUuid,
          itemId: item.id
        })
      });

      const data = await response.json();

      if (data.success) {
        // 상태를 동시에 업데이트
        setPurchasedItem(data.payload);
        setPurchaseSuccess(item.id);

        // 성공 모달 표시
        setShowSuccessModal(true);

        // 2초 후 성공 상태 초기화
        setTimeout(() => {
          setPurchaseSuccess(null);
        }, 2000);
      } else {
        setErrorMessage(data.error || '골드 구매에 실패했습니다.');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('골드 구매 중 오류:', error);
      setErrorMessage('골드 구매 중 오류가 발생했습니다.');
      setShowErrorModal(true);
    } finally {
      setPurchasing(null);
    }
  };

  const handleClose = () => {
    setShowSuccessModal(false);
    setShowErrorModal(false);
    setPurchasedItem(null);
    setErrorMessage('');
    onClose();
  };

  const getGoldAmount = (name: string) => {
    return parseInt(name.split(' ')[0]);
  };

  const getPricePerGold = (price: number, goldAmount: number) => {
    return (price / goldAmount).toFixed(2);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-xl bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
              <Coins className="w-6 h-6 text-slate-400" />
              Gold Shop
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading gold items...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                No gold items available.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const goldAmount = getGoldAmount(item.name);
                  const pricePerGold = getPricePerGold(item.price, goldAmount);

                  return (
                    <div key={item.id} className="border border-slate-700 rounded-lg p-4 bg-slate-800/50 hover:bg-slate-800 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg text-white">{item.name}</h3>
                            <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                              {pricePerGold} per gold
                            </Badge>
                          </div>
                          {item.description && (
                            <p className="text-sm text-slate-400 mb-2">{item.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-slate-300 font-medium">
                              +{goldAmount.toLocaleString()} Gold
                            </span>
                            <span className="text-slate-300 font-medium">
                              -{item.price.toLocaleString()} Diamond
                            </span>
                          </div>
                        </div>
                        <Button
                          onClick={() => handlePurchase(item)}
                          disabled={purchasing === item.id}
                          variant={purchaseSuccess === item.id ? "outline" : "default"}
                          className="ml-4 min-w-[80px]"
                        >
                          {purchasing === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : purchaseSuccess === item.id ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            'Buy'
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 구매 성공 모달 */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md z-50 bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-white flex items-center justify-center gap-2">
              <Check className="w-5 h-5 text-slate-400" />
              Purchase Complete
            </DialogTitle>
          </DialogHeader>

          <div className="text-center space-y-4 py-4">
            {purchasedItem && (
              <>
                <div className="flex items-center justify-center gap-3">
                  <Coins className="w-8 h-8 text-yellow-500" />
                  <span className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                    {getGoldAmount(purchasedItem.item.name).toLocaleString()}
                  </span>
                  <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">Gold</span>
                </div>

                <p className="text-lg text-slate-300">
                  Successfully purchased Gold!
                </p>

                <p className="text-sm text-slate-500">
                  Used {purchasedItem.item.price.toLocaleString()} Diamonds.
                </p>

                <div className="bg-slate-800 rounded-lg p-4">
                  <h4 className="font-medium mb-2 text-slate-300">Current Balance</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-400 font-medium">
                      Gold: {purchasedItem.remainingBalance.gold.toLocaleString()}
                    </span>
                    <span className="text-blue-400 font-medium">
                      Diamond: {purchasedItem.remainingBalance.diamond.toLocaleString()}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-center">
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                setPurchasedItem(null);
                setPurchaseSuccess(null);
                onClose(); // 구매 모달도 함께 닫기

                // 잔액 업데이트 (확인 버튼 클릭 시에만)
                if (onPurchaseSuccess) {
                  onPurchaseSuccess();
                }
              }}
              className="px-8 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-semibold"
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 구매 실패 모달 */}
      <Dialog open={showErrorModal} onOpenChange={() => setShowErrorModal(false)}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-slate-400" />
              Purchase Failed
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-center text-slate-400">
              {errorMessage}
            </p>
            <Button onClick={() => setShowErrorModal(false)} className="w-full">
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
