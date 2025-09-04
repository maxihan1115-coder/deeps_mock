'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Link, ExternalLink, Copy, Check } from 'lucide-react';

interface AccountLinkProps {
  userUuid: number;
  username: string;
}

export default function AccountLink({ userUuid, username }: AccountLinkProps) {
  const [isLinked, setIsLinked] = useState(false);
  const [requestCode, setRequestCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [linkDate, setLinkDate] = useState<number | null>(null); // 연동일자 추가

  // requestCode 상태 변화 추적
  useEffect(() => {
    if (requestCode) {
      console.log('🎉 requestCode 상태 업데이트됨:', requestCode);
      console.log('🔄 UI가 외부 브라우저 열기 모드로 변경되어야 함');
    } else {
      console.log('❌ requestCode가 null 상태임');
    }
  }, [requestCode]);

  // 컴포넌트 마운트 시 연동 상태 확인
  useEffect(() => {
    console.log('🔍 AccountLink 컴포넌트 마운트 - 연동 상태 확인 시작');
    checkLinkStatus();
  }, []); // 빈 의존성 배열로 마운트 시에만 실행

  // 플랫폼 연동 상태 확인 (platform-link/status API 사용)
  const checkLinkStatus = async () => {
    try {
      console.log('🔍 플랫폼 연동 상태 확인 중 (platform-link/status API 기준)...');
      
      const response = await fetch(`/api/platform-link/status?gameUuid=${userUuid}`);
      const data = await response.json();
      
      console.log('📊 platform-link/status 응답:', data);
      
      if (data.success) {
        const { isLinked: linked, startDate } = data.payload;
        setIsLinked(linked);
        setLinkDate(startDate);
        
        if (linked) {
          console.log('🔗 연동 상태: 연동됨, 연동일자:', startDate);
        } else {
          console.log('🔗 연동 상태: 미연동');
        }
      } else {
        setIsLinked(false);
        setLinkDate(null);
        console.log('🔗 연동 상태: 미연동 (API 응답 실패)');
      }
    } catch (error) {
      console.error('❌ 연동 상태 확인 오류:', error);
      setIsLinked(false);
      setLinkDate(null);
    }
  };

  // 임시 코드 요청 (BORA 플랫폼 API 호출)
  const requestTempCode = async () => {
    console.log('🔑 플랫폼 연동 시작 - UUID:', userUuid);
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // 서버를 통해 BORA 플랫폼 API 호출
      const response = await fetch(`/api/account-link/request-code?uuid=${userUuid}`);
      const data = await response.json();
      
      console.log('📡 API 응답:', data);

      if (data.success) {
        const code = data.payload.code || data.payload;
        console.log('✅ 임시 코드 생성 성공:', code);
        setRequestCode(code);
        // 연동 코드 생성 후 주기적으로 연동 상태 확인
        const checkInterval = setInterval(async () => {
          console.log('🔄 연동 완료 확인 중...');
          await checkLinkStatus();
          if (isLinked) {
            console.log('🎉 플랫폼 연동이 완료되었습니다!');
            setRequestCode(null);
            clearInterval(checkInterval);
          }
        }, 5000); // 5초마다 확인
        
        // 10분 후 자동으로 확인 중지
        setTimeout(() => {
          clearInterval(checkInterval);
        }, 600000);
      } else {
        console.error('❌ API 에러:', data.error);
        setError(data.error || '임시 코드 요청에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ Request code error:', error);
      setError('임시 코드 요청 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 링크 복사
  const copyLink = async () => {
    if (!requestCode) return;

    const link = `https://www.boradeeps.cc/?requestCode=${requestCode}`;
    
    try {
      await navigator.clipboard.writeText(link);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      setError('링크 복사에 실패했습니다.');
    }
  };

  // 외부 브라우저에서 링크 열기
  const openExternalLink = () => {
    if (!requestCode) {
      console.error('❌ requestCode가 없어서 외부 링크를 열 수 없음');
      return;
    }

    const link = `https://www.boradeeps.cc/?requestCode=${requestCode}`;
    console.log('🌐 외부 브라우저에서 링크 열기:', link);
    window.open(link, '_blank');
  };

  // 플랫폼 연동 해제
  const disconnectPlatform = async () => {
    console.log('🔌 플랫폼 연동 해제 시작 - UUID:', userUuid);
    setIsDisconnecting(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/platform-link/unlink', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameUuid: userUuid,
        }),
      });

      const data = await response.json();
      console.log('📡 연동 해제 응답:', data);

      if (data.success) {
        console.log('✅ 플랫폼 연동 해제 성공');
        setIsLinked(false);
        setRequestCode(null); // 요청 코드 초기화
        setSuccessMessage('플랫폼 연동이 성공적으로 해제되었습니다.');
        // 상태 다시 확인
        await checkLinkStatus();
        // 3초 후 성공 메시지 제거
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        console.error('❌ 연동 해제 실패:', data.error);
        setError(data.error || '플랫폼 연동 해제에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ 연동 해제 오류:', error);
      setError('플랫폼 연동 해제 중 오류가 발생했습니다.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="w-5 h-5" />
          플랫폼 연동
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">사용자명:</span>
            <span className="text-sm font-semibold text-gray-900">{username}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">UUID:</span>
            <Badge variant="outline" className="text-xs font-mono bg-gray-50">
              {userUuid}
            </Badge>
          </div>
        </div>

        {/* 연동 상태 표시 */}
        {isLinked === null ? (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-600">연동 상태 확인 중...</span>
            </div>
          </div>
        ) : isLinked ? (
          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-800">플랫폼 연동 완료</span>
              </div>
              <p className="text-xs text-green-700 mt-1">
                현재 BORA 플랫폼과 성공적으로 연동되어 있습니다.
              </p>
              {linkDate && (
                <div className="mt-2 p-2 bg-green-100 rounded border border-green-300">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-green-800">📅 연동일자:</span>
                    <span className="text-xs text-green-700">
                      {new Date(linkDate).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long'
                      })} {new Date(linkDate).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  disabled={isDisconnecting}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                  variant="destructive"
                >
                  {isDisconnecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      연동 해제 중...
                    </>
                  ) : (
                    '🔌 플랫폼 연동 해제'
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>플랫폼 연동 해제</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    정말로 플랫폼 연동을 해제하시겠습니까?
                  </p>
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800">
                      ⚠️ 연동 해제 시 퀘스트 진행도가 더 이상 저장되지 않으며, 플랫폼 기능을 사용할 수 없습니다.
                    </p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        취소
                      </Button>
                    </DialogTrigger>
                    <Button
                      onClick={disconnectPlatform}
                      disabled={isDisconnecting}
                      variant="destructive"
                      size="sm"
                    >
                      {isDisconnecting ? '해제 중...' : '연동 해제'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : !requestCode ? (
          <div className="space-y-3">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm font-medium text-yellow-800">미연동 상태</span>
              </div>
              <p className="text-xs text-yellow-700 mt-1">
                플랫폼 연동을 통해 퀘스트 진행도를 저장하고 보상을 받으세요.
              </p>
            </div>
            
            <Button
              onClick={requestTempCode}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? '임시 코드 요청 중...' : '플랫폼 연동 시작'}
            </Button>
            {isLoading && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">연동 코드를 생성하고 있습니다...</p>
                <p className="text-xs text-blue-600 mt-1">
                  잠시만 기다려주세요.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-medium">임시 코드가 생성되었습니다!</p>
              <p className="text-xs text-green-600 mt-1">
                이 코드는 15분 후 만료됩니다.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">플랫폼 연동 링크:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyLink}
                  className="h-6 px-2"
                >
                  {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
              
              <div className="p-2 bg-gray-50 border rounded text-xs font-mono break-all">
                https://www.boradeeps.cc/?requestCode={requestCode}
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={openExternalLink}
                className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                variant="default"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                🚀 외부 브라우저에서 열기
              </Button>
              
              {/* 디버깅용 정보 표시 */}
              <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded border">
                🔍 Debug: requestCode = {requestCode ? '✅ 설정됨' : '❌ null'}, isLinked = {isLinked === null ? '🔄 확인중' : isLinked ? '✅ 연동됨' : '❌ 미연동'}
              </div>
              
              <Button
                onClick={() => {
                  console.log('🔄 새 코드 요청 - requestCode 초기화');
                  setRequestCode(null);
                }}
                className="w-full"
                variant="ghost"
                size="sm"
              >
                새 코드 요청
              </Button>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              {successMessage}
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              {error}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>• 임시 코드는 15분간 유효합니다</p>
          <p>• 외부 브라우저에서 플랫폼 로그인 후 연동이 완료됩니다</p>
          <p>• 연동 완료 후 게임에서 플랫폼 기능을 이용할 수 있습니다</p>
        </div>
      </CardContent>
    </Card>
  );
}
