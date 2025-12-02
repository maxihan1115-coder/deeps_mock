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
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CreditCard className="w-6 h-6 text-blue-600" />
                        USDC 충전 (On-Ramp)
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="wallet" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="wallet">1. 지갑 연결</TabsTrigger>
                        <TabsTrigger value="faucet" disabled={!isConnected}>2. USDC 받기</TabsTrigger>
                    </TabsList>

                    <TabsContent value="wallet" className="space-y-4 py-4">
                        <div className="text-center space-y-4">
                            <div className="p-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                <Wallet className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                                <p className="text-sm text-gray-600 mb-4">
                                    USDC를 충전할 외부 지갑(MetaMask 등)을 연결해주세요.
                                </p>
                                <div className="flex justify-center">
                                    <ConnectWalletButton />
                                </div>
                            </div>

                            {isConnected && (
                                <div className="flex items-center justify-center gap-2 text-green-600 font-medium">
                                    <Check className="w-4 h-4" />
                                    지갑이 연결되었습니다!
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="faucet" className="space-y-4 py-4">
                        <div className="space-y-4">
                            {/* 안내 메시지 */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h3 className="font-semibold text-blue-900 mb-2">
                                    💡 Circle Faucet으로 테스트 USDC 받기
                                </h3>
                                <p className="text-sm text-blue-700 mb-3">
                                    Circle Sandbox 환경에서는 Faucet을 통해 무료로 테스트 USDC를 받을 수 있습니다.
                                </p>
                            </div>

                            {/* 외부 지갑 주소 표시 */}
                            {isConnected && address ? (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        연결된 외부 지갑 주소 (USDC를 받을 주소)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 text-sm bg-gray-100 px-3 py-2 rounded border font-mono break-all">
                                            {address}
                                        </code>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                navigator.clipboard.writeText(address);
                                                alert('주소가 복사되었습니다!');
                                            }}
                                        >
                                            복사
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-sm text-gray-500 py-4">
                                    ⚠️ 먼저 지갑을 연결해주세요
                                </div>
                            )}

                            {/* Faucet 링크 */}
                            <div className="space-y-3">
                                <h4 className="font-medium text-gray-900">USDC 받기 단계:</h4>
                                <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                                    <li>위의 지갑 주소를 복사하세요</li>
                                    <li>Circle Faucet 웹사이트로 이동하세요</li>
                                    <li>지갑 주소를 입력하고 USDC를 요청하세요</li>
                                    <li>1-2분 후 잔액이 업데이트됩니다</li>
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
                                Circle Faucet으로 이동
                            </Button>

                            {/* 참고 사항 */}
                            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                                <strong>📌 참고:</strong> 테스트 환경에서 받은 USDC는 실제 가치가 없으며,
                                개발 및 테스트 목적으로만 사용됩니다.
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
