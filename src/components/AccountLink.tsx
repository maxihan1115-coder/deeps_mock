'use client';

import React, { useState } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [requestCode, setRequestCode] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState('');

  // 임시 코드 요청
  const requestTempCode = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/account-link/request-code?uuid=${userUuid}`);
      const data = await response.json();

      if (data.success) {
        setRequestCode(data.payload.code);
      } else {
        setError(data.error || '임시 코드 요청에 실패했습니다.');
      }
    } catch (error) {
      console.error('Request code error:', error);
      setError('임시 코드 요청 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 링크 복사
  const copyLink = async () => {
    if (!requestCode) return;

    const link = `https://www.boradeeps.cc/?request_code=${requestCode}`;
    
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
    if (!requestCode) return;

    const link = `https://www.boradeeps.cc/?request_code=${requestCode}`;
    window.open(link, '_blank');
  };

  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="w-5 h-5" />
          계정 연동
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">사용자명:</span>
            <span className="text-sm">{username}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">UUID:</span>
            <Badge variant="outline" className="text-xs font-mono">
              {userUuid.toString().slice(0, 8)}...
            </Badge>
          </div>
        </div>

        {!requestCode ? (
          <Button
            onClick={requestTempCode}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? '임시 코드 요청 중...' : '계정 연동 시작'}
          </Button>
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
                <span className="text-sm font-medium">연동 링크:</span>
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
                https://www.boradeeps.cc/?request_code={requestCode}
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={openExternalLink}
                className="w-full"
                variant="outline"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                외부 브라우저에서 열기
              </Button>
              
              <Button
                onClick={() => setRequestCode(null)}
                className="w-full"
                variant="ghost"
                size="sm"
              >
                새 코드 요청
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
            {error}
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
