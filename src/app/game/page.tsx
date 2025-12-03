'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAccount, useDisconnect } from 'wagmi';
import TetrisGame from '@/components/TetrisGame';
import QuestPanel from '@/components/QuestPanel';
import AccountLink from '@/components/AccountLink';
import AttendanceCheck from '@/components/AttendanceCheck';
import HighScoreDisplay from '@/components/HighScoreDisplay';
import RankingList from '@/components/RankingList';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LogOut, User, Gamepad2, Trophy, Link, Calendar, Award, ShoppingBag, CreditCard, Receipt } from 'lucide-react';
import CurrencyDisplay from '@/components/CurrencyDisplay';
import { ThemeToggle } from '@/components/ThemeToggle';
import ShopModal from '@/components/ShopModal';
import USDCBalanceCard from '@/components/USDCBalanceCard';
import TopUpModal from '@/components/TopUpModal';
import WalletGuard from '@/components/WalletGuard';
import PurchaseHistoryModal from '@/components/PurchaseHistoryModal';
import ShopMenuCard from '@/components/ShopMenuCard';
import GoldPurchaseModal from '@/components/GoldPurchaseModal';
import DiamondPurchaseModal from '@/components/DiamondPurchaseModal';

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
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username: string;
    uuid: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState("game");
  const [gameSubTab, setGameSubTab] = useState("tetris");
  const [gameState, setGameState] = useState<{ score: number; level: number; lines: number; nextBlock: { shape: number[][]; color: string } | null } | null>(null);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showGoldShop, setShowGoldShop] = useState(false);
  const [showDiamondShop, setShowDiamondShop] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false);

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
  const handleLogout = async () => {
    try {
      // 1. ⭐️ wagmi 브라우저 세션만 해제 (DB는 유지)
      //    사용자가 명시적으로 해제하지 않았으므로 다음 로그인 시 지갑 정보 유지
      if (isConnected) {
        await disconnect();
      }

      // 2. 로컬 스토리지 정리
      try {
        localStorage.removeItem('userInfo');
      } catch { }

      // 3. 상태 초기화
      setCurrentUser(null);

      // 4. 홈으로 이동
      router.push('/');
    } catch (error) {
      console.error('로그아웃 중 오류:', error);
      // 에러가 있어도 로그아웃 진행
      router.push('/');
    }
  };

  // 점수 업데이트 (사용하지 않음)
  const handleScoreUpdate = useCallback(() => { }, []);

  // 레벨 업데이트 (사용하지 않음)
  const handleLevelUpdate = useCallback(() => { }, []);

  // 라인 업데이트 (사용하지 않음)
  const handleLinesUpdate = useCallback(() => { }, []);

  // 게임 오버 처리
  const handleGameOver = useCallback(() => {
    // 게임 오버 시 필요한 로직 추가 가능
  }, []);

  // 하이스코어 업데이트 핸들러
  const handleHighScoreUpdate = useCallback((score: number, level: number, lines: number) => {
    console.log('하이스코어 업데이트:', { score, level, lines });
    // HighScoreDisplay 컴포넌트를 강제로 리렌더링하기 위해
    // 상태를 업데이트하거나 다른 방법을 사용할 수 있습니다
  }, []);

  // 게임 상태 변경 핸들러
  const handleGameStateChange = useCallback((newGameState: { score: number; level: number; lines: number; nextBlock: { shape: number[][]; color: string } | null }, newIsGameStarted: boolean) => {
    setGameState(newGameState);
    setIsGameStarted(newIsGameStarted);
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
    <div className="min-h-screen bg-gray-50 dark:bg-black transition-colors duration-300">
      <WalletGuard gameUuid={currentUser.uuid} />
      {/* 헤더 */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                BORA TETRIS
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{currentUser.username}</span>
              </div>

              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs font-mono text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700">
                  UUID: {currentUser.uuid}
                </Badge>
              </div>

              {/* 재화 표시 */}
              <CurrencyDisplay gameUuid={currentUser.uuid} />

              <ThemeToggle />

              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 lg:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 lg:mb-8 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl transition-colors duration-300">
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
            {/* 게임 하위 탭 */}
            <Tabs value={gameSubTab} onValueChange={setGameSubTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="tetris" className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" />
                  TETRIS
                </TabsTrigger>
                <TabsTrigger value="ranking" className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  시즌 랭킹
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tetris" className="space-y-0">
                {/* 모바일 전용 버튼들 - 테트리스 텍스트 위에 위치 */}
                <div className="block lg:hidden mb-4">
                  <div className="flex gap-2 justify-center">
                    {/* 출석체크 모달 */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          출석체크
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm mx-auto">
                        <DialogHeader>
                          <DialogTitle>출석체크</DialogTitle>
                        </DialogHeader>
                        <AttendanceCheck
                          userId={currentUser.id}
                          gameUuid={currentUser.uuid}
                        />
                      </DialogContent>
                    </Dialog>

                    {/* 최고 점수 모달 */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <Award className="w-4 h-4" />
                          최고점수
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm mx-auto">
                        <DialogHeader>
                          <DialogTitle>최고 점수</DialogTitle>
                        </DialogHeader>
                        <HighScoreDisplay
                          gameUuid={currentUser.uuid}
                        />
                      </DialogContent>
                    </Dialog>

                  </div>
                </div>


                {/* 모바일 게임정보 영역 - 작은 다음블록 UI */}
                {isGameStarted && gameState && (
                  <div className="block lg:hidden mb-4">
                    <div className="flex items-center justify-center p-1.5 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <div className="text-center text-xs">
                          <div className="text-gray-600">점수: <span className="font-bold text-gray-900">{gameState.score?.toLocaleString() || 0}</span></div>
                          <div className="text-gray-600">레벨: <span className="font-bold text-gray-900">{gameState.level || 1}</span> | 라인: <span className="font-bold text-gray-900">{gameState.lines || 0}</span></div>
                        </div>
                        <div className="border-l border-gray-300 pl-2">
                          <div className="text-xs text-gray-600 text-center">다음</div>
                          {gameState.nextBlock && (
                            <div className="flex justify-center">
                              <div className="grid" style={{
                                gridTemplateColumns: `repeat(${Math.max(...gameState.nextBlock.shape.map((row: number[]) => row.length))}, 12px)`,
                                gridTemplateRows: `repeat(${gameState.nextBlock.shape.length}, 12px)`,
                                gap: 0
                              }}>
                                {gameState.nextBlock.shape.map((row: number[], y: number) =>
                                  row.map((cell: number, x: number) => (
                                    <div
                                      key={`${y}-${x}`}
                                      className="w-3 h-3 border border-gray-300"
                                      style={{
                                        backgroundColor: cell ? gameState.nextBlock?.color || 'transparent' : 'transparent'
                                      }}
                                    />
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}


                {/* 모바일 상점 메뉴 (lg 이하에서만 표시) */}
                <div className="lg:hidden mb-4">
                  <ShopMenuCard
                    gameUuid={currentUser.uuid}
                    onOpenShop={() => setShowShopModal(true)}
                    onOpenGoldShop={() => setShowGoldShop(true)}
                    onOpenDiamondShop={() => setShowDiamondShop(true)}
                    onOpenTopUp={() => setShowTopUpModal(true)}
                    onOpenPurchaseHistory={() => setShowPurchaseHistory(true)}
                  />
                </div>

                {/* 게임 영역 - 3열 레이아웃 */}
                <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 lg:justify-center lg:items-start">
                  {/* 왼쪽 사이드바 - 상점 & 결제 */}
                  <div className="hidden lg:flex lg:flex-col lg:gap-6 flex-shrink-0 w-full lg:w-80 lg:min-w-80">
                    <ShopMenuCard
                      gameUuid={currentUser.uuid}
                      onOpenShop={() => setShowShopModal(true)}
                      onOpenGoldShop={() => setShowGoldShop(true)}
                      onOpenDiamondShop={() => setShowDiamondShop(true)}
                      onOpenTopUp={() => setShowTopUpModal(true)}
                      onOpenPurchaseHistory={() => setShowPurchaseHistory(true)}
                    />
                  </div>

                  {/* 게임 영역 - 중앙 */}
                  <div className="flex-shrink-0 w-full lg:w-auto flex justify-center">
                    <TetrisGame
                      userId={currentUser.uuid}
                      onScoreUpdate={handleScoreUpdate}
                      onLevelUpdate={handleLevelUpdate}
                      onLinesUpdate={handleLinesUpdate}
                      onGameOver={handleGameOver}
                      onHighScoreUpdate={handleHighScoreUpdate}
                      onGameStateChange={handleGameStateChange}
                    />
                  </div>

                  {/* 오른쪽 사이드바 - 게임 정보 */}
                  <div className="hidden lg:flex lg:flex-col lg:gap-6 flex-shrink-0 w-full lg:w-80 lg:min-w-80">
                    {/* 출석체크 */}
                    <AttendanceCheck
                      userId={currentUser.id}
                      gameUuid={currentUser.uuid}
                    />

                    {/* 최고 점수 */}
                    <HighScoreDisplay
                      gameUuid={currentUser.uuid}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ranking" className="space-y-0">
                <div className="flex justify-center">
                  <RankingList currentUserId={currentUser?.uuid} />
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="quests" className="space-y-0">
            <div className="flex justify-center">
              <div className="w-full max-w-4xl">
                <QuestPanel
                  userId={currentUser.id}
                  gameUuid={currentUser.uuid}
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

      {/* 상점 모달 */}
      <ShopModal
        isOpen={showShopModal}
        onClose={() => setShowShopModal(false)}
        gameUuid={currentUser?.uuid || 0}
        onPurchaseSuccess={() => {
          // 재화 잔액 업데이트
          if (typeof (window as unknown as { updateCurrencyBalance?: () => void }).updateCurrencyBalance === 'function') {
            (window as unknown as { updateCurrencyBalance: () => void }).updateCurrencyBalance();
          }
        }}
      />

      {/* 충전 모달 */}
      <TopUpModal
        isOpen={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        gameUuid={currentUser?.uuid || 0}
      />

      {/* 구매 내역 모달 */}
      <PurchaseHistoryModal
        isOpen={showPurchaseHistory}
        onClose={() => setShowPurchaseHistory(false)}
        gameUuid={currentUser?.uuid || 0}
      />

      {/* 골드 상점 모달 */}
      <GoldPurchaseModal
        isOpen={showGoldShop}
        onClose={() => setShowGoldShop(false)}
        gameUuid={currentUser?.uuid || 0}
      />

      {/* 다이아 상점 모달 */}
      <DiamondPurchaseModal
        isOpen={showDiamondShop}
        onClose={() => setShowDiamondShop(false)}
        gameUuid={currentUser?.uuid || 0}
      />
    </div>
  );
}
