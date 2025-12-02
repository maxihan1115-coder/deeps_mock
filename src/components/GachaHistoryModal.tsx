'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, TrendingUp, TrendingDown, Gem, Loader2 } from 'lucide-react';

interface GachaHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameUuid: number;
}

interface GachaHistoryItem {
  id: string;
  diamondCost: number;
  earnedDiamonds: number;
  createdAt: string;
  gachaItem: {
    name: string;
  };
}

interface GachaStats {
  totalPurchases: number;
  totalSpent: number;
  totalEarned: number;
  netGain: number;
}

export default function GachaHistoryModal({
  isOpen,
  onClose,
  gameUuid
}: GachaHistoryModalProps) {
  const [history, setHistory] = useState<GachaHistoryItem[]>([]);
  const [stats, setStats] = useState<GachaStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchGachaHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, gameUuid]);

  const fetchGachaHistory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/gacha/history?gameUuid=${gameUuid}`);

      if (response.ok) {
        const data = await response.json();
        setHistory(data.payload.history);
        setStats(data.payload.stats);
      } else {
        console.error('가챠 내역 조회 실패');
      }
    } catch (error) {
      console.error('가챠 내역 조회 중 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNetGainColor = (netGain: number) => {
    if (netGain > 0) return 'text-green-600';
    if (netGain < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getNetGainIcon = (netGain: number) => {
    if (netGain > 0) return <TrendingUp className="w-4 h-4" />;
    if (netGain < 0) return <TrendingDown className="w-4 h-4" />;
    return null;
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
              <History className="w-6 h-6" />
              가챠 구매 내역
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] w-full mx-4">
        <DialogHeader>
          <DialogTitle className="text-xl md:text-2xl font-bold text-center flex items-center justify-center gap-2">
            <History className="w-5 h-5 md:w-6 md:h-6" />
            가챠 구매 내역
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 md:space-y-6 overflow-hidden">
          {/* 통계 카드 */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
              <Card>
                <CardContent className="p-3 md:p-4 text-center">
                  <div className="font-bold text-blue-600 whitespace-nowrap" style={{ fontSize: 'clamp(0.75rem, 2vw, 1.25rem)' }}>
                    {stats.totalPurchases}
                  </div>
                  <div className="text-xs md:text-sm text-gray-600 whitespace-nowrap">총 구매 횟수</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 md:p-4 text-center">
                  <div className="font-bold text-red-600 whitespace-nowrap" style={{ fontSize: 'clamp(0.75rem, 2vw, 1.25rem)' }}>
                    {stats.totalSpent.toLocaleString()}
                  </div>
                  <div className="text-xs md:text-sm text-gray-600 whitespace-nowrap">총 사용 다이아</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 md:p-4 text-center">
                  <div className="font-bold text-green-600 whitespace-nowrap" style={{ fontSize: 'clamp(0.75rem, 2vw, 1.25rem)' }}>
                    {stats.totalEarned.toLocaleString()}
                  </div>
                  <div className="text-xs md:text-sm text-gray-600 whitespace-nowrap">총 획득 다이아</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 md:p-4 text-center">
                  <div className={`font-bold flex items-center justify-center gap-1 ${getNetGainColor(stats.netGain)} whitespace-nowrap`} style={{ fontSize: 'clamp(0.75rem, 2vw, 1.25rem)' }}>
                    {getNetGainIcon(stats.netGain)}
                    <span>
                      {stats.netGain > 0 ? '+' : ''}{stats.netGain.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs md:text-sm text-gray-600 whitespace-nowrap">순이익</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 구매 내역 */}
          <div className="space-y-2 md:space-y-3 max-h-80 md:max-h-96 overflow-y-auto">
            {history.length > 0 ? (
              history.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Gem className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="font-semibold whitespace-nowrap" style={{ fontSize: 'clamp(0.625rem, 1.5vw, 0.875rem)' }}>
                              {item.gachaItem.name}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs w-fit">
                            {formatDate(item.createdAt)}
                          </Badge>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs md:text-sm">
                          <div className="flex items-center gap-1 text-red-600">
                            <span>사용:</span>
                            <span className="font-bold">{item.diamondCost.toLocaleString()}</span>
                          </div>

                          <div className="flex items-center gap-1 text-green-600">
                            <span>획득:</span>
                            <span className="font-bold">{item.earnedDiamonds.toLocaleString()}</span>
                          </div>

                          <div className={`flex items-center gap-1 ${getNetGainColor(item.earnedDiamonds - item.diamondCost)}`}>
                            <span>순이익:</span>
                            <span className="font-bold">
                              {item.earnedDiamonds - item.diamondCost > 0 ? '+' : ''}
                              {(item.earnedDiamonds - item.diamondCost).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end md:text-right">
                        {item.earnedDiamonds > item.diamondCost ? (
                          <Badge className="bg-green-100 text-green-800 text-xs">수익</Badge>
                        ) : item.earnedDiamonds < item.diamondCost ? (
                          <Badge className="bg-red-100 text-red-800 text-xs">손실</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800 text-xs">무손익</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>가챠 구매 내역이 없습니다.</p>
                <p className="text-sm">첫 번째 가챠를 구매해보세요!</p>
              </div>
            )}
          </div>

          {/* 닫기 버튼 */}
          <div className="flex justify-center pt-2">
            <Button onClick={onClose} variant="outline" className="px-6 md:px-8">
              닫기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
