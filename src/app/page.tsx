'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/LoginForm';

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // 로그인 상태 확인
  useEffect(() => {
    // URL 파라미터에서 사용자 정보 확인
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const username = urlParams.get('username');
    const uuid = urlParams.get('uuid');

    if (userId && username && uuid) {
      // 이미 로그인된 상태면 게임 페이지로 리다이렉트
      router.push(`/game?userId=${userId}&username=${username}&uuid=${uuid}`);
    } else {
      setIsLoading(false);
    }
  }, [router]);

  const handleLogin = (user: { id: string; username: string; uuid: number }) => {
    // LoginForm에서 이미 페이지 이동을 처리하므로 여기서는 추가 처리만
    console.log('로그인 성공:', user);
    // 필요한 경우 추가 로직을 여기에 구현
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return <LoginForm onLogin={handleLogin} />;
}
