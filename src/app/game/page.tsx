'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TetrisGame from '@/components/TetrisGame';
import QuestPanel from '@/components/QuestPanel';
import AccountLink from '@/components/AccountLink';
import AttendanceCheck from '@/components/AttendanceCheck';
import HighScoreDisplay from '@/components/HighScoreDisplay';
import HighScoreRanking from '@/components/HighScoreRanking';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, User, Gamepad2, Trophy, Link } from 'lucide-react';

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <GamePageContent />
    </Suspense>
  );
}

function GamePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username: string;
    uuid: number;
  } | null>(null);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentLines, setCurrentLines] = useState(0);
  const [activeTab, setActiveTab] = useState("game");

  // URL 파라미터에서 사용자 정보 확인
  useEffect(() => {
    const userId = searchParams.get('userId');
    const username = searchParams.get('username');
    const uuid = searchParams.get('uuid');

    if (userId && username && uuid) {
      setCurrentUser({
        id: userId,
        username,
        uuid: parseInt(uuid, 10),
      });
    } else {
      router.push('/');
    }
  }, [searchParams, router]);

  // 로그아웃
  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentScore(0);
    router.push('/');
  };

  // 점수 업데이트
  const handleScoreUpdate = useCallback((score: number) => {
    setCurrentScore(score);
  }, []);

  // 레벨 업데이트
  const handleLevelUpdate = useCallback((level: number) => {
    setCurrentLevel(level);
  }, []);

  // 라인 업데이트
  const handleLinesUpdate = useCallback((lines: number) => {
    setCurrentLines(lines);
  }, []);

  // 게임 오버 처리
  const handleGameOver = useCallback(() => {
    // 게임 오버 시 필요한 로직 추가 가능
  }, []);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                BORA TETRIS
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">{currentUser.username}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs font-mono">
                  UUID: {currentUser.uuid}
                </Badge>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 lg:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 lg:mb-8 bg-gray-100 p-1 rounded-xl">
            <TabsTrigger 
              value="game" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 hover:scale-105 rounded-lg font-medium"
            >
              <Gamepad2 className="w-4 h-4" />
              게임
            </TabsTrigger>
            <TabsTrigger 
              value="quests" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 hover:scale-105 rounded-lg font-medium"
            >
              <Trophy className="w-4 h-4" />
              퀘스트
            </TabsTrigger>
            <TabsTrigger 
              value="platform" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 hover:scale-105 rounded-lg font-medium"
            >
              <Link className="w-4 h-4" />
              플랫폼 연동
            </TabsTrigger>
          </TabsList>

          <TabsContent value="game" className="space-y-0">
            {/* 모바일 우선 반응형 레이아웃 */}
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 lg:justify-center lg:items-start">
              {/* 게임 영역 */}
              <div className="flex-shrink-0 w-full lg:w-auto flex justify-center">
                <TetrisGame
                  userId={currentUser.uuid}
                  userStringId={currentUser.id}
                  onScoreUpdate={handleScoreUpdate}
                  onLevelUpdate={handleLevelUpdate}
                  onLinesUpdate={handleLinesUpdate}
                  onGameOver={handleGameOver}
                />
              </div>

              {/* 사이드바 - 모바일에서는 하단, 데스크톱에서는 우측 */}
              <div className="flex flex-col gap-4 lg:gap-6 w-full lg:w-auto">
                {/* 모바일에서는 가로 스크롤 카드 레이아웃 */}
                <div className="block lg:hidden">
                  <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
                    {/* 출석체크 */}
                    <div className="flex-shrink-0 snap-start">
                      <AttendanceCheck 
                        userId={currentUser.id} 
                        gameUuid={currentUser.uuid} 
                        onNavigateToLinking={() => setActiveTab("platform")}
                      />
                    </div>

                    {/* 최고 점수 */}
                    <div className="flex-shrink-0 snap-start">
                      <HighScoreDisplay
                        userId={currentUser.id}
                        currentScore={currentScore}
                        currentLevel={currentLevel}
                        currentLines={currentLines}
                      />
                    </div>

                    {/* 랭킹 */}
                    <div className="flex-shrink-0 snap-start">
                      <HighScoreRanking currentUserId={currentUser.id} />
                    </div>
                  </div>
                </div>

                {/* 데스크톱에서는 세로 스택 레이아웃 */}
                <div className="hidden lg:flex lg:flex-col lg:gap-6">
                  {/* 출석체크 */}
                  <AttendanceCheck 
                    userId={currentUser.id} 
                    gameUuid={currentUser.uuid} 
                    onNavigateToLinking={() => setActiveTab("platform")}
                  />

                  {/* 최고 점수 */}
                  <HighScoreDisplay
                    userId={currentUser.id}
                    currentScore={currentScore}
                    currentLevel={currentLevel}
                    currentLines={currentLines}
                  />

                  {/* 랭킹 */}
                  <HighScoreRanking currentUserId={currentUser.id} />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="quests" className="space-y-0">
            <div className="flex justify-center">
              <div className="w-full max-w-4xl">
                <QuestPanel
                  userId={currentUser.id}
                  currentScore={currentScore}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="platform" className="space-y-0">
            <div className="flex justify-center">
              <div className="w-full max-w-4xl">
                <AccountLink
                  userUuid={currentUser.uuid}
                  username={currentUser.username}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
