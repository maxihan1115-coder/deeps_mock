import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse } from './api-errors';

export interface AuthenticatedTokenRequest extends NextRequest {
  // API Key 방식이므로 추가 정보 없음
  // 빈 인터페이스이지만 확장성을 위해 유지
}

export function validateApiKey(token: string): boolean {
  // API Key 형식 검증 (간단한 문자열)
  return typeof token === 'string' && token.length > 0;
}

export function verifyApiKey(token: string): boolean {
  try {
    const expectedToken = process.env.BAPP_AUTH_TOKEN;
    if (!expectedToken) {
      console.error('BAPP_AUTH_TOKEN이 설정되지 않았습니다.');
      return false;
    }
    
    return token === expectedToken;
  } catch (error) {
    console.error('API Key 검증 실패:', error);
    return false;
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

      if (!validateApiKey(token)) {
        return createErrorResponse('UNAUTHORIZED', '유효하지 않은 API Key 형식입니다.');
      }

      const isValid = verifyApiKey(token);
      
      if (!isValid) {
        return createErrorResponse('UNAUTHORIZED', '유효하지 않은 API Key입니다.');
      }

      // 요청 객체를 그대로 전달 (API Key 방식이므로 추가 정보 없음)
      const authenticatedReq = req as AuthenticatedTokenRequest;

      return handler(authenticatedReq);
    } catch (error) {
      console.error('Auth token 미들웨어 오류:', error);
      return createErrorResponse('SERVICE_UNAVAILABLE', '인증 처리 중 오류가 발생했습니다.');
    }
  };
}
