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
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <History className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                        Purchase History
                    </DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto max-h-[70vh]">
                    <PurchaseHistoryCard gameUuid={gameUuid} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
