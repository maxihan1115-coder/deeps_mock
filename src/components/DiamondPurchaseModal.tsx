'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Gem, Check, Loader2, Sparkles, Wallet, CreditCard } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DiamondPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameUuid: number;
  onPurchaseSuccess?: () => void;
}

interface DiamondPackage {
  amount: number;
  priceKRW: number; // 원화 가격
  priceUSDC: string; // USDC 가격
  bonus?: number;
}

// 다이아몬드 패키지 (원화 및 USDC 가격 포함)
const DIAMOND_PACKAGES: DiamondPackage[] = [
  { amount: 100, priceKRW: 1000, priceUSDC: '1.00' },
  { amount: 500, priceKRW: 4500, priceUSDC: '4.50', bonus: 50 },
  { amount: 1000, priceKRW: 8000, priceUSDC: '8.00', bonus: 100 },
  { amount: 2000, priceKRW: 15000, priceUSDC: '15.00', bonus: 200 },
];

export default function DiamondPurchaseModal({
  isOpen,
  onClose,
  gameUuid,
  onPurchaseSuccess
}: DiamondPurchaseModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'fiat' | 'usdc'>('fiat');
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [purchasedAmount, setPurchasedAmount] = useState(0);
  const [usdcBalance, setUsdcBalance] = useState<string>('0');
  const [loadingBalance, setLoadingBalance] = useState(false);

  // USDC 잔액 조회
  useEffect(() => {
    if (isOpen && paymentMethod === 'usdc') {
      fetchUSDCBalance();
    }
  }, [isOpen, paymentMethod, gameUuid]);

  const fetchUSDCBalance = async () => {
    setLoadingBalance(true);
    try {
      const response = await fetch(`/api/circle/balance?gameUuid=${gameUuid}`);
      const data = await response.json();

      if (data.success) {
        setUsdcBalance(data.payload.usdc);
      }
    } catch (error) {
      console.error('USDC 잔액 조회 실패:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  // 일반 결제 (기존 방식)
  const handleFiatPurchase = async (packageData: DiamondPackage) => {
    setPurchasing(packageData.amount);

    try {
      const response = await fetch('/api/currency/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameUuid,
          amount: packageData.amount,
          price: packageData.priceKRW,
          type: 'DIAMOND',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPurchaseSuccess(packageData.amount);
        setPurchasedAmount(packageData.amount + (packageData.bonus || 0));
        setShowSuccessModal(true);

        if (onPurchaseSuccess) {
          onPurchaseSuccess();
        }
      } else {
        alert(`구매 실패: ${data.payload || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert('구매 중 오류가 발생했습니다.');
    } finally {
      setPurchasing(null);
    }
  };

  // USDC 결제
  const handleUSDCPurchase = async (packageData: DiamondPackage) => {
    setPurchasing(packageData.amount);

    try {
      // 잔액 확인
      const balanceNum = parseFloat(usdcBalance);
      const requiredAmount = parseFloat(packageData.priceUSDC);

      if (balanceNum < requiredAmount) {
        alert(`USDC 잔액이 부족합니다.\n현재: ${usdcBalance} USDC\n필요: ${packageData.priceUSDC} USDC`);
        setPurchasing(null);
        return;
      }

      const response = await fetch('/api/circle/payment/diamond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameUuid,
          diamondAmount: packageData.amount + (packageData.bonus || 0),
          usdcAmount: packageData.priceUSDC,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPurchaseSuccess(packageData.amount);
        setPurchasedAmount(packageData.amount + (packageData.bonus || 0));
        setShowSuccessModal(true);

        // 잔액 새로고침
        await fetchUSDCBalance();

        if (onPurchaseSuccess) {
          onPurchaseSuccess();
        }
      } else {
        alert(`구매 실패: ${data.payload || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('USDC Purchase error:', error);
      alert('구매 중 오류가 발생했습니다.');
    } finally {
      setPurchasing(null);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setPurchaseSuccess(null);
    onClose();
  };

  return (
    <>
      {/* 구매 모달 */}
      <Dialog open={isOpen && !showSuccessModal} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Gem className="w-6 h-6 text-purple-500" />
              다이아몬드 구매
            </DialogTitle>
          </DialogHeader>

          <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'fiat' | 'usdc')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="fiat" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                일반 결제
              </TabsTrigger>
              <TabsTrigger value="usdc" className="flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                USDC 결제
              </TabsTrigger>
            </TabsList>

            {/* USDC 잔액 표시 */}
            {paymentMethod === 'usdc' && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">USDC 잔액</span>
                  </div>
                  {loadingBalance ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span className="text-xl font-bold text-blue-600">
                      {parseFloat(usdcBalance).toFixed(2)} USDC
                    </span>
                  )}
                </div>
              </div>
            )}

            <TabsContent value="fiat" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DIAMOND_PACKAGES.map((pkg) => (
                  <PackageCard
                    key={pkg.amount}
                    package={pkg}
                    paymentMethod="fiat"
                    purchasing={purchasing}
                    purchaseSuccess={purchaseSuccess}
                    onPurchase={handleFiatPurchase}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="usdc" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DIAMOND_PACKAGES.map((pkg) => (
                  <PackageCard
                    key={pkg.amount}
                    package={pkg}
                    paymentMethod="usdc"
                    purchasing={purchasing}
                    purchaseSuccess={purchaseSuccess}
                    onPurchase={handleUSDCPurchase}
                    usdcBalance={usdcBalance}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* 구매 성공 모달 */}
      <Dialog open={showSuccessModal} onOpenChange={handleCloseSuccessModal}>
        <DialogContent className="max-w-md">
          <div className="text-center space-y-6 py-6">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Check className="w-10 h-10 text-green-600" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold">구매 완료!</h3>
              <p className="text-lg flex items-center justify-center gap-2">
                <Gem className="w-5 h-5 text-purple-500" />
                <span className="font-bold text-purple-600">
                  {purchasedAmount.toLocaleString()}
                </span>
                <span>다이아몬드를 획득했습니다!</span>
              </p>
            </div>

            <Button
              onClick={handleCloseSuccessModal}
              className="w-full"
            >
              확인
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// 패키지 카드 컴포넌트
interface PackageCardProps {
  package: DiamondPackage;
  paymentMethod: 'fiat' | 'usdc';
  purchasing: number | null;
  purchaseSuccess: number | null;
  onPurchase: (pkg: DiamondPackage) => void;
  usdcBalance?: string;
}

function PackageCard({
  package: pkg,
  paymentMethod,
  purchasing,
  purchaseSuccess,
  onPurchase,
  usdcBalance = '0'
}: PackageCardProps) {
  const isPurchasing = purchasing === pkg.amount;
  const isSuccess = purchaseSuccess === pkg.amount;
  const totalAmount = pkg.amount + (pkg.bonus || 0);

  // USDC 잔액 부족 체크
  const isInsufficientBalance = paymentMethod === 'usdc' && parseFloat(usdcBalance) < parseFloat(pkg.priceUSDC);

  return (
    <Card className={`relative overflow-hidden transition-all hover:shadow-lg ${isSuccess ? 'ring-2 ring-green-500' : ''
      } ${isInsufficientBalance ? 'opacity-50' : ''}`}>
      {pkg.bonus && (
        <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          +{pkg.bonus} 보너스
        </div>
      )}

      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Gem className="w-8 h-8 text-purple-500" />
            <div>
              <div className="text-2xl font-bold">
                {totalAmount.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">다이아몬드</div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="text-2xl font-bold text-purple-600">
              {paymentMethod === 'fiat' ? (
                `₩${pkg.priceKRW.toLocaleString()}`
              ) : (
                `${pkg.priceUSDC} USDC`
              )}
            </div>
          </div>

          <Button
            onClick={() => onPurchase(pkg)}
            disabled={isPurchasing || isSuccess || isInsufficientBalance}
            className="w-full"
            variant={isSuccess ? 'outline' : 'default'}
          >
            {isPurchasing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                처리중...
              </>
            ) : isSuccess ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                구매 완료
              </>
            ) : isInsufficientBalance ? (
              '잔액 부족'
            ) : (
              '구매하기'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
