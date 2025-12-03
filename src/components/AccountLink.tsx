'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Link, ExternalLink, Copy, Check } from 'lucide-react';

import { useDisconnect } from 'wagmi';

interface AccountLinkProps {
  userUuid: number;
  username: string;
}

export default function AccountLink({ userUuid, username }: AccountLinkProps) {
  const router = useRouter();
  // const { disconnect } = useDisconnect();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        console.error('❌ API Error:', data.error);
        setError(data.error || 'Failed to request temporary code.');
      }
    } catch (error) {
      console.error('❌ Request code error:', error);
      setError('An error occurred while requesting the code.');
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
      setError('Failed to copy link.');
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
  const withdrawAccount = async () => {
    console.log('🚪 BORA TETRIS 탈퇴 시작 - UUID:', userUuid);
    setIsDisconnecting(true);
    setError('');
    setSuccessMessage('');

    try {
      const resp = await fetch('/api/account/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid: userUuid })
      });
      const data = await resp.json();
      console.log('📡 탈퇴 응답:', data);
      if (data?.success === true && data?.payload === true) {
        try { localStorage.removeItem('userInfo'); } catch { }
        router.push('/');
        return;
      }
      setError(data?.error || 'Failed to unlink account.');
    } catch (e) {
      console.error('❌ Unlink error:', e);
      setError('An error occurred while unlinking.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <Card className="w-full bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
          <Link className="w-5 h-5 text-slate-400" />
          Platform Link
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-400">Username:</span>
            <span className="text-sm font-semibold text-white">{username}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-400">UUID:</span>
            <Badge variant="outline" className="text-xs font-mono bg-slate-800 text-slate-400 border-slate-700">
              {userUuid}
            </Badge>
          </div>
        </div>

        {/* 연동 상태 표시 */}
        {isLinked === null ? (
          <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-slate-400">Checking status...</span>
            </div>
          </div>
        ) : isLinked ? (
          <div className="space-y-3">
            <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-slate-200">Platform Linked</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Successfully linked with BORA Platform.
              </p>
              {linkDate && (
                <div className="mt-2 p-2 bg-slate-900 rounded border border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-400">📅 Linked Date:</span>
                    <span className="text-xs text-slate-500">
                      {new Date(linkDate).toLocaleDateString()} {new Date(linkDate).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  disabled={isDisconnecting}
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  variant="outline"
                >
                  {isDisconnecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    'Unlink Account'
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Unlink Account</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Are you sure you want to unlink?</p>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <p className="text-xs text-gray-700 dark:text-gray-300">
                      ⚠️ Unlinking will remove all game data (including quests) except UUID.
                    </p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Cancel
                      </Button>
                    </DialogTrigger>
                    <Button
                      onClick={withdrawAccount}
                      disabled={isDisconnecting}
                      variant="destructive"
                      size="sm"
                    >
                      {isDisconnecting ? 'Processing...' : 'Confirm Unlink'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : !requestCode ? (
          <div className="space-y-3">
            <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                <span className="text-sm font-medium text-slate-300">Not Linked</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Link your account to save quest progress and receive rewards.
              </p>
            </div>

            <Button
              onClick={requestTempCode}
              disabled={isLoading}
              className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
              variant="outline"
            >
              {isLoading ? 'Requesting Code...' : 'Start Linking'}
            </Button>
            {isLoading && (
              <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                <p className="text-sm text-slate-200 font-medium">Generating link code...</p>
                <p className="text-xs text-slate-400 mt-1">
                  Please wait a moment.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
              <p className="text-sm text-slate-200 font-medium">Temporary Code Generated!</p>
              <p className="text-xs text-slate-400 mt-1">
                This code expires in 15 minutes.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-300">Link URL:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyLink}
                  className="h-6 px-2 border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>

              <div className="p-2 bg-slate-900 border border-slate-700 rounded text-xs font-mono break-all text-slate-400">
                https://www.boradeeps.cc/?requestCode={requestCode}
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={openExternalLink}
                className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
                variant="outline"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in Browser
              </Button>

              {/* 디버깅용 정보 표시 */}
              <div className="text-xs text-slate-500 p-2 bg-slate-900 rounded border border-slate-800">
                🔍 Debug: requestCode = {requestCode ? '✅ Set' : '❌ null'}, isLinked = {isLinked === null ? '🔄 Checking' : isLinked ? '✅ Linked' : '❌ Unlinked'}
              </div>

              <Button
                onClick={() => {
                  console.log('🔄 Request new code');
                  setRequestCode(null);
                }}
                className="w-full text-slate-500"
                variant="ghost"
                size="sm"
              >
                Request New Code
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
          <p>• Temporary code is valid for 15 minutes.</p>
          <p>• Linking completes after logging in via external browser.</p>
          <p>• Platform features will be available after linking.</p>
        </div>
      </CardContent>
    </Card>
  );
}
