'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Coins, Gem, ShoppingBag, Loader2, Sparkles, AlertCircle } from 'lucide-react';

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

  // 상점 아이템 목록 조회
  const fetchItems = async () => {
    try {
      const response = await fetch('/api/shop/items');
      const data = await response.json();
      if (data.success) {
        setItems(data.payload);
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

  const getCurrencyColor = (currency: string) => {
    return currency === 'GOLD' ? 'text-yellow-600' : 'text-blue-600';
  };

  const getCardBorderColor = (currency: string) => {
    return currency === 'GOLD' ? 'border-yellow-200' : 'border-blue-200';
  };

  const getCardBgColor = (currency: string) => {
    return currency === 'GOLD' ? 'bg-yellow-50' : 'bg-blue-50';
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
              <ShoppingBag className="w-6 h-6" />
              상점
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            <span className="ml-2 text-gray-500">상점 아이템을 불러오는 중...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
              <ShoppingBag className="w-6 h-6" />
              상점
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {items.map((item) => (
              <Card key={item.id} className={`${getCardBgColor(item.currency)} ${getCardBorderColor(item.currency)}`}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center gap-2 ${getCurrencyColor(item.currency)}`}>
                        {getCurrencyIcon(item.currency)}
                        <span className="font-bold text-lg">
                          {formatPrice(item.price)}
                        </span>
                      </div>
                      
                      <Button
                        onClick={() => handlePurchase(item)}
                        disabled={purchasing === item.id}
                        className={`min-w-[80px] ${
                          item.currency === 'GOLD'
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700'
                            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                        }`}
                      >
                        {purchasing === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          '구매'
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {items.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>현재 판매 중인 아이템이 없습니다.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 구매 성공 모달 */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6" />
              구매 완료!
            </DialogTitle>
          </DialogHeader>
          
          {purchasedItem && purchasedItem.item && (
            <div className="text-center space-y-4 py-4">
              <div className="flex items-center justify-center gap-3">
                {getCurrencyIcon(purchasedItem.item.currency)}
                <span className="text-2xl font-bold">
                  {purchasedItem.item.name}
                </span>
              </div>
              
              <p className="text-lg text-gray-600">
                구매가 완료되었습니다!
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-gray-500">사용한 재화</p>
                <div className={`flex items-center justify-center gap-2 ${getCurrencyColor(purchasedItem.item.currency)}`}>
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
              확인
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 에러 모달 */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
              <AlertCircle className="w-6 h-6" />
              구매 실패
            </DialogTitle>
          </DialogHeader>
          
          <div className="text-center space-y-4 py-4">
            <div className="flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            
            <p className="text-lg text-gray-700">
              {errorMessage}
            </p>
            
            <p className="text-sm text-gray-500">
              재화가 부족한 경우 게임을 플레이하여 골드를 획득하거나, 다이아몬드를 구매해주세요.
            </p>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={() => setShowErrorModal(false)}
              className="px-8 py-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold"
            >
              확인
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
