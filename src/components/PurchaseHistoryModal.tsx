'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { History } from 'lucide-react';
import PurchaseHistoryCard from './PurchaseHistoryCard';

interface PurchaseHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    gameUuid: number;
}

export default function PurchaseHistoryModal({ isOpen, onClose, gameUuid }: PurchaseHistoryModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden bg-slate-900 border-slate-800">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
                        <History className="w-6 h-6 text-slate-400" />
                        Transaction History
                    </DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto max-h-[70vh]">
                    <PurchaseHistoryCard gameUuid={gameUuid} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
