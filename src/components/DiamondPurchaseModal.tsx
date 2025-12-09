'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Gem, Check, Loader2, Sparkles, Wallet, CreditCard, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWriteContract, usePublicClient, useAccount, useSwitchChain, useChainId, useDisconnect } from 'wagmi';
import { parseUnits } from 'viem';
import { useModal } from 'connectkit';
import {
  USDC_ADDRESS,
  DIAMOND_PURCHASE_ADDRESS,
  ERC20_ABI,
  DIAMOND_PURCHASE_ABI
} from '@/lib/blockchain/abis';

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
  { amount: 100, priceKRW: 1000, priceUSDC: '0.01' },
  { amount: 500, priceKRW: 4500, priceUSDC: '0.045', bonus: 50 },
  { amount: 1000, priceKRW: 8000, priceUSDC: '0.08', bonus: 100 },
  { amount: 2000, priceKRW: 15000, priceUSDC: '0.15', bonus: 200 },
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
  const [dbWalletAddress, setDbWalletAddress] = useState<string | null>(null);

  // Status Modal State (Loading / Error)
  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    type: 'loading' | 'error';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'loading',
    title: '',
    message: ''
  });

  // USDC 결제 (스마트 컨트랙트) 훅
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const currentChainId = useChainId();
  const { setOpen } = useModal();

  const fetchUSDCBalance = React.useCallback(async () => {
    setLoadingBalance(true);
    try {
      // 1. Circle API 잔액 조회 (캐싱 방지)
      const response = await fetch(`/api/circle/balance?gameUuid=${gameUuid}&t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      const data = await response.json();

      if (data.success) {
        console.log('Fetched USDC Balance (API):', data.payload.usdc);
        setUsdcBalance(data.payload.usdc);
      }

      // 2. 블록체인 직접 조회 (보조 수단)
      if (publicClient && address) {
        const balance = await publicClient.readContract({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address]
        });
        const formattedBalance = (Number(balance) / 1000000).toString();
        console.log('Fetched USDC Balance (Chain):', formattedBalance);
        // API가 실패했거나 0이면 체인 데이터 사용
        if (!data.success || data.payload.usdc === '0') {
          setUsdcBalance(formattedBalance);
        }
      }
    } catch (error) {
      console.error('USDC 잔액 조회 실패:', error);
    } finally {
      setLoadingBalance(false);
    }
  }, [gameUuid, publicClient, address]);

  // USDC 잔액 조회
  useEffect(() => {
    if (isOpen && paymentMethod === 'usdc') {
      fetchUSDCBalance();
    }
  }, [isOpen, paymentMethod, fetchUSDCBalance]);

  // 지갑 연결 상태 동기화 (모달 열릴 때)
  useEffect(() => {
    if (isOpen) {
      const syncWallet = async () => {
        try {
          // 1. 서버에 저장된 지갑 정보 조회
          const res = await fetch(`/api/wallet/connect?gameUuid=${gameUuid}`);
          const data = await res.json();
          const linkedWallets = data.payload || [];

          console.log('Linked Wallets:', linkedWallets);
          console.log('Current Address:', address);
          console.log('Is Connected:', isConnected);

          if (linkedWallets.length > 0) {
            setDbWalletAddress(linkedWallets[0].address);
          } else {
            setDbWalletAddress(null);
          }

          // 2. 연결된 지갑이 있는데 현재 연결이 안되어 있다면?
          if (linkedWallets.length > 0 && !isConnected) {
            console.log('User has linked wallet but not connected. Prompting connection...');
            // UI에서 "Reconnect" 버튼이 보이도록 dbWalletAddress 설정됨
          }
        } catch (e) {
          console.error('Failed to sync wallet:', e);
        }
      };

      syncWallet();
    }
  }, [isOpen, gameUuid, isConnected, address]);

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
          reason: 'CASH_PURCHASE',
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
        setStatusModal({
          isOpen: true,
          type: 'error',
          title: 'Purchase Failed',
          message: `Purchase failed: ${data.payload || 'Unknown error'}`
        });
      }
    } catch (error) {
      console.error('Purchase error:', error);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Purchase Error',
        message: 'An error occurred during purchase.'
      });
    } finally {
      setPurchasing(null);
    }
  };

  const handleCloseSuccessModal = async () => {
    setShowSuccessModal(false);
    setPurchaseSuccess(null);
    setPurchasedAmount(0);

    if (onPurchaseSuccess) {
      onPurchaseSuccess();
    }
    onClose();
  };

  return (
    <>
      {/* 구매 모달 */}
      <Dialog open={isOpen && !showSuccessModal && !statusModal.isOpen} onOpenChange={onClose}>
        <DialogContent
          className="w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-900 border-slate-800 p-4 sm:p-6"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
              <Gem className="w-6 h-6 text-slate-400" />
              Diamond Shop (Fiat)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {DIAMOND_PACKAGES.map((pkg) => (
                <PackageCard
                  key={pkg.amount}
                  package={pkg}
                  paymentMethod="fiat"
                  purchasing={purchasing}
                  purchaseSuccess={purchaseSuccess}
                  onPurchase={handleFiatPurchase}
                  isConnected={true}
                  onConnect={() => { }}
                />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Modal (Loading / Error) */}
      <Dialog open={statusModal.isOpen} onOpenChange={(open) => {
        if (!open && statusModal.type === 'error') {
          setStatusModal(prev => ({ ...prev, isOpen: false }));
        }
      }}>
        <DialogContent
          className="sm:max-w-md bg-slate-900 border-slate-800"
          onInteractOutside={(e) => {
            if (statusModal.type === 'loading') e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (statusModal.type === 'loading') e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className={`text-center text-xl font-bold flex items-center justify-center gap-2 ${statusModal.type === 'error' ? 'text-red-500' : 'text-white'
              }`}>
              {statusModal.type === 'loading' ? (
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-500" />
              )}
              {statusModal.title}
            </DialogTitle>
          </DialogHeader>

          <div className="text-center py-4 space-y-4">
            <p className="text-slate-300 whitespace-pre-line">
              {statusModal.message}
            </p>

            {statusModal.type === 'error' && (
              <Button
                onClick={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white"
              >
                Close
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 구매 성공 모달 */}
      <Dialog open={showSuccessModal} onOpenChange={handleCloseSuccessModal}>
        <DialogContent
          className="max-w-md z-[9999] bg-slate-900 border-slate-800"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-white text-center flex items-center justify-center gap-2">
              <Check className="w-5 h-5 text-slate-400" />
              Purchase Complete
            </DialogTitle>
            <DialogDescription className="text-center text-slate-400">
              Diamond purchase completed successfully.
            </DialogDescription>
          </DialogHeader>

          <div className="text-center space-y-6 py-6">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Check className="w-10 h-10 text-green-600" />
            </div>

            <div className="space-y-2">
              <p className="text-lg flex items-center justify-center gap-2">
                <Gem className="w-5 h-5 text-purple-500" />
                <span className="font-bold text-purple-400">
                  {purchasedAmount.toLocaleString()}
                </span>
                <span className="text-white">Diamonds acquired!</span>
              </p>
            </div>

            <Button
              onClick={handleCloseSuccessModal}
              className="w-full"
            >
              Confirm
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
  isConnected: boolean;
  onConnect: () => void;
}

function PackageCard({
  package: pkg,
  paymentMethod,
  purchasing,
  purchaseSuccess,
  onPurchase,
  usdcBalance = '0',
  isConnected,
  onConnect
}: PackageCardProps) {
  const isPurchasing = purchasing === pkg.amount;
  const isSuccess = purchaseSuccess === pkg.amount;
  const totalAmount = pkg.amount + (pkg.bonus || 0);

  // USDC 잔액 부족 체크
  const isInsufficientBalance = paymentMethod === 'usdc' && parseFloat(usdcBalance) < parseFloat(pkg.priceUSDC);

  return (
    <Card className={`relative overflow-hidden transition-all hover:shadow-lg border border-slate-700 bg-slate-800/50 ${isSuccess ? 'ring-2 ring-slate-500' : ''
      } ${isInsufficientBalance ? 'opacity-50' : ''}`}>
      {pkg.bonus && (
        <div className="absolute top-2 right-2 bg-slate-700 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          +{pkg.bonus} Bonus
        </div>
      )}

      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Gem className="w-8 h-8 text-slate-300" />
            <div>
              <div className="text-2xl font-bold text-white">
                {totalAmount.toLocaleString()}
              </div>
              <div className="text-sm text-slate-400">Diamond</div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700">
            <div className="text-2xl font-bold text-white">
              {paymentMethod === 'fiat' ? (
                `₩${pkg.priceKRW.toLocaleString()}`
              ) : (
                `${pkg.priceUSDC} USDC`
              )}
            </div>
          </div>

          {/* 지갑 미연결 시 Connect 버튼 표시 */}
          {!isConnected && paymentMethod === 'usdc' ? (
            <Button
              onClick={onConnect}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet
            </Button>
          ) : (
            <Button
              onClick={() => onPurchase(pkg)}
              disabled={isPurchasing || isSuccess || isInsufficientBalance}
              className="w-full"
              variant={isSuccess ? 'outline' : 'default'}
            >
              {isPurchasing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : isSuccess ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Purchased
                </>
              ) : isInsufficientBalance ? (
                'Insufficient Balance'
              ) : (
                'Buy'
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
