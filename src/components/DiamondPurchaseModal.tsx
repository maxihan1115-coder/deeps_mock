'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Gem, Check, Loader2, Sparkles } from 'lucide-react';

interface DiamondPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameUuid: number;
  onPurchaseSuccess?: () => void;
}

interface DiamondPackage {
  amount: number;
  price: number; // 실제 가격 (표시용)
  bonus?: number; // 보너스 다이아 (선택사항)
}

const DIAMOND_PACKAGES: DiamondPackage[] = [
  { amount: 100, price: 1000 },
  { amount: 500, price: 4500 },
  { amount: 1000, price: 8000 },
  { amount: 2000, price: 15000 },
];

export default function DiamondPurchaseModal({ 
  isOpen, 
  onClose, 
  gameUuid,
  onPurchaseSuccess 
}: DiamondPurchaseModalProps) {
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [purchasedAmount, setPurchasedAmount] = useState(0);

  // 성공 모달 상태 변화 디버깅
  useEffect(() => {
    console.log('📊 showSuccessModal 상태 변화:', showSuccessModal);
  }, [showSuccessModal]);

  const handlePurchase = async (packageData: DiamondPackage) => {
    setPurchasing(packageData.amount);
    
    try {
      const response = await fetch('/api/currency/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameUuid,
          type: 'DIAMOND',
          amount: packageData.amount,
          reason: `다이아몬드 ${packageData.amount}개 구매`,
          price: packageData.price
        })
      });

      if (response.ok) {
        setPurchaseSuccess(packageData.amount);
        setPurchasedAmount(packageData.amount);
        
        // 성공 모달 먼저 표시
        console.log('🎉 구매 성공! 성공 모달 표시 중...');
        setShowSuccessModal(true);
        
        // 2초 후 성공 상태 초기화
        setTimeout(() => {
          setPurchaseSuccess(null);
        }, 2000);
      } else {
        console.error('다이아몬드 구매 실패:', response.status);
        alert('구매에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('다이아몬드 구매 중 오류:', error);
      alert('구매 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setPurchasing(null);
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString() + '원';
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
              <Gem className="w-6 h-6" />
              다이아몬드 구매
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            {DIAMOND_PACKAGES.map((packageData) => (
              <Card key={packageData.amount} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Gem className="w-5 h-5 text-blue-500" />
                        <span className="font-semibold text-lg">
                          {packageData.amount.toLocaleString()} Diamond
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatPrice(packageData.price)}
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handlePurchase(packageData)}
                      disabled={purchasing === packageData.amount}
                      className={`min-w-[80px] ${
                        purchaseSuccess === packageData.amount
                          ? 'bg-green-500 hover:bg-green-600'
                          : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                      }`}
                    >
                      {purchasing === packageData.amount ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : purchaseSuccess === packageData.amount ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        '구매'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center text-sm text-gray-500 pt-2">
            <p>💎 실제 결제는 되지 않으며, 다이아몬드만 획득됩니다</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* 구매 성공 모달 */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md z-50">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6" />
              구매 완료!
            </DialogTitle>
          </DialogHeader>
          
          <div className="text-center space-y-4 py-4">
            <div className="flex items-center justify-center gap-3">
              <Gem className="w-8 h-8 text-blue-500" />
              <span className="text-3xl font-bold text-blue-600">
                {purchasedAmount.toLocaleString()}
              </span>
              <span className="text-lg font-semibold text-gray-700">Diamond</span>
            </div>
            
            <p className="text-lg text-gray-600">
              다이아몬드를 성공적으로 구매했습니다!
            </p>
            
            <p className="text-sm text-gray-500">
              이제 다양한 아이템을 구매하거나 게임을 더욱 즐기실 수 있습니다.
            </p>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                onClose(); // 구매 모달도 함께 닫기
                
                // 잔액 업데이트 (확인 버튼 클릭 시에만)
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
    </>
  );
}
