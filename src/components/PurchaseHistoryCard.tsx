'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Receipt, RefreshCw, ExternalLink, Loader2 } from 'lucide-react';

interface PurchaseHistoryProps {
    gameUuid: number;
}

interface PurchaseRecord {
    id: string;
    paymentMethod: 'FIAT' | 'USDC';
    diamondAmount: number;
    usdcAmount?: string;
    fiatAmount?: string;
    currency?: string;
    txHash?: string;
    status: string;
    createdAt: string;
}

export default function PurchaseHistoryCard({ gameUuid }: PurchaseHistoryProps) {
    const [history, setHistory] = useState<PurchaseRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameUuid]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/circle/payment/diamond?gameUuid=${gameUuid}&limit=20`);
            const data = await response.json();

            if (data.success) {
                setHistory(data.payload || []);
            }
        } catch (error) {
            console.error('구매 내역 조회 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchHistory();
        setRefreshing(false);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const openTxExplorer = (txHash: string) => {
        window.open(`https://amoy.polygonscan.com/tx/${txHash}`, '_blank');
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <Badge variant="outline" className="text-slate-300 border-slate-600">Completed</Badge>;
            case 'PENDING':
                return <Badge variant="outline" className="text-slate-500 border-slate-600">Pending</Badge>;
            case 'FAILED':
                return <Badge variant="outline" className="text-red-400 border-red-800">Failed</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getPaymentMethodBadge = (method: 'FIAT' | 'USDC') => {
        if (method === 'USDC') {
            return <Badge variant="outline" className="text-slate-300 border-slate-600">USDC</Badge>;
        }
        return <Badge variant="outline" className="text-slate-300 border-slate-600">Fiat</Badge>;
    };

    return (
        <Card className="w-full border-0 shadow-none">
            <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2 text-slate-300">
                        <Receipt className="w-4 h-4" />
                        <span>Recent Transactions</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="h-8 w-8 text-slate-400 hover:text-slate-200"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </Button>
                </CardTitle>
            </CardHeader>

            <CardContent className="px-0">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <Receipt className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No transaction history</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* 테이블 헤더 */}
                        <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 border-b border-slate-800 pb-2">
                            <div className="col-span-3">Date</div>
                            <div className="col-span-2">Item</div>
                            <div className="col-span-2">Method</div>
                            <div className="col-span-2">Amount</div>
                            <div className="col-span-2">Status</div>
                            <div className="col-span-1">Tx</div>
                        </div>

                        {/* 구매 내역 목록 */}
                        {history.map((record) => (
                            <div
                                key={record.id}
                                className="grid grid-cols-12 gap-2 items-center text-sm py-3 border-b border-slate-800 last:border-0 hover:bg-slate-800/50 rounded px-2 transition-colors"
                            >
                                {/* 일시 */}
                                <div className="col-span-3 text-xs text-slate-400">
                                    {formatDate(record.createdAt)}
                                </div>

                                {/* 상품 */}
                                <div className="col-span-2 font-medium text-white">
                                    💎 {record.diamondAmount.toLocaleString()}
                                </div>

                                {/* 결제수단 */}
                                <div className="col-span-2">
                                    {getPaymentMethodBadge(record.paymentMethod)}
                                </div>

                                {/* 금액 */}
                                <div className="col-span-2 text-sm text-slate-300 font-medium">
                                    {record.paymentMethod === 'USDC' ? (
                                        <span>
                                            {parseFloat(record.usdcAmount || '0').toFixed(2)} USDC
                                        </span>
                                    ) : (
                                        <span>
                                            {parseInt(record.fiatAmount || '0').toLocaleString()} {record.currency || 'KRW'}
                                        </span>
                                    )}
                                </div>

                                {/* 상태 */}
                                <div className="col-span-2">
                                    {getStatusBadge(record.status)}
                                </div>

                                {/* TxHash */}
                                <div className="col-span-1 text-center">
                                    {record.txHash ? (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openTxExplorer(record.txHash!)}
                                            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                                            title="View Transaction"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                        </Button>
                                    ) : (
                                        <span className="text-gray-300 dark:text-gray-600 text-xs">-</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 안내 메시지 */}
                {history.length > 0 && (
                    <div className="mt-4 text-xs text-slate-400 bg-slate-800/50 p-3 rounded border border-slate-700">
                        <p>💡 Click the link icon to view the transaction on the blockchain explorer for <strong>USDC payments</strong>.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
