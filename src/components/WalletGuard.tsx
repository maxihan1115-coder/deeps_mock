'use client';

import { useEffect, useRef, useState } from 'react';
import { useAccount, useDisconnect } from 'wagmi';

interface WalletGuardProps {
    gameUuid: number;
}

export default function WalletGuard({ gameUuid }: WalletGuardProps) {
    const { address, isConnected } = useAccount();
    const { disconnectAsync } = useDisconnect();
    const [isChecked, setIsChecked] = useState(false);
    const isDisconnectingRef = useRef(false);

    // Reset state when user changes
    useEffect(() => {
        setIsChecked(false);
        isDisconnectingRef.current = false;
    }, [gameUuid]);

    // Reset disconnecting flag when connection drops
    useEffect(() => {
        if (!isConnected) {
            isDisconnectingRef.current = false;
        }
    }, [isConnected]);

    useEffect(() => {
        if (!gameUuid) return;

        const checkWallet = async () => {
            // If we are in the process of disconnecting, skip checks to avoid race conditions
            if (isDisconnectingRef.current) return;

            try {
                // 1. Fetch linked wallets for this user
                const res = await fetch(`/api/wallet/connect?gameUuid=${gameUuid}`);
                const data = await res.json();
                const linkedWallets: { address: string }[] = data.payload || [];

                // 2. Check current wallet status
                if (isConnected && address) {
                    const isLinked = linkedWallets.some(
                        w => w.address.toLowerCase() === address.toLowerCase()
                    );

                    if (linkedWallets.length > 0) {
                        // Case A: User has linked wallets
                        if (!isLinked) {
                            console.log('🚫 Wallet mismatch! Disconnecting stale wallet (DISABLED):', address);
                            // isDisconnectingRef.current = true;
                            // await disconnectAsync();
                        } else {
                            console.log('✅ Wallet verified:', address);
                        }
                    } else {
                        // Case B: User has NO linked wallets
                        if (!isChecked) {
                            // Initial check on mount:
                            // If a wallet is already connected but not linked, it's likely from a previous session (Stale).
                            console.log('🧹 Cleaning up stale wallet connection for new user (DISABLED)...');
                            // isDisconnectingRef.current = true;
                            // await disconnectAsync();
                        } else {
                            // Subsequent update:
                            // User actively connected a wallet. We should link it now.
                            // BUT, ensure we didn't just try to disconnect it.
                            if (!isDisconnectingRef.current) {
                                console.log('🔗 Linking new wallet:', address);
                                const linkResponse = await fetch('/api/wallet/connect', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        gameUuid,
                                        address,
                                        chain: 'MATIC-AMOY',
                                        label: 'Main Wallet'
                                    })
                                });

                                const linkData = await linkResponse.json();

                                // ⭐️ 중복 지갑 에러 처리
                                if (!linkData.success) {
                                    if (linkData.error === 'WALLET_ALREADY_LINKED') {
                                        console.error('⚠️ 이 지갑은 다른 계정에 연결되어 있습니다');
                                        alert('이 지갑은 이미 다른 계정에 연결되어 있습니다.\n다른 지갑을 사용해주세요.');
                                        // 지갑 연결 해제
                                        isDisconnectingRef.current = true;
                                        await disconnectAsync();
                                    } else {
                                        console.error('지갑 연결 실패:', linkData.error);
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Wallet check failed:', error);
            } finally {
                if (!isDisconnectingRef.current) {
                    setIsChecked(true);
                }
            }
        };

        checkWallet();
    }, [gameUuid, address, isConnected, disconnectAsync, isChecked]);

    return null;
}
