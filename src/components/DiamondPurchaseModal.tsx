'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Gem, Check, Loader2, Sparkles, Wallet, CreditCard } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWriteContract, usePublicClient, useAccount, useSwitchChain, useChainId, useDisconnect } from 'wagmi';
import { parseUnits } from 'viem';
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

  // USDC 결제 (스마트 컨트랙트) 훅 - 최상단으로 이동
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const currentChainId = useChainId();

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
        alert(`구매 실패: ${data.payload || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert('구매 중 오류가 발생했습니다.');
    } finally {
      setPurchasing(null);
    }
  };



  const handleUSDCPurchase = async (packageData: DiamondPackage) => {
    if (!isConnected || !address) {
      alert('지갑이 연결되지 않았습니다. 먼저 지갑을 연결해주세요.');
      return;
    }

    // 네트워크 확인 및 전환
    if (currentChainId !== 80002) {
      try {
        console.log('Switching to Polygon Amoy...');
        await switchChainAsync({ chainId: 80002 });
      } catch (error) {
        console.error('Network switch failed:', error);
        alert('Polygon Amoy 네트워크로 전환해야 합니다. 지갑에서 네트워크를 변경해주세요.');
        return;
      }
    }

    if (!publicClient) return;

    setPurchasing(packageData.amount);

    try {
      // 1. 잔액 확인
      const balanceNum = parseFloat(usdcBalance);
      const requiredAmount = parseFloat(packageData.priceUSDC);

      if (balanceNum < requiredAmount) {
        alert(`USDC 잔액이 부족합니다.\n현재: ${usdcBalance} USDC\n필요: ${packageData.priceUSDC} USDC`);
        setPurchasing(null);
        return;
      }

      const usdcAmountBigInt = parseUnits(packageData.priceUSDC, 6);

      // 2. Allowance 확인
      const allowance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, DIAMOND_PURCHASE_ADDRESS]
      });

      console.log(`Current Allowance: ${allowance}, Required: ${usdcAmountBigInt}`);

      if (allowance < usdcAmountBigInt) {
        // 3. USDC Approve (필요한 경우에만)
        alert('지갑에서 USDC 사용 승인(Approve) 서명을 해주세요.\n(모바일 지갑을 확인하세요)');
        console.log('Approving USDC...');

        const approveTx = await writeContractAsync({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [DIAMOND_PURCHASE_ADDRESS, usdcAmountBigInt],
          chainId: 80002,
          gas: BigInt(100000), // 가스 한도 명시적 설정 (Approve는 보통 5만~6만 소모)
        });

        console.log('Waiting for approve...', approveTx);
        await publicClient.waitForTransactionReceipt({ hash: approveTx });
        console.log('Approve confirmed! Verifying allowance...');

        // Allowance 업데이트 확인 (최대 10초 대기)
        let retries = 0;
        while (retries < 10) {
          const newAllowance = await publicClient.readContract({
            address: USDC_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [address, DIAMOND_PURCHASE_ADDRESS]
          });

          if (newAllowance >= usdcAmountBigInt) {
            console.log('Allowance updated:', newAllowance);
            break;
          }

          console.log(`Allowance not updated yet (${newAllowance}), waiting...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          retries++;
        }
      }

      // 4. Purchase Diamond
      alert('지갑에서 다이아몬드 구매(Purchase) 서명을 해주세요.\n(모바일 지갑을 확인하세요)');
      console.log('Purchasing Diamond...');

      // 가스 추정 (에러 미리 확인용)
      try {
        await publicClient.simulateContract({
          address: DIAMOND_PURCHASE_ADDRESS,
          abi: DIAMOND_PURCHASE_ABI,
          functionName: 'purchaseDiamond',
          args: [BigInt(gameUuid), BigInt(packageData.amount + (packageData.bonus || 0)), usdcAmountBigInt],
          account: address
        });
      } catch (simError: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        console.error('Simulation failed:', simError);
        // revert reason 추출 시도
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const revertReason = simError.walk?.((e: any) => e.data)?.data || simError.shortMessage || simError.message;
        throw new Error(`트랜잭션 시뮬레이션 실패: ${revertReason}`);
      }

      const purchaseTx = await writeContractAsync({
        address: DIAMOND_PURCHASE_ADDRESS,
        abi: DIAMOND_PURCHASE_ABI,
        functionName: 'purchaseDiamond',
        args: [BigInt(gameUuid), BigInt(packageData.amount + (packageData.bonus || 0)), usdcAmountBigInt],
        chainId: 80002,
      });

      console.log('Waiting for purchase...', purchaseTx);
      await publicClient.waitForTransactionReceipt({ hash: purchaseTx });

      // 5. 성공 처리
      setPurchaseSuccess(packageData.amount);
      setPurchasedAmount(packageData.amount + (packageData.bonus || 0));
      setShowSuccessModal(true);

      // 잔액 강제 차감 (UI 즉시 반영용)
      const currentBalance = parseFloat(usdcBalance);
      const cost = parseFloat(packageData.priceUSDC);
      const newBalance = Math.max(0, currentBalance - cost).toString();
      setUsdcBalance(newBalance);

      // 잔액 새로고침 (실제 데이터 동기화)
      await fetchUSDCBalance();

      if (onPurchaseSuccess) {
        onPurchaseSuccess();
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('USDC Purchase error:', error);
      // 에러 메시지 추출
      const errorMessage = error.message || JSON.stringify(error);
      if (errorMessage.includes('User rejected')) {
        alert('사용자가 서명을 거부했습니다.');
      } else {
        alert(`구매 중 오류가 발생했습니다.\n${errorMessage.slice(0, 100)}...`);
      }
    } finally {
      setPurchasing(null);
    }
  };

  const handleCloseSuccessModal = async () => {
    setShowSuccessModal(false);
    setPurchaseSuccess(null);
    setPurchasedAmount(0);

    // 1. USDC 잔액 갱신 (확인 버튼 클릭 시)
    // 이미 handleUSDCPurchase에서 강제 업데이트 및 fetch를 수행했으므로 여기서는 생략
    // (API 지연으로 인해 이전 잔액을 가져와서 덮어씌우는 문제 방지)

    // 2. 부모 컴포넌트(헤더) 갱신 요청
    if (onPurchaseSuccess) {
      onPurchaseSuccess();
    }
    onClose();
  };

  return (
    <>
      {/* 구매 모달 */}
      <Dialog open={isOpen && !showSuccessModal} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-xl bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
              <Gem className="w-6 h-6 text-slate-400" />
              Diamond Shop
            </DialogTitle>
          </DialogHeader>

          <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'fiat' | 'usdc')}>
            <TabsList className="grid w-full grid-cols-2 bg-slate-800 text-slate-400">
              <TabsTrigger value="fiat" className="flex items-center gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
                <CreditCard className="w-4 h-4" />
                Fiat
              </TabsTrigger>
              <TabsTrigger value="usdc" className="flex items-center gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
                <Wallet className="w-4 h-4" />
                USDC
              </TabsTrigger>
            </TabsList>

            {/* USDC 잔액 표시 */}
            {paymentMethod === 'usdc' && (
              <div className="mt-4 p-4 bg-blue-900/20 rounded-lg border border-blue-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-blue-400" />
                    <span className="font-medium text-white">USDC Balance</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {loadingBalance ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span className="text-xl font-bold text-blue-600">
                        {parseFloat(usdcBalance).toFixed(2)} USDC
                      </span>
                    )}
                    {isConnected && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => disconnect()}
                      >
                        Disconnect
                      </Button>
                    )}
                  </div>
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
        </div>
      </CardContent>
    </Card>
  );
}
