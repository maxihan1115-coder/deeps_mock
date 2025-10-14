'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Trophy, Medal, Award } from 'lucide-react';

interface RankingData {
  rank: number;
  username: string;
  score: number;
  level: number;
  lines: number;
  isCurrentUser?: boolean;
}

interface RankingListProps {
  currentUserId?: string;
}

export default function RankingList({ currentUserId }: RankingListProps) {
  const [rankings, setRankings] = useState<RankingData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(10); // 100개 / 10개씩 = 10페이지

  const itemsPerPage = 10;

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
          // API 응답 데이터를 RankingData 형태로 변환
          type ApiRanking = { rankPosition?: number; score: number; level: number; lines: number; user?: { username?: string }; userId?: string };
          const rankingData: RankingData[] = (data as ApiRanking[]).map((item, index: number) => ({
            rank: item.rankPosition || index + 1,
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
      {/* 헤더 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">🏆 TETRIS 랭킹</h2>
        <p className="text-gray-600">전체 100위까지 확인할 수 있습니다</p>
      </div>

      {/* 랭킹 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">순위표</CardTitle>
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
