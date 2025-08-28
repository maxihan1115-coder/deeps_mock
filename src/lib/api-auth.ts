import { NextRequest, NextResponse } from 'next/server';
import { 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from './api-errors';

// BApp API 키 (실제 환경에서는 환경변수로 관리)
const BAPP_API_KEY = process.env.BAPP_API_KEY || 'UzRyOF........RXVuc2Y=';

export interface AuthenticatedRequest extends NextRequest {
  bappAuth?: {
    apiKey: string;
    isValid: boolean;
  };
}

// API 키 검증 미들웨어
export function validateApiAuth(request: NextRequest): { isValid: boolean; apiKey: string } {
  const apiKey = request.headers.get('api-auth');
  
  if (!apiKey) {
    return { isValid: false, apiKey: '' };
  }
  
  // API 키 검증 (실제로는 더 복잡한 검증 로직이 필요할 수 있음)
  const isValid = apiKey === BAPP_API_KEY;
  
  return { isValid, apiKey };
}

// API 키 검증이 필요한 핸들러 래퍼
export function withApiAuth(handler: (request: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // 요청 정보 로깅
      console.log('🔐 [withApiAuth] 인증 미들웨어 호출됨');
      console.log('📅 Time:', new Date().toISOString());
      console.log('🌐 Method:', request.method);
      console.log('🔗 URL:', request.url);
      console.log('📍 Path:', new URL(request.url).pathname);
      
      const auth = validateApiAuth(request);
      console.log('🔍 API Auth validation result:', auth.isValid ? 'VALID' : 'INVALID');
      
      if (!auth.isValid) {
        console.log('❌ API Auth failed - invalid api-auth header');
        const errorResponse = createErrorResponse(
          API_ERROR_CODES.UNAUTHORIZED,
          'API 인증 키 오류'
        );
        return NextResponse.json(
          errorResponse,
          { status: getErrorStatusCode(API_ERROR_CODES.UNAUTHORIZED) }
        );
      }
      
      // 인증된 요청 객체 생성
      console.log('✅ API Auth successful - calling handler...');
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.bappAuth = auth;
      
      const response = await handler(authenticatedRequest);
      console.log('🎉 API Auth handler completed successfully');
      return response;
    } catch (error) {
      console.error('🚨 [withApiAuth] 미들웨어 에러 발생!');
      console.error('❌ Error details:', error instanceof Error ? error.message : error);
      console.error('🔍 Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
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
