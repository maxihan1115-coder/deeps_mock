'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag, CreditCard, Receipt, Gem, Coins, Store, ArrowLeftRight } from 'lucide-react';

interface ShopMenuCardProps {
    gameUuid: number;
    onOpenShop: () => void;
    onOpenGoldShop: () => void;
    onOpenDiamondShop: () => void;
    onOpenTopUp: () => void;
    onOpenPurchaseHistory: () => void;
    onOpenCurrencyExchange: () => void;
}

export default function ShopMenuCard({
    gameUuid,
    onOpenShop,
    onOpenGoldShop,
    onOpenDiamondShop,
    onOpenTopUp,
    onOpenPurchaseHistory,
    onOpenCurrencyExchange
}: ShopMenuCardProps) {
    const [usdcBalance, setUsdcBalance] = useState('0.00');

    useEffect(() => {
        const fetchUSDCBalance = async () => {
            try {
                const response = await fetch(`/api/circle/balance?gameUuid=${gameUuid}`);
                const data = await response.json();
                if (data.success) {
                    setUsdcBalance(parseFloat(data.payload.usdc || '0').toFixed(2));
                }
            } catch (error) {
                console.error('USDC 잔액 조회 실패:', error);
            }
        };

        fetchUSDCBalance();
    }, [gameUuid]);

    return (
        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm dark:bg-gray-900">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Store className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    Shop & Payment
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* USDC 잔액 */}
                <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">USDC Balance</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{usdcBalance}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">USDC</div>
                </div>

                <div className="space-y-2">
                    {/* 아이템 상점 버튼 */}
                    <Button
                        onClick={onOpenShop}
                        variant="outline"
                        className="w-full justify-start text-left font-medium hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-all dark:bg-gray-900 dark:border-gray-700"
                        size="default"
                    >
                        <ShoppingBag className="w-4 h-4 mr-3 text-gray-600 dark:text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300">Item Shop</span>
                    </Button>

                    {/* 골드 상점 버튼 */}
                    <Button
                        onClick={onOpenGoldShop}
                        variant="outline"
                        className="w-full justify-start text-left font-medium hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-all dark:bg-gray-900 dark:border-gray-700"
                        size="default"
                    >
                        <Coins className="w-4 h-4 mr-3 text-gray-600 dark:text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300">Gold Shop</span>
                    </Button>

                    {/* 다이아 상점 버튼 */}
                    <Button
                        onClick={onOpenDiamondShop}
                        variant="outline"
                        className="w-full justify-start text-left font-medium hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-all dark:bg-gray-900 dark:border-gray-700"
                        size="default"
                    >
                        <Gem className="w-4 h-4 mr-3 text-gray-600 dark:text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300">Diamond Shop</span>
                    </Button>

                    {/* 화폐 환전 버튼 */}
                    <Button
                        onClick={onOpenCurrencyExchange}
                        variant="outline"
                        className="w-full justify-start text-left font-medium hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-all dark:bg-gray-900 dark:border-gray-700"
                        size="default"
                    >
                        <ArrowLeftRight className="w-4 h-4 mr-3 text-gray-600 dark:text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300">Currency Exchange</span>
                    </Button>

                    {/* USDC 충전 버튼 */}
                    <Button
                        onClick={onOpenTopUp}
                        variant="outline"
                        className="w-full justify-start text-left font-medium hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-all dark:bg-gray-900 dark:border-gray-700"
                        size="default"
                    >
                        <CreditCard className="w-4 h-4 mr-3 text-gray-600 dark:text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300">Top Up USDC</span>
                    </Button>

                    {/* 거래내역 버튼 */}
                    <Button
                        onClick={onOpenPurchaseHistory}
                        variant="outline"
                        className="w-full justify-start text-left font-medium hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-all dark:bg-gray-900 dark:border-gray-700"
                        size="default"
                    >
                        <Receipt className="w-4 h-4 mr-3 text-gray-600 dark:text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300">Transaction History</span>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
