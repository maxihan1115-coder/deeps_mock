import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiAuth, AuthenticatedRequest } from '@/lib/api-auth';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  getErrorStatusCode,
  API_ERROR_CODES 
} from '@/lib/api-errors';

async function handleAttendanceCheck(request: AuthenticatedRequest) {
  try {
    console.log('Attendance check API called');
    
    const { uuid, attendanceDate } = await request.json();
    console.log('Received UUID:', uuid, 'Attendance date:', attendanceDate);

    // UUID 검증
    if (!uuid) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '게임 내 유저 고유 ID가 필요합니다.'
      );
      return NextResponse.json(
        errorResponse,
        { status: getErrorStatusCode(API_ERROR_CODES.INVALID_USER) }
      );
    }

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
    console.log('Looking for user with UUID:', uuid.toString());
    const user = await prisma.user.findUnique({
      where: { uuid: uuid.toString() },
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

    // 플랫폼 연동 상태 확인
    const platformLink = await prisma.platformLink.findUnique({
      where: { gameUuid: user.uuid },
    });

    if (!platformLink) {
      const errorResponse = createErrorResponse(
        API_ERROR_CODES.INVALID_USER,
        '미연동 유저'
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

// API 키 검증과 함께 핸들러 실행
export const POST = withApiAuth(handleAttendanceCheck);
