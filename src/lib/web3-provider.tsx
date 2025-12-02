'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { polygonAmoy } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectKitProvider } from 'connectkit';
import { injected, walletConnect } from 'wagmi/connectors';

// WalletConnect Project ID (환경변수 또는 임시 ID)
// 실제 서비스 시에는 https://cloud.walletconnect.com 에서 발급받은 ID를 사용해야 합니다.
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '4f9644246c5965705a66666666666666';

const config = createConfig({
    chains: [polygonAmoy],
    transports: {
        [polygonAmoy.id]: http('https://polygon-amoy.drpc.org'),
    },
    connectors: [
        injected(), // MetaMask 등 브라우저 확장 프로그램
        walletConnect({
            projectId,
            showQrModal: false // ConnectKit이 QR 모달을 대신 처리함
        }),
    ],
    ssr: true, // 서버 사이드 렌더링 지원
});

const queryClient = new QueryClient();

export const Web3Provider = ({ children }: { children: React.ReactNode }) => {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <ConnectKitProvider>
                    {children}
                </ConnectKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
};
