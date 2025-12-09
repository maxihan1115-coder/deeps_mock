import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, getErrorStatusCode, API_ERROR_CODES } from '@/lib/api-errors';
import { circleWalletService } from '@/lib/circle/CircleWalletService';

export async function POST(request: NextRequest) {
    try {
        const { gameUuid, amount, direction } = await request.json();

        if (!gameUuid || !amount || direction !== 'TO_USDC') {
            return NextResponse.json(
                createErrorResponse(API_ERROR_CODES.INVALID_INPUT, 'Invalid input parameters'),
                { status: getErrorStatusCode(API_ERROR_CODES.INVALID_INPUT) }
            );
        }

        if (amount <= 0) {
            return NextResponse.json(
                createErrorResponse(API_ERROR_CODES.INVALID_INPUT, 'Amount must be positive'),
                { status: getErrorStatusCode(API_ERROR_CODES.INVALID_INPUT) }
            );
        }

        // Minimum exchange amount: 100 Diamonds
        const MIN_DIAMOND_AMOUNT = 100;
        if (amount < MIN_DIAMOND_AMOUNT) {
            return NextResponse.json(
                createErrorResponse(API_ERROR_CODES.INVALID_INPUT, `Minimum exchange amount is ${MIN_DIAMOND_AMOUNT} Diamonds`),
                { status: getErrorStatusCode(API_ERROR_CODES.INVALID_INPUT) }
            );
        }

        // Rate: 1 Diamond = 0.0001 USDC
        const rate = 0.0001;
        const usdcAmount = amount * rate;
        const usdcString = usdcAmount.toFixed(4); // Keep 4 decimals

        // Transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Check Diamond Balance
            const userCurrency = await tx.userCurrency.findUnique({
                where: { userId: gameUuid }
            });

            if (!userCurrency || userCurrency.diamond < amount) {
                throw new Error('Insufficient Diamond balance');
            }

            // 2. Get User Wallet (Circle Wallet OR External Wallet)
            let destinationAddress: string | null = null;
            let walletType: 'CIRCLE' | 'EXTERNAL' | null = null;
            let walletIdForCache: string | null = null;

            const circleWallet = await tx.circleWallet.findUnique({
                where: { userId: gameUuid }
            });

            if (circleWallet) {
                destinationAddress = circleWallet.address;
                walletType = 'CIRCLE';
                walletIdForCache = circleWallet.walletId;
            } else {
                const externalWallet = await tx.externalWallet.findFirst({
                    where: {
                        userId: gameUuid,
                        isPrimary: true
                    }
                });

                if (externalWallet) {
                    destinationAddress = externalWallet.address;
                    walletType = 'EXTERNAL';
                }
            }

            if (!destinationAddress) {
                throw new Error('User has no connected Circle wallet or External wallet to receive USDC');
            }

            // 3. Transfer USDC (Real Blockchain Transaction)
            const treasuryWalletIdEnv = process.env.CIRCLE_TREASURY_WALLET_ID;
            const treasuryAddress = process.env.CIRCLE_TREASURY_ADDRESS;

            let treasuryWalletId: string | null | undefined = treasuryWalletIdEnv;

            if (!treasuryWalletId && treasuryAddress) {
                // Address -> Wallet ID Lookup (Fallback)
                treasuryWalletId = await circleWalletService.getWalletIdByAddress(treasuryAddress);
            }

            let circleTransactionId: string | null = null;
            let txHash: string | null = null;

            if (treasuryWalletId) {
                console.log(`Processing USDC payout: Treasury(${treasuryWalletId}) -> User(${destinationAddress})`);
                const transferResult = await circleWalletService.transfer(
                    treasuryWalletId,
                    destinationAddress,
                    usdcString,
                    'USDC'
                );

                // Capture Circle transaction ID and txHash if available
                circleTransactionId = transferResult?.id || null;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                txHash = (transferResult as any)?.txHash || null;
            } else {
                console.error(`❌ Treasury Wallet ID not found. Configured Address: ${treasuryAddress}`);
                throw new Error('Treasury Wallet configuration error: Wallet ID not found.');
            }

            // 4. Deduct Diamond (Only after transfer initiated)
            await tx.userCurrency.update({
                where: { userId: gameUuid },
                data: { diamond: { decrement: amount } }
            });

            // 5. Update USDC Balance Cache (Only for Circle Wallets)
            if (walletType === 'CIRCLE' && walletIdForCache) {
                const currentUSDC = await tx.uSDCBalance.findUnique({
                    where: { userId: gameUuid }
                });

                const newBalance = currentUSDC
                    ? (parseFloat(currentUSDC.balance) + usdcAmount).toFixed(4)
                    : usdcString;

                await tx.uSDCBalance.upsert({
                    where: { userId: gameUuid },
                    update: { balance: newBalance },
                    create: {
                        userId: gameUuid,
                        walletId: walletIdForCache,
                        balance: newBalance
                    }
                });
            }

            // 6. Log Transaction (with Circle transaction ID and txHash)
            await tx.currencyTransaction.create({
                data: {
                    userId: gameUuid,
                    type: 'DIAMOND',
                    amount: -amount,
                    reason: 'EXCHANGE_TO_USDC',
                    circleTransactionId,
                    txHash,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any
            });

            return { usdcAmount: usdcString, txId: circleTransactionId || 'pending' };
        });

        return NextResponse.json(createSuccessResponse(result));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Exchange error:', error);
        console.error('Exchange error stack:', error.stack);
        return NextResponse.json(
            createErrorResponse(
                API_ERROR_CODES.SERVICE_UNAVAILABLE,
                `Exchange failed: ${error.message}`
            ),
            { status: 500 }
        );
    }
}
