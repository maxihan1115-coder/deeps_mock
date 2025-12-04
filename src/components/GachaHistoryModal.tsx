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
        console.error('Failed to fetch gacha history');
      }
    } catch (error) {
      console.error('Error fetching gacha history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNetGainColor = (netGain: number) => {
    if (netGain > 0) return 'text-green-400';
    if (netGain < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  const getNetGainIcon = (netGain: number) => {
    if (netGain > 0) return <TrendingUp className="w-4 h-4" />;
    if (netGain < 0) return <TrendingDown className="w-4 h-4" />;
    return null;
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2 text-white">
              <History className="w-6 h-6" />
              Gacha History
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] w-full mx-4 bg-slate-900 border-slate-800 text-slate-200">
        <DialogHeader>
          <DialogTitle className="text-xl md:text-2xl font-bold text-center flex items-center justify-center gap-2 text-white">
            <History className="w-5 h-5 md:w-6 md:h-6" />
            Gacha History
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 overflow-hidden">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4 text-center">
                  <div className="font-bold text-blue-400 text-lg md:text-xl truncate" title={stats.totalPurchases.toString()}>
                    {stats.totalPurchases}
                  </div>
                  <div className="text-xs md:text-sm text-slate-400 mt-1">Total Purchases</div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4 text-center">
                  <div className="font-bold text-red-400 text-lg md:text-xl truncate" title={stats.totalSpent.toLocaleString()}>
                    {stats.totalSpent.toLocaleString()}
                  </div>
                  <div className="text-xs md:text-sm text-slate-400 mt-1">Total Spent</div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4 text-center">
                  <div className="font-bold text-green-400 text-lg md:text-xl truncate" title={stats.totalEarned.toLocaleString()}>
                    {stats.totalEarned.toLocaleString()}
                  </div>
                  <div className="text-xs md:text-sm text-slate-400 mt-1">Total Earned</div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4 text-center">
                  <div className={`font-bold flex items-center justify-center gap-1 text-lg md:text-xl truncate ${getNetGainColor(stats.netGain)}`} title={stats.netGain.toLocaleString()}>
                    {getNetGainIcon(stats.netGain)}
                    <span>
                      {stats.netGain > 0 ? '+' : ''}{stats.netGain.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs md:text-sm text-slate-400 mt-1">Net Profit</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* History List */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col max-h-[500px]">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-4 bg-slate-950/50 border-b border-slate-700 text-sm font-medium text-slate-400">
              <div className="col-span-4 md:col-span-3">Item / Date</div>
              <div className="col-span-3 md:col-span-2 text-right">Cost</div>
              <div className="col-span-3 md:col-span-2 text-right">Earned</div>
              <div className="col-span-2 md:col-span-3 text-right hidden md:block">Profit</div>
              <div className="col-span-2 text-center">Result</div>
            </div>

            {/* Table Body */}
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {history.length > 0 ? (
                history.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-slate-700/50 rounded-lg transition-colors text-sm">
                    {/* Item & Date */}
                    <div className="col-span-4 md:col-span-3 min-w-0">
                      <div className="font-medium text-white truncate flex items-center gap-2">
                        <Gem className="w-3 h-3 text-blue-400 flex-shrink-0" />
                        {item.gachaItem.name === '테스트 아이템1' ? 'Diamond Roulette' : item.gachaItem.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {formatDate(item.createdAt)}
                      </div>
                    </div>

                    {/* Cost */}
                    <div className="col-span-3 md:col-span-2 text-right text-red-400 font-medium">
                      -{item.diamondCost.toLocaleString()}
                    </div>

                    {/* Earned */}
                    <div className="col-span-3 md:col-span-2 text-right text-green-400 font-medium">
                      +{item.earnedDiamonds.toLocaleString()}
                    </div>

                    {/* Profit (Desktop only) */}
                    <div className={`col-span-2 md:col-span-3 text-right hidden md:block font-bold ${getNetGainColor(item.earnedDiamonds - item.diamondCost)}`}>
                      {item.earnedDiamonds - item.diamondCost > 0 ? '+' : ''}
                      {(item.earnedDiamonds - item.diamondCost).toLocaleString()}
                    </div>

                    {/* Result Badge */}
                    <div className="col-span-2 flex justify-center">
                      {item.earnedDiamonds > item.diamondCost ? (
                        <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border-0">Win</Badge>
                      ) : item.earnedDiamonds < item.diamondCost ? (
                        <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0">Loss</Badge>
                      ) : (
                        <Badge className="bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 border-0">Draw</Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No gacha history found.</p>
                  <p className="text-sm mt-1">Try your luck with your first gacha!</p>
                </div>
              )}
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-center pt-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="px-8 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
