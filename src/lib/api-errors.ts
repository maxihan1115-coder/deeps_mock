// BApp 연동을 위한 표준 에러 코드 정의
export const API_ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INVALID_USER: 'INVALID_USER',
  INVALID_QUEST: 'INVALID_QUEST',
  INVALID_INPUT: 'INVALID_INPUT',
  INSUFFICIENT_CURRENCY: 'INSUFFICIENT_CURRENCY',
  ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
} as const;

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];

// HTTP 상태 코드와 에러 코드 매핑
export const ERROR_STATUS_MAP: Record<ApiErrorCode, number> = {
  [API_ERROR_CODES.UNAUTHORIZED]: 401,
  [API_ERROR_CODES.SERVICE_UNAVAILABLE]: 503,
  [API_ERROR_CODES.INVALID_USER]: 400,
  [API_ERROR_CODES.INVALID_QUEST]: 400,
  [API_ERROR_CODES.INVALID_INPUT]: 400,
  [API_ERROR_CODES.INSUFFICIENT_CURRENCY]: 400,
  [API_ERROR_CODES.ITEM_NOT_FOUND]: 404,
};

// 표준 API 응답 형식
export interface ApiResponse<T = unknown> {
  success: boolean;
  error: ApiErrorCode | null;
  payload: T | string | null;
}

// 성공 응답 생성 함수
export function createSuccessResponse<T>(payload: T): ApiResponse<T> {
  return {
    success: true,
    error: null,
    payload,
  };
}

// 에러 응답 생성 함수
export function createErrorResponse(
  errorCode: ApiErrorCode,
  message: string
): ApiResponse<string> {
  return {
    success: false,
    error: errorCode,
    payload: message,
  };
}

// 에러 코드에 따른 HTTP 상태 코드 반환
export function getErrorStatusCode(errorCode: ApiErrorCode): number {
  return ERROR_STATUS_MAP[errorCode];
}
