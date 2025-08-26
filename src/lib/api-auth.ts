import { NextRequest, NextResponse } from 'next/server';

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
    const auth = validateApiAuth(request);
    
    if (!auth.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          payload: 'API 인증 키 오류'
        },
        { status: 401 }
      );
    }
    
    // 인증된 요청 객체 생성
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.bappAuth = auth;
    
    return handler(authenticatedRequest);
  };
}
