'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, CheckCircle, AlertCircle, Sparkles, Check, Loader2 } from 'lucide-react';

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
  gachaRewards?: Array<{diamonds: number, probability: number}>;
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-500" />
              골드 구매
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">골드 구매 아이템을 불러오는 중...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                골드 구매 아이템이 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const goldAmount = getGoldAmount(item.name);
                  const pricePerGold = getPricePerGold(item.price, goldAmount);
                  
                  return (
                    <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{item.name}</h3>
                            <Badge variant="secondary" className="text-xs">
                              {pricePerGold} 다이아/골드
                            </Badge>
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-yellow-600 font-medium">
                              +{goldAmount.toLocaleString()} 골드
                            </span>
                            <span className="text-blue-600 font-medium">
                              -{item.price.toLocaleString()} 다이아
                            </span>
                          </div>
                        </div>
                        <Button
                          onClick={() => handlePurchase(item)}
                          disabled={purchasing === item.id}
                          className={`ml-4 min-w-[80px] ${
                            purchaseSuccess === item.id
                              ? 'bg-green-500 hover:bg-green-600'
                              : 'bg-yellow-500 hover:bg-yellow-600'
                          } text-white`}
                        >
                          {purchasing === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : purchaseSuccess === item.id ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            '구매'
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
        <DialogContent className="sm:max-w-md z-50">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-yellow-600 via-amber-600 to-orange-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6" />
              구매 완료!
            </DialogTitle>
          </DialogHeader>
          
          <div className="text-center space-y-4 py-4">
            {purchasedItem && (
              <>
                <div className="flex items-center justify-center gap-3">
                  <Coins className="w-8 h-8 text-yellow-500" />
                  <span className="text-3xl font-bold text-yellow-600">
                    {getGoldAmount(purchasedItem.item.name).toLocaleString()}
                  </span>
                  <span className="text-lg font-semibold text-gray-700">골드</span>
                </div>
                
                <p className="text-lg text-gray-600">
                  골드를 성공적으로 구매했습니다!
                </p>
                
                <p className="text-sm text-gray-500">
                  {purchasedItem.item.price.toLocaleString()} 다이아를 사용했습니다.
                </p>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2 text-gray-700">현재 잔액</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-600 font-medium">
                      골드: {purchasedItem.remainingBalance.gold.toLocaleString()}
                    </span>
                    <span className="text-blue-600 font-medium">
                      다이아: {purchasedItem.remainingBalance.diamond.toLocaleString()}
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
                  확인
                </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 구매 실패 모달 */}
      <Dialog open={showErrorModal} onOpenChange={() => setShowErrorModal(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              구매 실패
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-center text-gray-600">
              {errorMessage}
            </p>
            <Button onClick={() => setShowErrorModal(false)} className="w-full">
              확인
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
