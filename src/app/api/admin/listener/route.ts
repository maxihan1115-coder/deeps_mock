import { NextResponse } from 'next/server';
import { diamondPurchaseListener } from '@/lib/blockchain/DiamondPurchaseListener';

export async function GET() {
    return NextResponse.json({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        isListening: (diamondPurchaseListener as any).isListening
    });
}

export async function POST() {
    diamondPurchaseListener.startListening();
    return NextResponse.json({
        message: 'Listener started',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        isListening: (diamondPurchaseListener as any).isListening
    });
}
