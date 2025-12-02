'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, CreditCard, ArrowRight, Loader2, Check } from 'lucide-react';
import ConnectWalletButton from './ConnectWalletButton';
import { useAccount } from 'wagmi';
import * as openpgp from 'openpgp';

interface TopUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    gameUuid: number;
}

export default function TopUpModal({ isOpen, onClose, gameUuid }: TopUpModalProps) {
    const { isConnected, address } = useAccount();
    const [amount, setAmount] = useState('10');
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handlePayment = async () => {
        if (!isConnected || !address) {
            alert('지갑을 먼저 연결해주세요.');
            return;
        }

        setLoading(true);
        try {
            // 1. Circle Public Key 조회
            const keyResponse = await fetch('/api/circle/public-key');
            const keyData = await keyResponse.json();

            if (!keyData.success) {
                throw new Error('Public Key 조회 실패');
            }

            const { publicKey, keyId } = keyData.payload;

            // 2. 카드 정보 암호화
            const cardData = {
                number: cardNumber,
                cvc: cvc
            };

            const decodedPublicKey = atob(publicKey);
            const message = await openpgp.createMessage({ text: JSON.stringify(cardData) });
            const encryptionKey = await openpgp.readKey({ armoredKey: decodedPublicKey });

            const encrypted = await openpgp.encrypt({
                message,
                encryptionKeys: encryptionKey,
            });

            const encryptedData = btoa(encrypted as string);

            // 3. 결제 요청 API 호출
            const paymentResponse = await fetch('/api/circle/payment/card', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameUuid,
                    amount,
                    encryptedData,
                    keyId,
                    toAddress: address,
                    sessionId: crypto.randomUUID(), // 세션 ID 생성
                    ipAddress: '127.0.0.1', // 실제로는 서버에서 감지하거나 클라이언트 IP 수집 필요
                }),
            });

            const paymentResult = await paymentResponse.json();

            if (paymentResult.success) {
                setSuccess(true);
            } else {
                throw new Error(paymentResult.payload || '결제 실패');
            }

        } catch (error: any) {
            console.error('결제 실패:', error);
            alert(`결제 실패: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

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
                        <TabsTrigger value="payment" disabled={!isConnected}>2. 결제 및 충전</TabsTrigger>
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

                    <TabsContent value="payment" className="space-y-4 py-4">
                        {success ? (
                            <div className="text-center space-y-4 py-6">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                    <Check className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="text-xl font-bold">충전 완료!</h3>
                                <p className="text-gray-600">
                                    {amount} USDC가 지갑으로 전송되었습니다.<br />
                                    잠시 후 지갑에서 확인하실 수 있습니다.
                                </p>
                                <Button onClick={onClose} className="w-full">확인</Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>충전 금액 (USDC)</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="pl-8"
                                        />
                                        <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>카드 번호</Label>
                                    <Input
                                        placeholder="0000 0000 0000 0000"
                                        value={cardNumber}
                                        onChange={(e) => setCardNumber(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>유효기간 (MM/YY)</Label>
                                        <Input
                                            placeholder="MM/YY"
                                            value={expiry}
                                            onChange={(e) => setExpiry(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>CVC</Label>
                                        <Input
                                            placeholder="123"
                                            type="password"
                                            maxLength={3}
                                            value={cvc}
                                            onChange={(e) => setCvc(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <Button
                                        className="w-full"
                                        onClick={handlePayment}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                결제 처리중...
                                            </>
                                        ) : (
                                            <>
                                                결제하기 <ArrowRight className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>
                                    <p className="text-xs text-center text-gray-500 mt-2">
                                        * 테스트 환경에서는 실제 결제가 이루어지지 않습니다.
                                    </p>
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
