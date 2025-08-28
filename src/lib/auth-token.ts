import { NextRequest, NextResponse } from 'next/server';
import { 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from './api-errors';

export function validateApiKey(token: string): boolean {
  // API Key 형식 검증 (간단한 문자열)
  return typeof token === 'string' && token.length > 0;
}

export function verifyApiKey(token: string): boolean {
  try {
    const expectedToken = process.env.BAPP_AUTH_TOKEN || process.env.BAPP_API_KEY;
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

export function withAuthToken(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const authHeader = req.headers.get('authorization');
      const apiAuthHeader = req.headers.get('api-auth');
      const apiAuthUnderscoreHeader = req.headers.get('api_auth');
      
      let token = '';
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // 'Bearer ' 제거
      } else if (apiAuthHeader) {
        token = apiAuthHeader;
      } else if (apiAuthUnderscoreHeader) {
        token = apiAuthUnderscoreHeader;
      } else {
        const errorResponse = createErrorResponse(
          API_ERROR_CODES.UNAUTHORIZED,
          'Auth token이 필요합니다. (Authorization: Bearer, api-auth, 또는 api_auth 헤더)'
        );
        return NextResponse.json(
          errorResponse,
          { status: getErrorStatusCode(API_ERROR_CODES.UNAUTHORIZED) }
        );
      }

      if (!validateApiKey(token)) {
        const errorResponse = createErrorResponse(
          API_ERROR_CODES.UNAUTHORIZED,
          '유효하지 않은 API Key 형식입니다.'
        );
        return NextResponse.json(
          errorResponse,
          { status: getErrorStatusCode(API_ERROR_CODES.UNAUTHORIZED) }
        );
      }

      const isValid = verifyApiKey(token);
      
      if (!isValid) {
        const errorResponse = createErrorResponse(
          API_ERROR_CODES.UNAUTHORIZED,
          '유효하지 않은 API Key입니다.'
        );
        return NextResponse.json(
          errorResponse,
          { status: getErrorStatusCode(API_ERROR_CODES.UNAUTHORIZED) }
        );
      }

      // 요청 객체를 그대로 전달
      return handler(req);
    } catch (error) {
      console.error('Auth token 미들웨어 오류:', error);
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.SERVICE_UNAVAILABLE,
        '인증 처리 중 오류가 발생했습니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
      );
    }
  };
}
