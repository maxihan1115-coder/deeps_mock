'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Check, X } from 'lucide-react';

interface AttendanceCheckProps {
  userId: string;
}

interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  createdAt: string;
}

export default function AttendanceCheck({ userId }: AttendanceCheckProps) {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todayAttended, setTodayAttended] = useState(false);

  // 이번 주 날짜들 생성
  const getWeekDates = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // 일요일부터 시작
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  // 출석 기록 조회
  const fetchAttendanceRecords = async () => {
    try {
      const response = await fetch(`/api/attendance?userId=${userId}`);
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

  // 출석체크
  const checkAttendance = async () => {
    try {
      const response = await fetch('/api/attendance/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
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

  // 날짜가 출석했는지 확인
  const isDateAttended = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return attendanceRecords.some(record => record.date === dateString);
  };

  // 날짜가 오늘인지 확인
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // 요일 이름 가져오기
  const getDayName = (date: Date) => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[date.getDay()];
  };

  useEffect(() => {
    if (userId) {
      fetchAttendanceRecords();
    }
  }, [userId]);

  const weekDates = getWeekDates();

  if (isLoading) {
    return (
      <Card className="w-80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
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
    <Card className="w-80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          출석체크
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 이번 주 출석 현황 */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">이번 주 출석</span>
            <Badge variant="outline" className="text-xs">
              {attendanceRecords.filter(record => {
                const recordDate = new Date(record.date);
                const startOfWeek = new Date();
                startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                return recordDate >= startOfWeek && recordDate <= endOfWeek;
              }).length}/7일
            </Badge>
          </div>
          
          {/* 요일별 출석 표시 - 컴팩트 버전 */}
          <div className="grid grid-cols-7 gap-0.5">
            {weekDates.map((date, index) => {
              const attended = isDateAttended(date);
              const isTodayDate = isToday(date);
              
              return (
                <div
                  key={index}
                  className={`flex flex-col items-center p-1 rounded text-xs ${
                    isTodayDate 
                      ? 'bg-blue-100 border border-blue-300' 
                      : attended 
                        ? 'bg-green-100' 
                        : 'bg-gray-100'
                  }`}
                >
                  <span className="text-xs font-medium text-gray-600">
                    {getDayName(date)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {date.getDate()}
                  </span>
                  <div className="mt-0.5">
                    {attended ? (
                      <Check className="w-2.5 h-2.5 text-green-600" />
                    ) : (
                      <X className="w-2.5 h-2.5 text-gray-400" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 오늘 출석체크 버튼 */}
        <div>
          {todayAttended ? (
            <div className="text-center p-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-green-700">
                <Check className="w-3 h-3" />
                <span className="text-sm font-medium">오늘 출석 완료!</span>
              </div>
            </div>
          ) : (
            <Button
              onClick={checkAttendance}
              className="w-full"
              variant="default"
              size="sm"
            >
              <Calendar className="w-3 h-3 mr-1" />
              오늘 출석하기
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
