export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { diamondPurchaseListener } = await import('@/lib/blockchain/DiamondPurchaseListener');
        diamondPurchaseListener.startListening();
    }
}
