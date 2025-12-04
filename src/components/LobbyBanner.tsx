import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Trophy, ArrowRight, Sparkles, Gem } from 'lucide-react';

interface LobbyBannerProps {
    onOpenDiamondShop: () => void;
    onOpenShop: () => void;
}

export default function LobbyBanner({ onOpenDiamondShop, onOpenShop }: LobbyBannerProps) {
    const [currentSlide, setCurrentSlide] = useState(0);

    const slides = [
        {
            id: 0,
            content: (
                <div className="relative z-10">
                    <h2 className="text-3xl font-bold mb-2">Welcome to BORA TETRIS!</h2>
                    <p className="text-indigo-100 text-lg mb-6 max-w-xl">
                        Compete with players worldwide, complete quests, and earn rewards.
                        Start playing now to climb the leaderboard!
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 px-3 py-1">
                            <Star className="w-3 h-3 mr-1 fill-current" /> Season 1 Live
                        </Badge>
                        <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 px-3 py-1">
                            <Trophy className="w-3 h-3 mr-1" /> Weekly Rewards
                        </Badge>
                    </div>
                </div>
            ),
            bgClass: "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600",
            decorations: (
                <>
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-yellow-300 opacity-10 rounded-full blur-3xl"></div>
                </>
            )
        },
        {
            id: 1,
            content: (
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-blue-500/20 text-blue-100 border-blue-400/30">Special Offer</Badge>
                    </div>
                    <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
                        Buy Diamonds with USDC <Gem className="w-6 h-6 text-blue-300" />
                    </h2>
                    <p className="text-blue-100 text-lg mb-6 max-w-xl">
                        Get exclusive discounts when you purchase Diamonds using USDC.
                        Don&apos;t miss out on this limited time offer!
                    </p>
                    <Button
                        onClick={onOpenDiamondShop}
                        className="bg-white text-blue-600 hover:bg-blue-50 font-bold border-0"
                    >
                        Buy Now <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            ),
            bgClass: "bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600",
            decorations: (
                <>
                    <div className="absolute top-0 right-10 w-32 h-32 bg-blue-400 opacity-20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-0 right-0 w-48 h-48 bg-cyan-300 opacity-10 rounded-full blur-3xl"></div>
                </>
            )
        },
        {
            id: 2,
            content: (
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-yellow-500/20 text-yellow-100 border-yellow-400/30">Jackpot</Badge>
                    </div>
                    <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
                        Win Big with Gacha! <Sparkles className="w-6 h-6 text-yellow-300" />
                    </h2>
                    <p className="text-purple-100 text-lg mb-6 max-w-xl">
                        Try your luck at the Gacha Shop!
                        Win massive amounts of Diamonds and rare items.
                    </p>
                    <Button
                        onClick={onOpenShop}
                        className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold border-0"
                    >
                        Go to Gacha <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            ),
            bgClass: "bg-gradient-to-r from-purple-800 via-violet-600 to-fuchsia-600",
            decorations: (
                <>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-400 opacity-10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-5 mix-blend-overlay"></div>
                </>
            )
        }
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000);

        return () => clearInterval(timer);
    }, [slides.length]);

    return (
        <div className={`rounded-2xl p-8 text-white shadow-lg relative overflow-hidden transition-all duration-500 ease-in-out h-[280px] flex flex-col justify-center ${slides[currentSlide].bgClass}`}>
            {slides[currentSlide].decorations}

            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                {slides[currentSlide].content}
            </div>

            {/* Dots Indicator */}
            <div className="absolute bottom-4 right-4 flex gap-2 z-20">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${currentSlide === index ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60'
                            }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
