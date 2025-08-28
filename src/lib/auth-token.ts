import { NextRequest, NextResponse } from 'next/server';
import { 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from './api-errors';
import fs from 'fs';
import path from 'path';

// 파일 로깅 함수
function logToFile(message: string) {
  try {
    const logPath = path.join(process.cwd(), 'middleware.log');
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(logPath, logMessage);
  } catch (error) {
    // 파일 로깅 실패 시 무시 (콘솔 로그는 유지)
  }
}

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
      // 요청 정보 로깅
      const logMessage = `🔐 [withAuthToken] ${req.method} ${new URL(req.url).pathname}`;
      console.log(logMessage);
      logToFile(logMessage);
      console.log('📅 Time:', new Date().toISOString());
      console.log('🌐 Method:', req.method);
      console.log('🔗 URL:', req.url);
      console.log('📍 Path:', new URL(req.url).pathname);
      
      // 헤더 정보 로깅 (민감한 정보는 마스킹)
      const headers = Object.fromEntries(req.headers.entries());
      const maskedHeaders = { ...headers };
      if (maskedHeaders.authorization) maskedHeaders.authorization = maskedHeaders.authorization.substring(0, 20) + '...';
      if (maskedHeaders['api-auth']) maskedHeaders['api-auth'] = maskedHeaders['api-auth'].substring(0, 20) + '...';
      if (maskedHeaders['api_auth']) maskedHeaders['api_auth'] = maskedHeaders['api_auth'].substring(0, 20) + '...';
      console.log('📋 Headers:', maskedHeaders);

      const authHeader = req.headers.get('authorization');
      const apiAuthHeader = req.headers.get('api-auth');
      const apiAuthUnderscoreHeader = req.headers.get('api_auth');
      
      let token = '';
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // 'Bearer ' 제거
        const authMsg = '🔑 Auth type: Authorization Bearer';
        console.log(authMsg);
        logToFile(authMsg);
      } else if (apiAuthHeader) {
        token = apiAuthHeader;
        const authMsg = '🔑 Auth type: api-auth header';
        console.log(authMsg);
        logToFile(authMsg);
      } else if (apiAuthUnderscoreHeader) {
        token = apiAuthUnderscoreHeader;
        const authMsg = '🔑 Auth type: api_auth header';
        console.log(authMsg);
        logToFile(authMsg);
      } else {
        const errorMsg = '❌ No auth token found in headers';
        console.log(errorMsg);
        logToFile(errorMsg);
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

      console.log('🔍 Token validation started...');
      const isValid = verifyApiKey(token);
      const validationMsg = `✅ Token validation result: ${isValid ? 'VALID' : 'INVALID'}`;
      console.log(validationMsg);
      logToFile(validationMsg);
      
      if (!isValid) {
        const failMsg = '❌ Auth failed - invalid token';
        console.log(failMsg);
        logToFile(failMsg);
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
      const successMsg = '✅ Auth successful - calling handler...';
      console.log(successMsg);
      logToFile(successMsg);
      const response = await handler(req);
      const completeMsg = '🎉 Handler completed successfully';
      console.log(completeMsg);
      logToFile(completeMsg);
      return response;
    } catch (error) {
      const errorMsg = `🚨 [withAuthToken] 미들웨어 에러 발생! ${error instanceof Error ? error.message : error}`;
      console.error(errorMsg);
      logToFile(errorMsg);
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
