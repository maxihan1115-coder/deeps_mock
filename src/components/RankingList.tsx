'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Trophy, Medal, Award, Clock, Settings, Play, Square } from 'lucide-react';

interface RankingData {
  rank: number;
  username: string;
  score: number;
  level: number;
  lines: number;
  isCurrentUser?: boolean;
}

interface RankingListProps {
  currentUserId?: string | number;
}

interface SeasonInfo {
  seasonName: string;
  seasonStartDate: string;
  seasonEndDate: string;
  isActive: boolean;
  daysRemaining: number;
  status: 'active' | 'ended';
}

export default function RankingList({ currentUserId }: RankingListProps) {
  const [rankings, setRankings] = useState<RankingData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(10); // 100개 / 10개씩 = 10페이지
  const [seasonInfo, setSeasonInfo] = useState<SeasonInfo | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const itemsPerPage = 10;

  // 관리자 권한 체크
  useEffect(() => {
    // maxi.moff 계정의 UUID가 관리자 (UUID 기준으로 체크)
    // TODO: 실제 maxi.moff 계정의 UUID로 변경 필요
    setIsAdmin(currentUserId === '1' || currentUserId === 1 || currentUserId === '138afdb1-d873-4032-af80-77b5fb8a23cf');
    console.log('관리자 권한 체크:', { currentUserId, isAdmin: currentUserId === '1' || currentUserId === 1 || currentUserId === '138afdb1-d873-4032-af80-77b5fb8a23cf' });
  }, [currentUserId]);

  // 시즌 종료 처리
  const handleEndSeason = async () => {
    if (!seasonInfo) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch('/api/seasons/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seasonName: seasonInfo.seasonName,
          periodStartDate: seasonInfo.seasonStartDate,
          periodEndDate: seasonInfo.seasonEndDate,
          adminUserId: currentUserId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('시즌이 종료되었습니다.');
        // 시즌 정보 새로고침
        await fetchSeasonInfo();
      } else {
        alert(`시즌 종료 실패: ${data.error}`);
      }
    } catch (error) {
      console.error('시즌 종료 오류:', error);
      alert('시즌 종료 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 새 시즌 시작 처리
  const handleStartNewSeason = async () => {
    if (!seasonInfo) return;
    
    const newSeasonName = prompt('새 시즌명을 입력하세요 (예: 2025-02):');
    if (!newSeasonName) return;

    const newStartDate = prompt('새 시즌 시작일을 입력하세요 (예: 2025-10-15T11:00:00+09:00):');
    if (!newStartDate) return;

    const newEndDate = prompt('새 시즌 종료일을 입력하세요 (예: 2026-01-15T11:00:00+09:00):');
    if (!newEndDate) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/seasons/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentSeasonName: seasonInfo.seasonName,
          newSeasonName,
          newSeasonStartDate: newStartDate,
          newSeasonEndDate: newEndDate,
          adminUserId: currentUserId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('새 시즌이 시작되었습니다.');
        // 시즌 정보 새로고침
        await fetchSeasonInfo();
        // 랭킹 데이터 새로고침
        window.location.reload();
      } else {
        alert(`새 시즌 시작 실패: ${data.error}`);
      }
    } catch (error) {
      console.error('새 시즌 시작 오류:', error);
      alert('새 시즌 시작 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 시즌 정보 가져오기
  const fetchSeasonInfo = async () => {
    try {
      const response = await fetch('/api/seasons/status');
      const data = await response.json();
      
      if (data.success && data.season) {
        setSeasonInfo(data.season);
      }
    } catch (error) {
      console.error('시즌 정보 로딩 실패:', error);
    }
  };

  // 목업 데이터 생성
  const generateMockRankings = (): RankingData[] => {
    const mockData: RankingData[] = [];
    for (let i = 1; i <= 100; i++) {
      mockData.push({
        rank: i,
        username: `Player${i.toString().padStart(3, '0')}`,
        score: Math.floor(Math.random() * 500000) + 10000,
        level: Math.floor(Math.random() * 20) + 1,
        lines: Math.floor(Math.random() * 1000) + 100,
        isCurrentUser: i === 1 // 첫 번째 플레이어를 현재 사용자로 가정
      });
    }
    return mockData.sort((a, b) => b.score - a.score).map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  };

  useEffect(() => {
    const fetchRankings = async () => {
      setIsLoading(true);
      try {
        // 실제 API 호출
        const response = await fetch('/api/rankings?period=season&startDate=2025-01-01T00:00:00%2B09:00&limit=100');
        const data = await response.json();
        
        if (data && Array.isArray(data)) {
          // API 응답 데이터를 점수 기준으로 정렬 후 순위 계산
          type ApiRanking = { score: number; level: number; lines: number; user?: { username?: string }; userId?: string };
          const sortedData = (data as ApiRanking[]).sort((a, b) => b.score - a.score);
          const rankingData: RankingData[] = sortedData.map((item, index: number) => ({
            rank: index + 1,
            username: item.user?.username || 'Unknown',
            score: item.score,
            level: item.level,
            lines: item.lines,
            isCurrentUser: currentUserId ? item.userId === currentUserId : false
          }));
          
          setRankings(rankingData);
          setTotalPages(Math.ceil(rankingData.length / itemsPerPage));
        } else {
          console.error('랭킹 데이터 형식이 올바르지 않습니다:', data);
          // API 실패 시 목업 데이터 사용
          const mockRankings = generateMockRankings();
          setRankings(mockRankings);
          setTotalPages(Math.ceil(mockRankings.length / itemsPerPage));
        }
      } catch (error) {
        console.error('랭킹 데이터 로딩 실패:', error);
        // 에러 시 목업 데이터 사용
        const mockRankings = generateMockRankings();
        setRankings(mockRankings);
        setTotalPages(Math.ceil(mockRankings.length / itemsPerPage));
      } finally {
        setIsLoading(false);
      }
    };

    fetchRankings();
    fetchSeasonInfo();
  }, [currentUserId]);

  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return rankings.slice(startIndex, endIndex);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-600">#{rank}</span>;
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (rank === 2) return "bg-gray-100 text-gray-800 border-gray-200";
    if (rank === 3) return "bg-amber-100 text-amber-800 border-amber-200";
    if (rank <= 10) return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-gray-50 text-gray-700 border-gray-200";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">랭킹 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">

      {/* 시즌 일정 정보 */}
      {seasonInfo && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 border border-blue-100 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5"></div>
          <div className="relative p-4">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                seasonInfo.status === 'ended' ? 'bg-red-100' : 'bg-blue-100'
              }`}>
                <Clock className={`w-4 h-4 ${
                  seasonInfo.status === 'ended' ? 'text-red-600' : 'text-blue-600'
                }`} />
              </div>
              <span className="text-sm font-semibold text-slate-700">시즌 일정</span>
              {seasonInfo.status === 'ended' && (
                <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                  종료됨
                </span>
              )}
            </div>
            
            <div className="flex items-center justify-center gap-6">
              {/* 시작일 */}
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-xs font-medium text-slate-600">시작</span>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-800">
                    {new Date(seasonInfo.seasonStartDate).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* 구분선 */}
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>

              {/* 종료일 */}
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-xs font-medium text-slate-600">종료</span>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-800">
                    {new Date(seasonInfo.seasonEndDate).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(seasonInfo.seasonEndDate).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 시즌 종료 안내 메시지 */}
      {seasonInfo && seasonInfo.status === 'ended' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <p className="text-amber-800 font-medium">
            시즌이 종료되었습니다. 최종 랭킹 결과입니다.
          </p>
        </div>
      )}

      {/* 관리자 전용 시즌 관리 패널 */}
      {isAdmin && seasonInfo && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <Settings className="w-5 h-5" />
              시즌 관리
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                관리자 전용
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              {seasonInfo.status === 'active' ? (
                <Button
                  onClick={handleEndSeason}
                  disabled={isProcessing}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
                >
                  <Square className="w-4 h-4" />
                  {isProcessing ? '처리 중...' : '시즌 종료'}
                </Button>
              ) : (
                <Button
                  onClick={handleStartNewSeason}
                  disabled={isProcessing}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-4 h-4" />
                  {isProcessing ? '처리 중...' : '새 시즌 시작'}
                </Button>
              )}
              
              <div className="text-xs text-purple-600">
                {seasonInfo.status === 'active' 
                  ? '현재 시즌을 종료하고 최종 랭킹을 확정합니다.'
                  : '새로운 시즌을 시작하고 랭킹을 초기화합니다.'
                }
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 랭킹 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            {seasonInfo && seasonInfo.status === 'ended' ? '최종 랭킹' : '순위표'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">순위</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">플레이어</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">점수</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">레벨</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">라인</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentPageData().map((player, index) => (
                  <tr 
                    key={`${player.username}-${player.score}-${index}`} 
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      player.isCurrentUser ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getRankIcon(player.rank)}
                        <Badge className={getRankBadgeColor(player.rank)}>
                          {player.rank}위
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${player.isCurrentUser ? 'text-blue-700' : 'text-gray-900'}`}>
                          {player.username}
                        </span>
                        {player.isCurrentUser && (
                          <Badge variant="outline" className="text-blue-600 border-blue-300">
                            나
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono font-semibold text-gray-900">
                        {player.score.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Lv.{player.level}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-gray-700">{player.lines}줄</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 페이지네이션 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {currentPage}페이지 / 총 {totalPages}페이지
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            이전
          </Button>
          
          {/* 페이지 번호들 */}
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1"
          >
            다음
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
