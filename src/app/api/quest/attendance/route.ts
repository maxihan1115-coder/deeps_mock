import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuthToken, AuthenticatedTokenRequest } from '@/lib/auth-token';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';

async function handleAttendanceCheck(request: AuthenticatedTokenRequest) {
  try {
    console.log('Attendance check API called');
    
    const { attendanceDate } = await request.json();
    const gameUuid = request.gameUuid;
    console.log('Game UUID from JWT token:', gameUuid, 'Attendance date:', attendanceDate);

    // attendanceDate 검증
    if (!attendanceDate) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_QUEST,
        '출석 체크 대상 날짜가 필요합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_QUEST) }
      );
    }

    // 날짜 형식 검증 (YYYYMMDD)
    const dateRegex = /^\d{8}$/;
    if (!dateRegex.test(attendanceDate)) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_QUEST,
        '잘못된 날짜 형식입니다. (YYYYMMDD 형식으로 입력해주세요)'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_QUEST) }
      );
    }

    // 사용자 존재 여부 확인
    console.log('Looking for user with UUID:', gameUuid);
    const user = await prisma.user.findUnique({
      where: { uuid: gameUuid },
    });
    console.log('Found user:', user ? 'Yes' : 'No');

    if (!user) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '존재하지 않는 유저'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

    // 출석 기록 조회
    const attendanceRecord = await prisma.attendanceRecord.findFirst({
      where: {
        userId: user.id,
        date: attendanceDate,
      },
    });

    const isAttended = !!attendanceRecord;

    console.log('Attendance check completed for user:', user.uuid, 'Date:', attendanceDate, 'Attended:', isAttended);

    // 성공 응답
    const successResponse = createSuccessResponse(isAttended);
    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('Attendance check error:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    const errorResponse = createErrorResponse(
      API_ERROR_CODES.SERVICE_UNAVAILABLE,
      '출석 여부 조회 중 오류가 발생했습니다.'
    );
    return NextResponse.json(
      errorResponse,
      { status: getErrorStatusCode(API_ERROR_CODES.SERVICE_UNAVAILABLE) }
    );
  }
}

// JWT Auth token 검증과 함께 핸들러 실행
export const POST = withAuthToken(handleAttendanceCheck);
