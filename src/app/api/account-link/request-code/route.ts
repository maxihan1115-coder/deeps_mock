import { NextRequest, NextResponse } from 'next/server';
import { mysqlGameStore } from '@/lib/mysql-store';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';

export async function GET(request: NextRequest) {
  console.log('🔑 Request code API called');
  try {
    const { searchParams } = new URL(request.url);
    const uuid = searchParams.get('uuid');
    console.log('📝 UUID from request:', uuid);

    if (!uuid) {
      console.log('❌ UUID missing');
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        'UUID가 필요합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // UUID로 사용자 찾기 (UUID 필드로 검색)
    console.log('🔍 Looking for user with UUID:', parseInt(uuid));
    const user = await mysqlGameStore.getUserByUuid(parseInt(uuid));
    console.log('👤 User found:', user ? 'Yes' : 'No');

    if (!user) {
      console.log('❌ User not found');
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '유효하지 않은 UUID입니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // BORA 플랫폼 API 호출하여 임시 코드 요청
    console.log('🌐 Calling BORA platform API for temp code');
    console.log('🔑 Authorization header from env:', process.env.BAPP_API_KEY ? 'Set' : 'Not set');
    console.log('🌐 API URL:', `https://api.boradeeps.cc/m/auth/v1/bapp/request-code?uuid=${uuid}`);
    
    const platformResponse = await fetch(`https://api.boradeeps.cc/m/auth/v1/bapp/request-code?uuid=${uuid}`, {
      method: 'GET',
      headers: {
        'Authorization': process.env.BAPP_API_KEY || '',
        'Content-Type': 'application/json',
      },
    });

    console.log('📊 Response status:', platformResponse.status);
    console.log('📊 Response headers:', Object.fromEntries(platformResponse.headers.entries()));
    
    const platformData = await platformResponse.json();
    console.log('📡 BORA platform response:', platformData);

    if (!platformResponse.ok || !platformData.success) {
      console.log('❌ BORA platform API failed with status:', platformResponse.status);
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.SERVICE_UNAVAILABLE,
        '플랫폼 임시 코드 요청에 실패했습니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
      );
    }

    // 게임 내부에도 임시 코드 저장 (검증용)
    console.log('🔐 Creating local temp code for user (uuid):', user.uuid);
    const tempCode = platformData.payload; // payload 자체가 코드 문자열
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5분 후 만료
    await mysqlGameStore.createTempCode(user.uuid, tempCode, expiresAt);
    console.log('✅ Local temp code created:', tempCode);

    // 플랫폼에서 받은 코드 반환
    const successResponse = createSuccessResponse(platformData.payload);
    return NextResponse.json(successResponse);
  } catch (error) {
    console.error('❌ Request code error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '임시 코드 요청 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}


