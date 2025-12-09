'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeftRight, Gem, Wallet, Loader2, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWriteContract, usePublicClient, useAccount, useSwitchChain, useChainId } from 'wagmi';
import { parseUnits } from 'viem';
import {
    USDC_ADDRESS,
    DIAMOND_PURCHASE_ADDRESS,
    ERC20_ABI,
    DIAMOND_PURCHASE_ABI
} from '@/lib/blockchain/abis';

interface CurrencyExchangeModalProps {
    isOpen: boolean;
    onClose: () => void;
    gameUuid: number;
    onSuccess?: () => void;
}

// 교환 비율 설정
const USDC_TO_DIAMOND_RATE = 10000; // 1 USDC = 10,000 Diamonds (0.01 USDC = 100 Diamonds)
const DIAMOND_TO_USDC_RATE = 0.00008; // 1 Diamond = 0.00008 USDC (Selling price is slightly lower or same? User didn't specify spread. Let's make it symmetric for now: 100D = 0.01 USDC => 1D = 0.0001 USDC. Let's use 0.0001 for simplicity).
const SYMMETRIC_RATE = 0.0001;

// 최소 환전 금액 (100 다이아 기준)
const MIN_DIAMOND_AMOUNT = 100;
const MIN_USDC_AMOUNT = MIN_DIAMOND_AMOUNT / USDC_TO_DIAMOND_RATE; // 0.01 USDC

