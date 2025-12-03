'use client';

import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Wallet, CreditCard, ArrowRight, Check } from 'lucide-react';
import ConnectWalletButton from './ConnectWalletButton';
import { useAccount } from 'wagmi';

interface TopUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    gameUuid: number;
}

export default function TopUpModal({ isOpen, onClose, gameUuid }: TopUpModalProps) {
    const { isConnected, address } = useAccount();

    // 지갑 연결 시 DB에 저장
    useEffect(() => {
        const saveWalletToDb = async () => {
            if (!isConnected || !address) return;

            try {
                const response = await fetch('/api/circle/wallet/connect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        gameUuid,
                        address,
                        chain: 'MATIC-AMOY',
                        label: 'MetaMask'
                    })
                });

                const data = await response.json();
                if (!data.success) {
                    console.error('지갑 저장 실패:', data.payload);
                }
            } catch (error) {
                console.error('지갑 저장 중 오류:', error);
            }
        };

        saveWalletToDb();
    }, [isConnected, address, gameUuid]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <CreditCard className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                        Top Up USDC
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="wallet" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="wallet">1. Connect Wallet</TabsTrigger>
                        <TabsTrigger value="faucet" disabled={!isConnected}>2. Get USDC</TabsTrigger>
                    </TabsList>

                    <TabsContent value="wallet" className="space-y-4 py-4">
                        <div className="text-center space-y-4">
                            <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                                <Wallet className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Please connect your external wallet (e.g., MetaMask) to top up USDC.
                                </p>
                                <div className="flex justify-center">
                                    <ConnectWalletButton />
                                </div>
                            </div>

                            {isConnected && (
                                <div className="flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
                                    <Check className="w-4 h-4" />
                                    Wallet Connected!
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="faucet" className="space-y-4 py-4">
                        <div className="space-y-4">
                            {/* 안내 메시지 */}
                            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                                    💡 Get Test USDC via Circle Faucet
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                    In the Circle Sandbox environment, you can get free test USDC through the Faucet.
                                </p>
                            </div>

                            {/* 외부 지갑 주소 표시 */}
                            {isConnected && address ? (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Connected Wallet Address
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 text-sm bg-gray-100 dark:bg-gray-900 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 font-mono break-all text-gray-600 dark:text-gray-400">
                                            {address}
                                        </code>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                navigator.clipboard.writeText(address);
                                                alert('Address copied!');
                                            }}
                                            className="border-gray-300 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                                        >
                                            Copy
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-sm text-gray-500 py-4">
                                    ⚠️ Please connect your wallet first
                                </div>
                            )}

                            {/* Faucet 링크 */}
                            <div className="space-y-3">
                                <h4 className="font-medium text-gray-900 dark:text-white">Steps to get USDC:</h4>
                                <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400 list-decimal list-inside">
                                    <li>Copy the wallet address above</li>
                                    <li>Go to the Circle Faucet website</li>
                                    <li>Enter your address and request USDC</li>
                                    <li>Balance will update in 1-2 minutes</li>
                                </ol>
                            </div>

                            {/* Faucet 버튼 */}
                            <Button
                                className="w-full"
                                onClick={() => {
                                    window.open('https://faucet.circle.com/', '_blank');
                                }}
                            >
                                <ArrowRight className="w-4 h-4 mr-2" />
                                Go to Circle Faucet
                            </Button>

                            {/* 참고 사항 */}
                            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded">
                                <strong>📌 Note:</strong> Test USDC has no real value and is for development purposes only.
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
