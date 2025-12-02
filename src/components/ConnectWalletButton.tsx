'use client';

import { ConnectKitButton } from 'connectkit';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';

export default function ConnectWalletButton() {
    return (
        <ConnectKitButton.Custom>
            {({ isConnected, isConnecting, show, hide, address, ensName, chain }) => {
                return (
                    <Button
                        onClick={show}
                        variant={isConnected ? "outline" : "default"}
                        className="flex items-center gap-2"
                    >
                        <Wallet className="w-4 h-4" />
                        {isConnected ? (
                            <span>
                                {ensName ?? address?.slice(0, 6) + '...' + address?.slice(-4)}
                            </span>
                        ) : (
                            <span>지갑 연결</span>
                        )}
                    </Button>
                );
            }}
        </ConnectKitButton.Custom>
    );
}