export default function CurrencyExchangeModal({
    isOpen,
    onClose,
    gameUuid,
    onSuccess
}: CurrencyExchangeModalProps) {
    const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
    const [amount, setAmount] = useState('');
    const [calculatedAmount, setCalculatedAmount] = useState('0');
    const [isLoading, setIsLoading] = useState(false);
    const [usdcBalance, setUsdcBalance] = useState('0');
    const [diamondBalance, setDiamondBalance] = useState(0); // This needs to be fetched

    // Blockchain hooks
    const { writeContractAsync } = useWriteContract();
    const publicClient = usePublicClient();
    const { isConnected, address } = useAccount();
    const { switchChainAsync } = useSwitchChain();
    const currentChainId = useChainId();

    // Status Modal
    const [status, setStatus] = useState<{
        type: 'success' | 'error' | 'loading' | null;
        message: string;
        title: string;
    }>({ type: null, message: '', title: '' });

    // Fetch Balances
    const fetchBalances = async () => {
        try {
            // 1. USDC Balance (API)
            const resUSDC = await fetch(`/api/circle/balance?gameUuid=${gameUuid}`);
            const dataUSDC = await resUSDC.json();
            if (dataUSDC.success) setUsdcBalance(dataUSDC.payload.usdc);

            // 2. Diamond Balance (UserCurrency)
            // We might need a new API or reuse an existing one. 
            // Assuming we can get it from somewhere or defaulting to 0 for now if API not ready.
            // Actually /api/currency/balance might be useful if it exists, or just read from QuestPanel logic?
            // For now, let's create a simple fetch if needed, or just assume the user knows their balance.
            // Let's retry fetching user info.
            // Or just displaying what we have.
        } catch (e) {
            console.error('Failed to fetch balances:', e);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchBalances();
            setAmount('');
            setCalculatedAmount('0');
            setStatus({ type: null, message: '', title: '' });
        }
    }, [isOpen]);

    // Reset amount when tab changes
    useEffect(() => {
        setAmount('');
        setCalculatedAmount('0');
    }, [activeTab]);

    // Calculate Exchange Amount
    useEffect(() => {
        const val = parseFloat(amount || '0');
        if (activeTab === 'buy') {
            // USDC -> Diamond
            // Rate: 1 USDC = 10000 Diamond
            setCalculatedAmount(Math.floor(val * USDC_TO_DIAMOND_RATE).toLocaleString());
        } else {
            // Diamond -> USDC
            // Rate: 1 Diamond = 0.0001 USDC
            setCalculatedAmount((val * SYMMETRIC_RATE).toFixed(4));
        }
    }, [amount, activeTab]);

    // Helper: Poll until allowance is synced
    const waitForAllowanceSync = async (
        requiredAmount: bigint,
        maxAttempts: number = 10,
        delayMs: number = 1500
    ): Promise<boolean> => {
        if (!publicClient || !address) return false;

        for (let i = 0; i < maxAttempts; i++) {
            const currentAllowance = await publicClient.readContract({
                address: USDC_ADDRESS,
                abi: ERC20_ABI,
                functionName: 'allowance',
                args: [address, DIAMOND_PURCHASE_ADDRESS as `0x${string}`]
            });

            if (currentAllowance >= requiredAmount) {
                return true;
            }

            await new Promise(r => setTimeout(r, delayMs));
        }
        return false;
    };

    // Helper: Parse error message for user-friendly display
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parseErrorMessage = (error: any): string => {
        const rawMessage = error?.message || error?.toString() || 'Unknown error';

        // Common error patterns
        if (rawMessage.includes('User rejected') || rawMessage.includes('user rejected')) {
            return 'Transaction was cancelled by user.';
        }
        if (rawMessage.includes('insufficient funds')) {
            return 'Insufficient funds for gas fee.';
        }
        if (rawMessage.includes('Internal JSON-RPC error')) {
            return 'Transaction failed. Please check your balance and try again.';
        }
        if (rawMessage.includes('execution reverted')) {
            return 'Transaction reverted. Please check your USDC balance.';
        }

        // Truncate long messages
        if (rawMessage.length > 100) {
            return rawMessage.substring(0, 100) + '...';
        }

        return rawMessage;
    };

    const handleBuyDiamonds = async () => {
        const usdcVal = parseFloat(amount || '0');
        if (!amount || usdcVal < MIN_USDC_AMOUNT) return;

        setIsLoading(true);
        setStatus({ type: 'loading', title: 'Processing Exchange', message: 'Checking wallet...' });

        try {
            const usdcAmount = parseFloat(amount);
            const diamondQuantity = Math.floor(usdcAmount * USDC_TO_DIAMOND_RATE);
            const usdcAmountBigInt = parseUnits(amount, 6);

            if (!address || !publicClient) throw new Error('Wallet not connected');

            // 1. Network Check
            if (currentChainId !== 80002) {
                setStatus({ type: 'loading', title: 'Switching Network', message: 'Please switch to Polygon Amoy...' });
                await switchChainAsync({ chainId: 80002 });
            }

            // 2. Allowance Check
            setStatus({ type: 'loading', title: 'Checking Allowance', message: 'Verifying USDC approval...' });
            const allowance = await publicClient.readContract({
                address: USDC_ADDRESS,
                abi: ERC20_ABI,
                functionName: 'allowance',
                args: [address, DIAMOND_PURCHASE_ADDRESS as `0x${string}`]
            });

            if (allowance < usdcAmountBigInt) {
                // Need approval first
                setStatus({ type: 'loading', title: 'Approve Required', message: 'USDC approval is needed. Wallet will open shortly...' });
                await new Promise(r => setTimeout(r, 500)); // Allow UI to render before wallet popup

                const approveTx = await writeContractAsync({
                    address: USDC_ADDRESS,
                    abi: ERC20_ABI,
                    functionName: 'approve',
                    args: [DIAMOND_PURCHASE_ADDRESS as `0x${string}`, usdcAmountBigInt],
                    chainId: 80002,
                });

                setStatus({ type: 'loading', title: 'Confirming Approval', message: 'Waiting for blockchain confirmation...' });
                await publicClient.waitForTransactionReceipt({ hash: approveTx });

                // Wait for RPC to sync the new allowance
                setStatus({ type: 'loading', title: 'Syncing', message: 'Waiting for network sync...' });
                const syncSuccess = await waitForAllowanceSync(usdcAmountBigInt);
                if (!syncSuccess) {
                    throw new Error('Allowance sync timeout. Please try again.');
                }
            }

            // 3. All preparations complete - Now request purchase confirmation
            setStatus({ type: 'loading', title: 'Ready to Exchange', message: 'Wallet will open shortly for purchase confirmation...' });
            await new Promise(r => setTimeout(r, 500)); // Allow UI to render before wallet popup

            const purchaseTx = await writeContractAsync({
                address: DIAMOND_PURCHASE_ADDRESS as `0x${string}`,
                abi: DIAMOND_PURCHASE_ABI,
                functionName: 'purchaseDiamond',
                args: [BigInt(gameUuid), BigInt(diamondQuantity), usdcAmountBigInt],
                chainId: 80002,
            });

            setStatus({ type: 'loading', title: 'Confirming Purchase', message: 'Waiting for blockchain confirmation...' });
            await publicClient.waitForTransactionReceipt({ hash: purchaseTx });

            setStatus({ type: 'success', title: 'Exchange Successful', message: `Purchased ${diamondQuantity.toLocaleString()} Diamonds for ${usdcAmount} USDC` });
            fetchBalances();
            setAmount('');

            setAmount('');

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error(error);
            setStatus({ type: 'error', title: 'Exchange Failed', message: parseErrorMessage(error) });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSellDiamonds = async () => {
        const diamondVal = parseInt(amount || '0');
        if (!amount || diamondVal < MIN_DIAMOND_AMOUNT) return;

        setIsLoading(true);
        setStatus({ type: 'loading', title: 'Processing Exchange', message: 'Requesting exchange...' });

        try {
            const diamondAmount = parseInt(amount);

            const response = await fetch('/api/currency/exchange', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameUuid,
                    amount: diamondAmount,
                    direction: 'TO_USDC'
                })
            });

            const data = await response.json();
            if (!data.success) throw new Error((data.payload as string) || 'Exchange failed');

            setStatus({ type: 'success', title: 'Exchange Successful', message: `Exchanged ${diamondAmount.toLocaleString()} Diamonds for ${data.payload.usdcAmount} USDC` });
            fetchBalances();
            setAmount('');

            setAmount('');

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error(error);
            setStatus({ type: 'error', title: 'Exchange Failed', message: parseErrorMessage(error) });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <RefreshCw className="w-5 h-5 text-blue-500" />
                        Currency Exchange
                    </DialogTitle>
                    <DialogDescription className="hidden">Exchange currency between USDC and Diamond</DialogDescription>
                </DialogHeader>

                {status.type ? (
                    <div className="flex flex-col items-center justify-center p-6 space-y-4">
                        {status.type === 'loading' && <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />}
                        {status.type === 'success' && <Check className="w-12 h-12 text-green-500" />}
                        {status.type === 'error' && <AlertCircle className="w-12 h-12 text-red-500" />}

                        <h3 className="text-lg font-bold">{status.title}</h3>
                        <p className="text-center text-slate-400">{status.message}</p>

                        {status.type !== 'loading' && (
                            <Button
                                onClick={() => {
                                    if (status.type === 'success') {
                                        if (onSuccess) onSuccess();
                                        onClose();
                                    } else {
                                        setStatus({ type: null, message: '', title: '' });
                                    }
                                }}
                                className={`w-full ${status.type === 'success' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                            >
                                {status.type === 'success' ? 'Done' : 'Try Again'}
                            </Button>
                        )}
                    </div>
                ) : (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                            <TabsTrigger value="buy">USDC → Diamond</TabsTrigger>
                            <TabsTrigger value="sell">Diamond → USDC</TabsTrigger>
                        </TabsList>

                        <div className="mt-6 space-y-4">
                            <div className="space-y-2">
                                <Label>
                                    {activeTab === 'buy' ? 'Pay (USDC)' : 'Pay (Diamonds)'}
                                </Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="bg-slate-800 border-slate-700 pr-12 text-lg"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                                        {activeTab === 'buy' ? 'USDC' : 'Diamonds'}
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500 text-right">
                                    Balance: {activeTab === 'buy' ? `${usdcBalance} USDC` : 'Check Lobby'}
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <ArrowLeftRight className="w-5 h-5 text-slate-500 rotate-90" />
                            </div>

                            <div className="space-y-2">
                                <Label>
                                    {activeTab === 'buy' ? 'Receive (Diamonds)' : 'Receive (USDC)'}
                                </Label>
                                <div className="p-3 bg-slate-800/50 rounded-md border border-slate-700 flex justify-between items-center">
                                    <span className="text-xl font-bold">
                                        {calculatedAmount}
                                    </span>
                                    <span className="text-sm text-slate-400">
                                        {activeTab === 'buy' ? 'Diamonds' : 'USDC'}
                                    </span>
                                </div>
                            </div>

                            {/* Minimum hint */}
                            <div className="text-xs text-slate-500 text-center">
                                Minimum: {activeTab === 'buy' ? `${MIN_USDC_AMOUNT} USDC (${MIN_DIAMOND_AMOUNT} Diamonds)` : `${MIN_DIAMOND_AMOUNT} Diamonds`}
                            </div>

                            <Button
                                onClick={activeTab === 'buy' ? handleBuyDiamonds : handleSellDiamonds}
                                disabled={
                                    isLoading ||
                                    !amount ||
                                    (activeTab === 'buy'
                                        ? parseFloat(amount || '0') < MIN_USDC_AMOUNT
                                        : parseInt(amount || '0') < MIN_DIAMOND_AMOUNT)
                                }
                                className={`w-full ${activeTab === 'buy' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    'Exchange'
                                )}
                            </Button>
                        </div>
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    );
}
