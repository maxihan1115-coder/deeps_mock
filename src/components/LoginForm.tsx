'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Lock, Loader2 } from 'lucide-react';

interface LoginFormProps {
  onLogin?: (user: { id: string; username: string; uuid: number; walletAddress?: string | null }) => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginStatus, setLoginStatus] = useState<'idle' | 'loading' | 'preparing' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  // 토큰 준비 대기 함수
  const waitForToken = async (): Promise<string> => {
    let attempts = 0;
    const maxAttempts = 30; // 3초 대기 (100ms * 30)

    while (attempts < maxAttempts) {
      const userInfo = localStorage.getItem('userInfo');
      if (userInfo) {
        try {
          const parsed = JSON.parse(userInfo);
          if (parsed.id && parsed.username && parsed.uuid) {
            console.log('✅ 토큰 준비 완료:', parsed);
            return userInfo;
          }
        } catch (e) {
          console.warn('토큰 파싱 실패:', e);
        }
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    throw new Error('토큰 준비 시간 초과 (3초)');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setError('사용자명을 입력해주세요.');
      return;
    }

    setLoginStatus('loading');
    setError('');

    try {
      // 1. 로그인 API 호출
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        const user = data.payload.user as { id: string; username: string; uuid: number; walletAddress?: string | null };

        // 2. 사용자 정보를 localStorage에 저장
        try {
          localStorage.setItem('userInfo', JSON.stringify(user));
          console.log('💾 사용자 정보 저장 완료:', user);
        } catch (storageError) {
          console.error('localStorage 저장 실패:', storageError);
          throw new Error('브라우저 저장소 접근에 실패했습니다.');
        }

        // 3. 토큰 준비 상태로 변경
        setLoginStatus('preparing');

        // 4. 토큰이 준비될 때까지 대기
        await waitForToken();

        // 5. 토큰 준비 완료 후 로그인 성공 처리
        setLoginStatus('success');

        if (onLogin) {
          onLogin(user);
        }

        // 6. 잠시 후 게임 페이지로 이동 (사용자가 성공 메시지를 볼 수 있도록)
        setTimeout(() => {
          console.log('🚀 게임 페이지로 이동합니다...');
          window.location.href = `/game?userId=${user.id}&username=${encodeURIComponent(user.username)}&uuid=${user.uuid}`;
        }, 1500); // 1.5초로 증가하여 사용자가 성공 메시지를 충분히 볼 수 있도록

      } else {
        setError(data.error || '로그인에 실패했습니다.');
        setLoginStatus('error');
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.';
      setError(errorMessage);
      setLoginStatus('error');
    }
  };

  const getButtonText = () => {
    switch (loginStatus) {
      case 'loading':
        return '로그인 중...';
      case 'preparing':
        return '토큰 준비 중...';
      case 'success':
        return '로그인 성공!';
      default:
        return '로그인';
    }
  };

  const getButtonIcon = () => {
    switch (loginStatus) {
      case 'loading':
      case 'preparing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'success':
        return <span className="text-green-500">✓</span>;
      default:
        return null;
    }
  };

  const isButtonDisabled = loginStatus === 'loading' || loginStatus === 'preparing' || loginStatus === 'success';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <Card className="w-full max-w-md shadow-lg bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-center text-white">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username" className="text-slate-200">Username</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  id="username"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                  autoComplete="username"
                  disabled={isButtonDisabled}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-slate-200">Password (Optional)</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password (optional)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                  autoComplete="current-password"
                  disabled={isButtonDisabled}
                />
              </div>
            </div>

            {/* 상태별 메시지 표시 */}
            {loginStatus === 'preparing' && (
              <div className="text-blue-400 text-sm text-center p-2 bg-blue-900/20 rounded border border-blue-800">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span className="font-medium">Preparing token...</span>
                </div>
                <p className="text-xs text-blue-400/80 mt-1">Please wait a moment</p>
              </div>
            )}

            {loginStatus === 'success' && (
              <div className="text-green-400 text-sm text-center p-2 bg-green-900/20 rounded border border-green-800">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-green-400">✓</span>
                  <span className="font-medium">Login Successful!</span>
                </div>
                <p className="text-xs text-green-400/80">Redirecting to game...</p>
              </div>
            )}

            {error && (
              <div className="text-red-400 text-sm p-2 bg-red-900/20 border border-red-800 rounded">{error}</div>
            )}

            <Button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isButtonDisabled}
            >
              {getButtonIcon()}
              {getButtonText()}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
