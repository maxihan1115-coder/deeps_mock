'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'lucide-react';

interface PlatformLinkStatusProps {
  gameUuid: number;
}

export default function PlatformLinkStatus({ gameUuid }: PlatformLinkStatusProps) {
  const [isLinked, setIsLinked] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 플랫폼 연동 상태 확인
  const checkPlatformLinkStatus = async () => {
    try {
      const response = await fetch(`/api/platform-link/status?gameUuid=${gameUuid}`);
      const data = await response.json();

      if (data.success) {
        setIsLinked(data.payload?.isLinked || false);
      } else {
        setIsLinked(false);
      }
    } catch (error) {
      console.error('플랫폼 연동 상태 확인 실패:', error);
      setIsLinked(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkPlatformLinkStatus();

    // 주기적으로 상태 확인 (1분마다)
    const interval = setInterval(checkPlatformLinkStatus, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameUuid]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
        <span className="ml-2 text-sm text-gray-600">연동 상태 확인 중...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center gap-2">
        <Link className="w-4 h-4" />
        <span className="text-sm font-medium">플랫폼 연동:</span>
        <Badge
          variant={isLinked ? "default" : "secondary"}
          className={isLinked ? "bg-green-500" : "bg-gray-400"}
        >
          {isLinked ? "연동됨" : "미연동"}
        </Badge>
      </div>
    </div>
  );
}
