'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import TetrisGame from '@/components/TetrisGame';
import QuestPanel from '@/components/QuestPanel';
import AccountLink from '@/components/AccountLink';
import AttendanceCheck from '@/components/AttendanceCheck';
import HighScoreDisplay from '@/components/HighScoreDisplay';
import RankingList from '@/components/RankingList';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LogOut, User, Gamepad2, Trophy, Link, Calendar, Award, Home, Play, X } from 'lucide-react';
import CurrencyDisplay from '@/components/CurrencyDisplay';
import { ThemeToggle } from '@/components/ThemeToggle';
import ShopModal from '@/components/ShopModal';
// import USDCBalanceCard from '@/components/USDCBalanceCard';
import TopUpModal from '@/components/TopUpModal';
import WalletGuard from '@/components/WalletGuard';
import PurchaseHistoryModal from '@/components/PurchaseHistoryModal';
import ShopMenuCard from '@/components/ShopMenuCard';
import GoldPurchaseModal from '@/components/GoldPurchaseModal';
import DiamondPurchaseModal from '@/components/DiamondPurchaseModal';
import CurrencyExchangeModal from '@/components/CurrencyExchangeModal';
import LobbyBanner from '@/components/LobbyBanner';

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
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
  // const { isConnected } = useAccount();
  // const { disconnect } = useDisconnect();
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username: string;
    uuid: number;
  } | null>(null);

  // 탭 상태 (기본값: 로비)
  const [activeTab, setActiveTab] = useState("lobby");

  // 게임 모달 상태
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);

  // 게임 상태 (모달 밖에서도 일부 정보 표시용, 필요 시)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [gameState, setGameState] = useState<{ score: number; level: number; lines: number; nextBlock: { shape: number[][]; color: string } | null } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isGameStarted, setIsGameStarted] = useState(false);

  // 모달 상태들
  const [showShopModal, setShowShopModal] = useState(false);
  const [showGoldShop, setShowGoldShop] = useState(false);
  const [showDiamondShop, setShowDiamondShop] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showCurrencyExchange, setShowCurrencyExchange] = useState(false);
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
      // if (isConnected) {
      //   await disconnect();
      // }
      try {
        localStorage.removeItem('userInfo');
      } catch { }
      setCurrentUser(null);
      router.push('/');
    } catch (error) {
      console.error('로그아웃 중 오류:', error);
      router.push('/');
    }
  };

  // 핸들러들 (TetrisGame에 전달)
  const handleScoreUpdate = useCallback(() => { }, []);
  const handleLevelUpdate = useCallback(() => { }, []);
  const handleLinesUpdate = useCallback(() => { }, []);
  const handleGameOver = useCallback(() => { }, []);
  const handleHighScoreUpdate = useCallback((score: number, level: number, lines: number) => {
    console.log('하이스코어 업데이트:', { score, level, lines });
  }, []);
  const handleGameStateChange = useCallback((newGameState: { score: number; level: number; lines: number; nextBlock: { shape: number[][]; color: string } | null }, newIsGameStarted: boolean) => {
    setGameState(newGameState);
    setIsGameStarted(newIsGameStarted);
  }, []);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black transition-colors duration-300">
      <WalletGuard gameUuid={currentUser.uuid} />

      {/* 헤더 */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-[1800px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                <span>BORA TETRIS</span>
              </h1>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden md:flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{currentUser.username}</span>
              </div>

              <div className="hidden md:flex items-center space-x-2">
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
                className="border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 h-8 px-2 sm:px-3"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 레이아웃 (3단 구조) */}
      <main className="max-w-[1800px] mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">

        {/* [1] 왼쪽 사이드바 (고정) - 상점 메뉴 */}
        <aside className="hidden lg:flex flex-col gap-6 w-80 flex-shrink-0">
          <ShopMenuCard
            gameUuid={currentUser.uuid}
            onOpenShop={() => setShowShopModal(true)}
            onOpenGoldShop={() => setShowGoldShop(true)}
            onOpenDiamondShop={() => setShowDiamondShop(true)}
            onOpenTopUp={() => setShowTopUpModal(true)}
            onOpenCurrencyExchange={() => setShowCurrencyExchange(true)}
            onOpenPurchaseHistory={() => setShowPurchaseHistory(true)}
          />
        </aside>

        {/* [2] 중앙 컨텐츠 (가변) - 탭 영역 */}
        <section className="flex-1 min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* GNB (탭 리스트) */}
            <TabsList className="grid w-full grid-cols-4 mb-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-1 rounded-xl h-auto shadow-sm">
              <TabsTrigger value="lobby" className="py-3 flex flex-col sm:flex-row items-center gap-2 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 transition-all">
                <Home className="w-5 h-5" />
                <span className="font-medium">Lobby</span>
              </TabsTrigger>
              <TabsTrigger value="quests" className="py-3 flex flex-col sm:flex-row items-center gap-2 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 transition-all">
                <Trophy className="w-5 h-5" />
                <span className="font-medium">Quests</span>
              </TabsTrigger>
              <TabsTrigger value="ranking" className="py-3 flex flex-col sm:flex-row items-center gap-2 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 transition-all">
                <Award className="w-5 h-5" />
                <span className="font-medium">Ranking</span>
              </TabsTrigger>
              <TabsTrigger value="platform" className="py-3 flex flex-col sm:flex-row items-center gap-2 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 transition-all">
                <Link className="w-5 h-5" />
                <span className="font-medium">Platform</span>
              </TabsTrigger>
            </TabsList>

            {/* 탭 컨텐츠들 */}
            <TabsContent value="lobby" className="space-y-6 animate-in fade-in-50 duration-300">
              {/* 로비 배너 (캐러셀) */}
              <LobbyBanner
                onOpenDiamondShop={() => setShowDiamondShop(true)}
                onOpenShop={() => setShowShopModal(true)}
              />

              {/* 모바일 전용 UI (lg hidden) */}
              <div className="lg:hidden space-y-6">
                {/* GAME START 버튼 */}
                <Button
                  onClick={() => setIsGameModalOpen(true)}
                  className="w-full h-20 text-2xl font-black italic bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 hover:from-yellow-500 hover:via-orange-600 hover:to-red-600 text-white shadow-xl border-4 border-white/20 rounded-xl"
                >
                  <Play className="w-8 h-8 mr-2 fill-current" />
                  GAME START
                </Button>

                {/* 모바일용 사이드바 컨텐츠 노출 */}
                <div className="space-y-4">
                  <ShopMenuCard
                    gameUuid={currentUser.uuid}
                    onOpenShop={() => setShowShopModal(true)}
                    onOpenGoldShop={() => setShowGoldShop(true)}
                    onOpenDiamondShop={() => setShowDiamondShop(true)}
                    onOpenTopUp={() => setShowTopUpModal(true)}
                    onOpenCurrencyExchange={() => setShowCurrencyExchange(true)}
                    onOpenPurchaseHistory={() => setShowPurchaseHistory(true)}
                  />
                  <AttendanceCheck userId={currentUser.id} gameUuid={currentUser.uuid} />
                  <HighScoreDisplay gameUuid={currentUser.uuid} />
                </div>
              </div>

              {/* 로비 하단 정보 (데스크탑용) */}
              <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Current Season
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Season 1 is currently in progress. Play ranked games to earn seasonal rewards!
                  </p>
                  <Button variant="outline" onClick={() => setActiveTab('ranking')} className="w-full">
                    View Ranking
                  </Button>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    Daily Quests
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Complete daily quests to earn Gold and Diamonds. Check your progress now.
                  </p>
                  <Button variant="outline" onClick={() => setActiveTab('quests')} className="w-full">
                    View Quests
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="quests" className="animate-in fade-in-50 duration-300">
              <div className="flex justify-center">
                <div className="w-full">
                  <QuestPanel
                    userId={currentUser.id}
                    gameUuid={currentUser.uuid}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ranking" className="animate-in fade-in-50 duration-300">
              <div className="flex justify-center">
                <RankingList currentUserId={currentUser?.uuid} />
              </div>
            </TabsContent>

            <TabsContent value="platform" className="animate-in fade-in-50 duration-300">
              <div className="flex justify-center">
                <div className="w-full">
                  <AccountLink
                    userUuid={currentUser.uuid}
                    username={currentUser.username}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </section>

        {/* [3] 오른쪽 사이드바 (고정) - 게임 시작 & 정보 */}
        <aside className="hidden lg:flex flex-col gap-6 w-80 flex-shrink-0">
          {/* GAME START 버튼 (가장 잘 보이는 위치) */}
          <Button
            onClick={() => setIsGameModalOpen(true)}
            className="w-full h-24 text-3xl font-black italic bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 hover:from-yellow-500 hover:via-orange-600 hover:to-red-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border-4 border-white/20 rounded-2xl group"
          >
            <span className="drop-shadow-md flex items-center gap-2">
              <Play className="w-8 h-8 fill-current group-hover:animate-pulse" />
              PLAY
            </span>
          </Button>

          <AttendanceCheck
            userId={currentUser.id}
            gameUuid={currentUser.uuid}
          />

          <HighScoreDisplay
            gameUuid={currentUser.uuid}
          />
        </aside>

      </main>

      {/* 게임 모달 (전체 화면에 가깝게) */}
      <Dialog open={isGameModalOpen} onOpenChange={(open) => {
        // 게임 중 실수로 닫기 방지 (추후 게임 상태 연동 가능)
        setIsGameModalOpen(open);
      }}>
        <DialogContent
          className="max-w-none w-[98vw] h-[96vh] p-0 bg-gray-900 border-gray-800 flex flex-col overflow-hidden focus:outline-none"
          onInteractOutside={(e) => e.preventDefault()} // 바깥 클릭 방지
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Tetris Game</DialogTitle>
          </DialogHeader>
          <div className="absolute top-4 right-4 z-50">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsGameModalOpen(false)}
              className="text-white/50 hover:text-white hover:bg-white/10 rounded-full w-10 h-10"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>

          <div className="flex-1 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
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
        </DialogContent>
      </Dialog>

      {/* 상점 모달 */}
      <ShopModal
        isOpen={showShopModal}
        onClose={() => setShowShopModal(false)}
        gameUuid={currentUser?.uuid || 0}
        onPurchaseSuccess={() => {
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

      {/* Currency Exchange Modal */}
      <CurrencyExchangeModal
        isOpen={showCurrencyExchange}
        onClose={() => setShowCurrencyExchange(false)}
        gameUuid={currentUser?.uuid || 0}
        onSuccess={() => {
          if (typeof (window as unknown as { updateCurrencyBalance?: () => void }).updateCurrencyBalance === 'function') {
            (window as unknown as { updateCurrencyBalance: () => void }).updateCurrencyBalance();
          }
        }}
      />
    </div>
  );
}
