'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

interface AttendanceCheckProps {
  userId: string;
  gameUuid: number;  // 플랫폼 연동 상태 확인용
}

interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  createdAt: string;
}

export default function AttendanceCheck({ userId, gameUuid }: AttendanceCheckProps) {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todayAttended, setTodayAttended] = useState(false);
  
  // 플랫폼 연동 관련 상태
  const [isLinked, setIsLinked] = useState(false);
  const [linkedDate, setLinkedDate] = useState<string | null>(null);
  const [platformCheckLoading, setPlatformCheckLoading] = useState(true);

  // 플랫폼 연동 상태 확인 (platform-link/status로만 확인)
  const checkPlatformLinkStatus = async () => {
    try {
      setPlatformCheckLoading(true);
      // platform-link/status로 연동 여부와 startDate 확인
      const statusResponse = await fetch(`/api/platform-link/status?gameUuid=${gameUuid}`);
      const statusData = await statusResponse.json();

      if (statusData.success && statusData.payload?.isLinked) {
        setIsLinked(true);
        if (statusData.payload.startDate) {
          const linkDate = new Date(statusData.payload.startDate).toISOString().split('T')[0];
          setLinkedDate(linkDate);
          console.log('📅 플랫폼 연동 시작 날짜(startDate):', linkDate);
        } else {
          const today = new Date().toISOString().split('T')[0];
          setLinkedDate(today);
          console.log('📅 startDate 없음, 오늘로 설정:', today);
        }
      } else {
        setIsLinked(false);
        setLinkedDate(null);
        console.log('❌ 플랫폼 미연동 상태 (status 기준)');
      }
    } catch (error) {
      console.error('플랫폼 연동 상태 확인 실패:', error);
      setIsLinked(false);
      setLinkedDate(null);
    } finally {
      setPlatformCheckLoading(false);
    }
  };

  // 날짜가 출석 가능한지 확인 (플랫폼 연동 날짜 이후)
  const isDateAvailableForAttendance = (date: Date) => {
    if (!isLinked || !linkedDate) return false;
    
    const dateString = date.toISOString().split('T')[0];
    return dateString >= linkedDate;
  };


  // 출석 기록 조회
  const fetchAttendanceRecords = async () => {
    try {
      const response = await fetch(`/api/attendance?gameUuid=${gameUuid}`);
      const data = await response.json();
      
      if (data.success) {
        setAttendanceRecords(data.payload);
        
        // 오늘 출석 여부 확인
        const today = new Date().toISOString().split('T')[0];
        const todayRecord = data.payload.find((record: AttendanceRecord) => record.date === today);
        setTodayAttended(!!todayRecord);
      }
    } catch (error) {
      console.error('Failed to fetch attendance records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 연속 출석일 계산
  const calculateConsecutiveDays = (records: AttendanceRecord[]): number => {
    if (records.length === 0) return 0;
    
    // 최신 날짜부터 정렬 (내림차순)
    const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
    
    let consecutive = 0;
    const today = new Date();
    
    // 오늘 날짜를 YYYY-MM-DD 형식으로 변환
    const todayStr = today.toISOString().split('T')[0];
    
    // 오늘 출석했는지 확인
    const hasTodayAttendance = sorted.some(record => record.date === todayStr);
    if (!hasTodayAttendance) {
      // 오늘 출석하지 않았으면 연속 출석은 0
      return 0;
    }
    
    consecutive = 1; // 오늘 출석했으므로 1부터 시작
    
    // 어제부터 역순으로 연속 출석 확인
    const checkDate = new Date(today);
    for (let i = 1; i < sorted.length; i++) {
      checkDate.setDate(checkDate.getDate() - 1);
      const expectedDateStr = checkDate.toISOString().split('T')[0];
      
      // 해당 날짜에 출석 기록이 있는지 확인
      const hasAttendanceOnDate = sorted.some(record => record.date === expectedDateStr);
      
      if (hasAttendanceOnDate) {
        // 연속 출석
        consecutive++;
      } else {
        // 연속이 끊어짐
        break;
      }
    }
    
    return consecutive;
  };

  // 출석체크
  const checkAttendance = async () => {
    try {
      const response = await fetch('/api/attendance/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gameUuid }),
      });

      const data = await response.json();
      
      if (data.success) {
        setTodayAttended(true);
        fetchAttendanceRecords(); // 목록 새로고침
      }
    } catch (error) {
      console.error('Failed to check attendance:', error);
    }
  };



  useEffect(() => {
    if (userId && gameUuid) {
      // 플랫폼 연동 상태를 먼저 확인
      checkPlatformLinkStatus().then(() => {
        // 연동 상태 확인 후 출석 기록 조회
        fetchAttendanceRecords();
      });
    }
  }, [userId, gameUuid]);


  // 플랫폼 미연동 상태 UI
  if (!platformCheckLoading && !isLinked) {
    return (
      <Card className="w-80 lg:w-80 min-w-80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
            출석체크
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
              <div className="w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-white" />
              </div>
              <span className="text-sm font-medium">출석체크</span>
            </div>
            <p className="text-xs text-gray-500">
              플랫폼 연동 후 출석체크가 활성화됩니다.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || platformCheckLoading) {
    return (
      <Card className="w-80 lg:w-80 min-w-80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
            출석체크
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mx-auto mb-2"></div>
            로딩 중...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-80 lg:w-80 min-w-80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
          출석체크
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 연속 출석 현황 */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">연속 출석</span>
            <Badge 
              variant={calculateConsecutiveDays(attendanceRecords) >= 7 ? "default" : "outline"} 
              className={`text-xs ${
                calculateConsecutiveDays(attendanceRecords) >= 7 
                  ? 'bg-green-600 text-white' 
                  : calculateConsecutiveDays(attendanceRecords) > 0 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600'
              }`}
            >
              {calculateConsecutiveDays(attendanceRecords)}일 연속
            </Badge>
          </div>
          
          {/* 연속 출석 진행도 */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600">
              <span>7일 연속 출석 목표</span>
              <span>{calculateConsecutiveDays(attendanceRecords)}/7</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  calculateConsecutiveDays(attendanceRecords) >= 7 
                    ? 'bg-green-500' 
                    : 'bg-blue-500'
                }`}
                style={{ 
                  width: `${Math.min((calculateConsecutiveDays(attendanceRecords) / 7) * 100, 100)}%` 
                }}
              ></div>
            </div>
          </div>
          
        </div>

        {/* 오늘 출석체크 버튼 */}
        <div>
          {(() => {
            const today = new Date();
            const todayAvailable = isDateAvailableForAttendance(today);
            const consecutiveDays = calculateConsecutiveDays(attendanceRecords);
            
            if (todayAttended) {
              return (
                <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-green-700 mb-1">
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">오늘 출석 완료!</span>
                  </div>
                  <div className="text-xs text-green-600">
                    {consecutiveDays >= 7 
                      ? '🎉 7일 연속 출석 달성!' 
                      : `${consecutiveDays}일 연속 출석 중`
                    }
                  </div>
                </div>
              );
            } else if (!todayAvailable) {
              return (
                <div className="text-center p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-yellow-700">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center">
                      <X className="w-2 h-2 text-white" />
                    </div>
                    <span className="text-sm font-medium">
                      {linkedDate ? 
                        `${linkedDate} 이후 출석 가능` : 
                        '출석 불가능한 날짜'
                      }
                    </span>
                  </div>
                  <p className="text-xs text-yellow-600 mt-1">
                    플랫폼 연동 날짜부터 출석체크가 가능합니다
                  </p>
                </div>
              );
            } else {
              const nextConsecutive = consecutiveDays + 1;
              return (
                <div className="space-y-2">
                  <Button
                    onClick={checkAttendance}
                    className="w-full"
                    variant="default"
                    size="sm"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    오늘 출석하기
                  </Button>
                  <div className="text-center text-xs text-gray-600">
                    {consecutiveDays > 0 
                      ? `출석하면 ${nextConsecutive}일 연속!`
                      : '출석하면 연속 출석 시작!'
                    }
                  </div>
                </div>
              );
            }
          })()}
        </div>
      </CardContent>
    </Card>
  );
}
