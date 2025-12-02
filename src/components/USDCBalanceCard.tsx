'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, RefreshCw, ExternalLink, Loader2 } from 'lucide-react';

interface USDCBalanceCardProps {
    gameUuid: number;
}

export default function USDCBalanceCard({ gameUuid }: USDCBalanceCardProps) {
    const [balance, setBalance] = useState<string>('0');
    const [walletAddress, setWalletAddress] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchBalance();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameUuid]);

    const fetchBalance = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/circle/balance?gameUuid=${gameUuid}`);
            const data = await response.json();

            if (data.success) {
                setBalance(data.payload.usdc);
                setWalletAddress(data.payload.address);
            }
        } catch (error) {
            console.error('USDC 잔액 조회 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchBalance();
        setRefreshing(false);
    };

    const openExplorer = () => {
        if (walletAddress) {
            // Polygon Amoy Testnet Explorer
            window.open(`https://amoy.polygonscan.com/address/${walletAddress}`, '_blank');
        }
    };



    return (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-blue-600" />
                        <span>USDC 잔액</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="h-8 w-8"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </Button>
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <>
                        {/* 잔액 표시 */}
                        <div className="text-center py-4">
                            <div className="text-4xl font-bold text-blue-600">
                                {parseFloat(balance).toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                USDC
                            </div>
                        </div>

                        {/* 지갑 주소 */}
                        {walletAddress && (
                            <div className="space-y-2">
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    내 USDC 지갑 주소
                                </div>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 text-xs bg-white dark:bg-gray-800 px-3 py-2 rounded border font-mono break-all">
                                        {walletAddress}
                                    </code>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            navigator.clipboard.writeText(walletAddress);
                                            alert('주소가 복사되었습니다!');
                                        }}
                                        className="shrink-0"
                                    >
                                        복사
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={openExplorer}
                                        className="shrink-0"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* 안내 메시지 */}
                        <div className="text-xs text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 p-3 rounded">
                            💡 <strong>Testnet USDC 받기:</strong>
                            <br />
                            위의 지갑 주소를 복사하여{' '}
                            <a
                                href="https://faucet.circle.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline font-semibold"
                            >
                                Circle Faucet
                            </a>
                            에 입력하면 테스트 USDC를 받을 수 있습니다.
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
