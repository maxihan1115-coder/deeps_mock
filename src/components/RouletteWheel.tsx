'use client';
import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { Gem } from 'lucide-react';

interface GachaResult {
  earnedDiamonds: number;
  finalBalance: {
    diamond: number;
  };
}

interface RouletteWheelProps {
  rewards: number[];
  colors: string[];
  onSpinComplete?: (serverResponse?: GachaResult) => void;
}

export interface RouletteWheelRef {
  spinToReward: (reward: number) => void;
  spinRandom: (serverResponse?: GachaResult) => void;
}

const RouletteWheel = forwardRef<RouletteWheelRef, RouletteWheelProps>(
  ({ rewards, colors, onSpinComplete }, ref) => {
    const wheelRef = useRef<HTMLDivElement>(null);
    const isSpinningRef = useRef(false);

    // colors prop 강제 사용 (디버깅용)
    console.log('RouletteWheel colors prop:', colors);
    const defaultColors = [
      '#FF6B6B', '#FF6B6B', '#FF6B6B', '#FF6B6B', '#FF6B6B',
      '#FF6B6B', '#FF6B6B', '#FF6B6B', '#FF6B6B', '#FF6B6B', '#FF6B6B'
    ];
    const finalColors = colors && colors.length > 0 ? colors : defaultColors;
    console.log('RouletteWheel finalColors:', finalColors);

    // props로 받은 rewards 사용, 없으면 기본값 (하드코딩 제거 또는 fallback)
    const displayRewards = rewards && rewards.length > 0 ? rewards : [500, 9000, 8000, 6000, 2000, 3000, 4000, 7000, 5000, 10000, 1000];

    // conic-gradient를 위한 색상 배열 생성
    const generateConicGradient = () => {
      const totalSections = displayRewards.length;
      const stepPercent = 100 / totalSections;
      const startOffset = 270;

      const parts: string[] = [`from ${startOffset}deg`];
      for (let i = 0; i < totalSections; i++) {
        const startPct = (i * stepPercent).toFixed(4);
        const endPct = ((i + 1) * stepPercent).toFixed(4);
        parts.push(`${finalColors[i % finalColors.length]} ${startPct}% ${endPct}%`);
      }

      return `conic-gradient(${parts.join(', ')})`;
    };

    // 서버 응답에 따른 정확한 회전 함수
    const spinRandom = (serverResponse?: GachaResult) => {
      if (isSpinningRef.current || !wheelRef.current) return;

      isSpinningRef.current = true;

      if (serverResponse) {
        const targetReward = serverResponse.earnedDiamonds;
        const targetIndex = displayRewards.indexOf(targetReward);

        if (targetIndex !== -1) {
          const baseRotations = 1800; // 5바퀴 (360 * 5)
          const sectionAngle = 360 / displayRewards.length;

          // 1. 인덱스 위치로 회전 (반시계 방향으로 targetIndex만큼 이동해야 12시에 옴)
          //    시계 방향 회전이므로 (-) 부호 사용
          const indexRotation = -(targetIndex * sectionAngle);

          // 2. 섹션 중앙 정렬 (반시계 방향으로 반칸 더 이동해야 중앙이 12시에 옴)
          const centerCorrection = -(sectionAngle / 2);

          // 3. 랜덤 오프셋 (섹션 크기의 80% 범위 내에서 랜덤)
          //    너무 경계선에 멈추지 않도록 함
          const randomOffset = (Math.random() - 0.5) * sectionAngle * 0.8;

          const finalRotation = baseRotations + indexRotation + centerCorrection + randomOffset;

          console.log('🎯 룰렛 회전 계산:', {
            targetReward,
            targetIndex,
            sectionAngle,
            finalRotation,
            randomOffset
          });

          const wheel = wheelRef.current;
          wheel.style.transition = 'transform 6s cubic-bezier(0.2, 0.8, 0.2, 1)'; // 이징 함수 개선
          wheel.style.transform = `rotate(${finalRotation}deg)`;
        } else {
          console.error('Target reward not found in rewards:', targetReward, displayRewards);
          // fallback: 랜덤 회전
          const finalRotation = 1800 + Math.random() * 360;
          wheelRef.current.style.transition = 'transform 6s cubic-bezier(0.2, 0.8, 0.2, 1)';
          wheelRef.current.style.transform = `rotate(${finalRotation}deg)`;
        }
      } else {
        // 서버 응답 없음 (단순 비주얼용)
        const finalRotation = 1800 + Math.random() * 360;
        wheelRef.current.style.transition = 'transform 6s cubic-bezier(0.2, 0.8, 0.2, 1)';
        wheelRef.current.style.transform = `rotate(${finalRotation}deg)`;
      }

      setTimeout(() => {
        isSpinningRef.current = false;
        onSpinComplete?.(serverResponse);
      }, 6050); // 애니메이션 시간보다 약간 길게
    };

    // spinToReward 함수도 동일하게 업데이트 필요하지만, 현재 사용되지 않으므로 생략하거나 spinRandom과 로직 통일 가능
    const spinToReward = (targetReward: number) => {
      if (isSpinningRef.current || !wheelRef.current) return;

      isSpinningRef.current = true;
      const targetIndex = displayRewards.indexOf(targetReward);

      if (targetIndex === -1) {
        console.error('Target reward not found:', targetReward);
        isSpinningRef.current = false;
        return;
      }

      // 5바퀴 이상 + 서버 응답값이 12시 포인터에 위치하도록 회전 (시계 방향)
      const baseRotations = 1800; // 5바퀴
      const sectionAngle = 360 / displayRewards.length;
      // 시계 방향으로 회전하므로 - 사용
      const finalRotation = baseRotations - (targetIndex * sectionAngle);

      const wheel = wheelRef.current;
      wheel.style.transition = 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
      wheel.style.transform = `rotate(${finalRotation}deg)`;

      // 애니메이션 완료 후 콜백 호출
      setTimeout(() => {
        isSpinningRef.current = false;
        onSpinComplete?.();
      }, 6010);
    };

    // ref를 통해 외부에서 호출할 수 있도록 expose
    useImperativeHandle(ref, () => ({
      spinToReward,
      spinRandom
    }));

    return (
      <div className="relative w-[320px] h-[320px] sm:w-[450px] sm:h-[450px] mx-auto my-8">
        {/* 1. 가장 바깥쪽 그림자 및 베젤 (기본 틀) */}
        <div className="absolute inset-[-24px] rounded-full bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"></div>

        {/* 2. 금속 질감의 메인 베젤 (실버/블루 그라데이션) */}
        <div className="absolute inset-[-20px] rounded-full bg-gradient-to-b from-slate-400 via-slate-200 to-slate-500 shadow-[inset_0_2px_5px_rgba(255,255,255,0.5),0_5px_15px_rgba(0,0,0,0.5)]"></div>

        {/* 3. 안쪽 베젤 (깊이감) */}
        <div className="absolute inset-[-8px] rounded-full bg-slate-800 shadow-[inset_0_5px_10px_rgba(0,0,0,0.8)]"></div>

        {/* 룰렛 휠 */}
        <div
          ref={wheelRef}
          className="relative w-full h-full rounded-full border-4 border-slate-900 shadow-[inset_0_0_50px_rgba(0,0,0,0.7)] overflow-hidden"
          style={{
            background: generateConicGradient(),
            transform: 'rotate(0deg)',
          }}
        >
          {/* 광택 효과 (하이라이트) */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/20 via-transparent to-transparent pointer-events-none z-10"></div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-black/10 via-transparent to-black/30 pointer-events-none z-10"></div>
          {/* 보상 텍스트 오버레이 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-full h-full">
              {displayRewards.map((reward, index) => {
                const totalSections = displayRewards.length;
                const sectionAngle = 360 / totalSections;
                // conic-gradient가 270도(12시)부터 시작하므로 동일하게 맞춤
                const startOffset = 270;

                // 웨지의 정중앙 각도 계산 (좌측으로 치우친 현상 보정을 위해 +5도 추가)
                const midAngle = startOffset + (sectionAngle * index) + (sectionAngle / 2) + 5;

                // 텍스트 위치 반지름 (룰렛 크기 420px -> 반지름 210px. 텍스트는 약 140px 지점에 위치)
                const radius = 140;

                const x = Math.cos((midAngle * Math.PI) / 180) * radius;
                const y = Math.sin((midAngle * Math.PI) / 180) * radius;

                // 텍스트 회전: 룰렛 중심에서 바깥쪽을 향하도록
                const rotate = midAngle;

                return (
                  <div
                    key={index}
                    className="absolute text-white font-black text-lg drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] z-20"
                    style={{
                      left: `calc(50% + ${x}px)`,
                      top: `calc(50% + ${y}px)`,
                      transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
                      fontSize: '18px',
                      textShadow: '0 2px 4px rgba(0,0,0,0.9)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {reward.toLocaleString()}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 중앙 포인터 (더 세련된 디자인) */}
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 z-30 filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]">
          <div className="w-12 h-14 bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}></div>
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-amber-900 rounded-full mt-1 shadow-inner"></div>
        </div>

        {/* 중앙 다이아몬드 아이콘 (입체감 강화) */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="w-24 h-24 bg-gradient-to-br from-slate-200 to-slate-400 rounded-full flex items-center justify-center shadow-[0_10px_20px_rgba(0,0,0,0.5),inset_0_2px_5px_rgba(255,255,255,0.8)] border-4 border-slate-300">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center shadow-[inset_0_5px_10px_rgba(0,0,0,0.8)] border border-slate-700">
              <Gem className="w-8 h-8 text-blue-400 animate-pulse filter drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
            </div>
          </div>
        </div>
      </div>
    );
  }
);

RouletteWheel.displayName = 'RouletteWheel';

export default RouletteWheel;
