import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createErrorResponse } from './api-errors';

export interface AuthenticatedTokenRequest extends NextRequest {
  gameUuid?: number;
  platformType?: string;
}

export function validateJWTToken(token: string): boolean {
  try {
    // JWT 형식 검증 (header.payload.signature)
    const parts = token.split('.');
    return parts.length === 3;
  } catch (error) {
    return false;
  }
}

export function verifyJWTToken(token: string): any {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not set');
    }
    
    const decoded = jwt.verify(token, secret);
    return decoded;
  } catch (error) {
    console.error('JWT 토큰 검증 실패:', error);
    return null;
  }
}

export function withAuthToken(handler: (req: AuthenticatedTokenRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const authHeader = req.headers.get('authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return createErrorResponse('UNAUTHORIZED', 'Auth token이 필요합니다.');
      }

      const token = authHeader.substring(7); // 'Bearer ' 제거

      if (!validateJWTToken(token)) {
        return createErrorResponse('UNAUTHORIZED', '유효하지 않은 JWT 토큰 형식입니다.');
      }

      const decoded = verifyJWTToken(token);
      
      if (!decoded) {
        return createErrorResponse('UNAUTHORIZED', '유효하지 않은 JWT 토큰입니다.');
      }

      // 토큰에서 필요한 정보 추출
      const { gameUuid, platformType } = decoded;

      if (!gameUuid) {
        return createErrorResponse('UNAUTHORIZED', '토큰에 gameUuid가 없습니다.');
      }

      // 요청 객체에 인증 정보 추가
      const authenticatedReq = req as AuthenticatedTokenRequest;
      authenticatedReq.gameUuid = gameUuid;
      authenticatedReq.platformType = platformType;

      return handler(authenticatedReq);
    } catch (error) {
      console.error('Auth token 미들웨어 오류:', error);
      return createErrorResponse('SERVICE_UNAVAILABLE', '인증 처리 중 오류가 발생했습니다.');
    }
  };
}
