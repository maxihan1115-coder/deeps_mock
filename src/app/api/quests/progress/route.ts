import { NextResponse } from 'next/server';
import { 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';

export async function POST() {
  // 이 API는 더 이상 사용되지 않습니다. 퀘스트 진행도는 게임 종료 시 자동으로 업데이트됩니다.
  const errorResponse = createErrorResponse(
    API_ERROR_CODES.SERVICE_UNAVAILABLE,
    '이 API는 더 이상 사용되지 않습니다. 퀘스트 진행도는 게임 종료 시 자동으로 업데이트됩니다.'
  );
  return NextResponse.json(
    errorResponse,
    { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
  );
}
