'use client';

import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Wallet, CreditCard, ArrowRight, Check, Copy } from 'lucide-react';
import ConnectWalletButton from './ConnectWalletButton';
import { useAccount, useDisconnect } from 'wagmi';

interface TopUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    gameUuid: number;
}

export default function TopUpModal({ isOpen, onClose, gameUuid }: TopUpModalProps) {
    const { isConnected, address } = useAccount();
    const { disconnect } = useDisconnect();
    const [mounted, setMounted] = React.useState(false);
    const [dbWalletAddress, setDbWalletAddress] = React.useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleDisconnect = () => {
        if (window.confirm("Are you sure you want to disconnect your wallet?")) {
            disconnect();
            setDbWalletAddress(null);
        }
    };

    const copyToClipboard = (text: string) => {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text);
        } else {
            // Fallback for non-secure context (HTTP)
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
            } catch (err) {
                console.error('Unable to copy to clipboard', err);
            }
            document.body.removeChild(textArea);
        }
        alert('Address copied!');
    };

    // DB에서 지갑 정보 조회
    useEffect(() => {
        if (gameUuid) {
            fetch(`/api/wallet/connect?gameUuid=${gameUuid}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.payload && data.payload.length > 0) {
                        setDbWalletAddress(data.payload[0].address);
                    }
                })
                .catch(err => console.error('Failed to fetch wallet:', err));
        }
    }, [gameUuid]);

    // 지갑 연결 시 DB에 저장
    useEffect(() => {
        if (isConnected && address && gameUuid) {
            // We should also update dbWalletAddress here to reflect immediate change
            setDbWalletAddress(address);

            fetch('/api/circle/wallet/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    gameUuid,
                    address,
                    chain: 'MATIC-AMOY', // 기본값
                    label: 'Metamask'
                }),
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        console.log('✅ Wallet verified:', address);
                    } else {
                        console.error('지갑 저장 실패:', data.payload);
                    }
                })
                .catch(err => console.error('Failed to verify wallet:', err));
        }
    }, [isConnected, address, gameUuid]);

    const isWalletConnected = (mounted && isConnected) || !!dbWalletAddress;
    const displayAddress = address || dbWalletAddress;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] sm:max-w-2xl bg-slate-900 border-slate-800 max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
                        <CreditCard className="w-6 h-6 text-slate-400" />
                        Top Up USDC
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="wallet" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-800 text-slate-400">
                        <TabsTrigger value="wallet" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
                            <span className="sm:hidden">Connect</span>
                            <span className="hidden sm:inline">1. Connect Wallet</span>
                        </TabsTrigger>
                        <TabsTrigger value="faucet" disabled={!isWalletConnected} className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
                            <span className="sm:hidden">Get USDC</span>
                            <span className="hidden sm:inline">2. Get USDC</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="wallet" className="space-y-4 py-4">
                        <div className="text-center space-y-4">
                            {isWalletConnected ? (
                                <div className="p-6 bg-green-900/20 rounded-lg border border-green-800">
                                    <div className="flex items-center justify-center gap-2 text-green-400 font-medium mb-4">
                                        <Check className="w-5 h-5" />
                                        Wallet Connected!
                                    </div>
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                className="flex items-center gap-2 h-8 px-3 border-slate-600 text-slate-300 bg-slate-800/50"
                                                disabled
                                            >
                                                <Wallet className="w-3.5 h-3.5" />
                                                <span className="text-xs">
                                                    {displayAddress?.slice(0, 6) + '...' + displayAddress?.slice(-4)}
                                                </span>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => copyToClipboard(displayAddress || '')}
                                                className="w-8 h-8 border-slate-600 text-slate-300 hover:bg-slate-700 bg-slate-800/50"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleDisconnect}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                        >
                                            Disconnect
                                        </Button>
                                    </div>
                                    <p className="text-sm text-slate-400 mt-4">
                                        You can now proceed to the next step.
                                    </p>
                                </div>
                            ) : (
                                <div className="p-6 bg-slate-800 rounded-lg border border-dashed border-slate-700">
                                    <Wallet className="w-12 h-12 mx-auto text-slate-500 mb-2" />
                                    <p className="text-sm text-slate-400 mb-4">
                                        Please connect your external wallet (e.g., MetaMask) to top up USDC.
                                    </p>
                                    <div className="flex justify-center">
                                        <ConnectWalletButton />
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="faucet" className="space-y-4 py-4">
                        <div className="space-y-4">
                            {/* 안내 메시지 */}
                            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                                <h3 className="font-semibold text-white mb-2">
                                    💡 Get Test USDC via Circle Faucet
                                </h3>
                                <p className="text-sm text-slate-400 mb-3">
                                    In the Circle Sandbox environment, you can get free test USDC through the Faucet.
                                </p>
                            </div>

                            {/* 외부 지갑 주소 표시 */}
                            {isWalletConnected && displayAddress ? (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">
                                        Connected Wallet Address
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 text-sm bg-slate-900 px-3 py-2 rounded border border-slate-700 font-mono break-all text-slate-400">
                                            {displayAddress}
                                        </code>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                copyToClipboard(displayAddress || '');
                                            }}
                                            className="border-slate-600 text-slate-300 hover:bg-slate-800"
                                        >
                                            Copy
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-sm text-slate-500 py-4">
                                    ⚠️ Please connect your wallet first
                                </div>
                            )}

                            {/* Faucet 링크 */}
                            <div className="space-y-3">
                                <h4 className="font-medium text-white">Steps to get USDC:</h4>
                                <ol className="space-y-2 text-sm text-slate-400 list-decimal list-inside">
                                    <li>Copy the wallet address above</li>
                                    <li>Go to the Circle Faucet website</li>
                                    <li>Enter your address and request USDC</li>
                                    <li>Balance will update in 1-2 minutes</li>
                                </ol>
                            </div>

                            {/* Faucet 버튼 */}
                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => {
                                    window.open('https://faucet.circle.com/', '_blank');
                                }}
                            >
                                <ArrowRight className="w-4 h-4 mr-2" />
                                Go to Circle Faucet
                            </Button>

                            {/* 참고 사항 */}
                            <div className="text-xs text-slate-500 bg-slate-800 p-3 rounded">
                                <strong>📌 Note:</strong> Test USDC has no real value and is for development purposes only.
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent >
        </Dialog >
    );
}
