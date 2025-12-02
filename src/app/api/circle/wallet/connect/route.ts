import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    createSuccessResponse,
    createErrorResponse,
    getErrorStatusCode,
    API_ERROR_CODES
} from '@/lib/api-errors';

/**
 * POST /api/circle/wallet/connect
 * 외부 지갑 연결 (ExternalWallet에 저장)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { gameUuid, address, chain = 'MATIC-AMOY', label = 'MetaMask' } = body;

        if (!gameUuid || !address) {
            return NextResponse.json(
                createErrorResponse(API_ERROR_CODES.INVALID_INPUT, 'gameUuid와 address가 필요합니다.'),
                { status: getErrorStatusCode(API_ERROR_CODES.INVALID_INPUT) }
            );
        }

        const parsedGameUuid = Number.parseInt(gameUuid, 10);

        if (isNaN(parsedGameUuid)) {
            return NextResponse.json(
                createErrorResponse(API_ERROR_CODES.INVALID_USER, '유효하지 않은 gameUuid입니다.'),
                { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
            );
        }

        // 기존 지갑이 있으면 업데이트, 없으면 생성
        const existingWallet = await prisma.externalWallet.findUnique({
            where: {
                userId_address: {
                    userId: parsedGameUuid,
                    address: address.toLowerCase()
                }
            }
        });

        let wallet;

        if (existingWallet) {
            // 기존 지갑을 primary로 설정
            wallet = await prisma.externalWallet.update({
                where: {
                    id: existingWallet.id
                },
                data: {
                    isPrimary: true,
                    label,
                    chain,
                    updatedAt: new Date()
                }
            });
        } else {
            // 새로운 지갑 생성
            wallet = await prisma.externalWallet.create({
                data: {
                    userId: parsedGameUuid,
                    address: address.toLowerCase(),
                    chain,
                    label,
                    isPrimary: true
                }
            });
        }

        // 같은 사용자의 다른 지갑들은 primary 해제
        await prisma.externalWallet.updateMany({
            where: {
                userId: parsedGameUuid,
                id: {
                    not: wallet.id
                }
            },
            data: {
                isPrimary: false
            }
        });

        return NextResponse.json(
            createSuccessResponse({
                id: wallet.id,
                address: wallet.address,
                chain: wallet.chain,
                label: wallet.label,
                isPrimary: wallet.isPrimary
            })
        );
    } catch (error) {
        console.error('지갑 연결 중 오류:', error);
        return NextResponse.json(
            createErrorResponse(
                API_ERROR_CODES.SERVICE_UNAVAILABLE,
                '지갑 연결 중 오류가 발생했습니다.'
            ),
            { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
        );
    }
}
