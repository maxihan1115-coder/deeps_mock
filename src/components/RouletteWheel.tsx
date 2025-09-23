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
  ({ colors, onSpinComplete }, ref) => {
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

    // 보상 순서 재배치 (프론트 시계방향 순서와 일치) - 하드코딩으로 고정
    const rearrangedRewards = [500, 9000, 8000, 6000, 2000, 3000, 4000, 7000, 5000, 10000, 1000];

    // conic-gradient를 위한 색상 배열 생성 (rearrangedRewards 순서와 일치)
    const generateConicGradient = () => {
      const totalSections = rearrangedRewards.length;
      const stepPercent = 100 / totalSections;

      // 텍스트 배치와 동일한 시작 오프셋(도 단위)
      const startOffset = 270; // 12시 기준으로 시계방향 270도 = 9시 → 상단 포인터 기준 위치 고정

      // 퍼센트 기반 스톱을 사용하고, from 각도로 시작점을 지정해 브라우저별 렌더링 불일치를 방지
      const parts: string[] = [`from ${startOffset}deg`];
      for (let i = 0; i < totalSections; i++) {
        const startPct = (i * stepPercent).toFixed(4);
        const endPct = ((i + 1) * stepPercent).toFixed(4);
        parts.push(`${finalColors[i]} ${startPct}% ${endPct}%`);
      }

      return `conic-gradient(${parts.join(', ')})`;
    };

    // 서버 응답에 따른 정확한 회전 함수 (각도 계산 없이 간단하게)
    const spinRandom = (serverResponse?: GachaResult) => {
      if (isSpinningRef.current || !wheelRef.current) return;
      
      isSpinningRef.current = true;

      if (serverResponse) {
        // 서버 응답이 있으면 정확한 보상 위치로 회전
        const targetReward = serverResponse.earnedDiamonds;
        const targetIndex = rearrangedRewards.indexOf(targetReward);
        
        if (targetIndex !== -1) {
          // 2바퀴 이상 + 서버 응답값이 12시 포인터에 위치하도록 회전 (시계 방향)
          const baseRotations = 720; // 2바퀴
          const sectionSize = 360 / rearrangedRewards.length;
          // 시계 방향으로 회전하므로 - 사용
          const finalRotation = baseRotations - (targetIndex * sectionSize);
          
          // 디버깅: 룰렛이 멈춘 위치와 서버 값 로그
          console.log('🎯 룰렛 회전 정보:');
          console.log(`  서버 응답값: ${targetReward} 다이아몬드`);
          console.log(`  목표 인덱스: ${targetIndex}`);
          console.log(`  회전 각도: ${finalRotation}도`);
          console.log(`  포인터가 가리키는 보상: ${rearrangedRewards[targetIndex]} 다이아몬드`);
          console.log(`  rearrangedRewards 배열: [${rearrangedRewards.join(', ')}]`);
          console.log('');
          
          const wheel = wheelRef.current;
          wheel.style.transition = 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
          wheel.style.transform = `rotate(${finalRotation}deg)`;
        } else {
          console.error('Target reward not found in rearranged rewards:', targetReward);
          // fallback: 랜덤 회전
          const baseRotations = 720;
          const randomExtra = Math.random() * 360;
          const finalRotation = baseRotations + randomExtra;
          
          const wheel = wheelRef.current;
          wheel.style.transition = 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
          wheel.style.transform = `rotate(${finalRotation}deg)`;
        }
      } else {
        // 서버 응답이 없으면 랜덤 회전
        const baseRotations = 720;
        const randomExtra = Math.random() * 360;
        const finalRotation = baseRotations + randomExtra;
        
        const wheel = wheelRef.current;
        wheel.style.transition = 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
        wheel.style.transform = `rotate(${finalRotation}deg)`;
      }
      
      // 애니메이션 완료 후 콜백 호출 (서버 응답과 함께)
      setTimeout(() => {
        isSpinningRef.current = false;
        onSpinComplete?.(serverResponse);
      }, 3500);
    };

    // 특정 보상으로 회전하는 함수
    const spinToReward = (targetReward: number) => {
      if (isSpinningRef.current || !wheelRef.current) return;
      
      isSpinningRef.current = true;
      const targetIndex = rearrangedRewards.indexOf(targetReward);
      
      if (targetIndex === -1) {
        console.error('Target reward not found:', targetReward);
        isSpinningRef.current = false;
        return;
      }

      // 2바퀴 이상 + 서버 응답값이 12시 포인터에 위치하도록 회전 (시계 방향)
      const baseRotations = 720; // 2바퀴
      const sectionSize = 360 / rearrangedRewards.length;
      // 시계 방향으로 회전하므로 - 사용
      const finalRotation = baseRotations - (targetIndex * sectionSize);
      
      const wheel = wheelRef.current;
      wheel.style.transition = 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
      wheel.style.transform = `rotate(${finalRotation}deg)`;
      
      // 애니메이션 완료 후 콜백 호출
      setTimeout(() => {
        isSpinningRef.current = false;
        onSpinComplete?.();
      }, 3500);
    };

    // ref를 통해 외부에서 호출할 수 있도록 expose
    useImperativeHandle(ref, () => ({
      spinToReward,
      spinRandom
    }));

    return (
      <div className="relative w-80 h-80 mx-auto">
        {/* 룰렛 휠 */}
        <div
          ref={wheelRef}
          className="w-full h-full rounded-full border-4 border-gray-800 shadow-2xl"
          style={{
            background: generateConicGradient(),
            transform: 'rotate(0deg)',
          }}
        >
          {/* 보상 텍스트 오버레이 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-full h-full">
              {rearrangedRewards.map((reward, index) => {
                // 시계 방향으로 텍스트 배치 (conic-gradient와 일치하도록 startOffset 적용)
                const startOffset = 270; // conic-gradient와 같은 시작점
                const angle = startOffset + (360 / rearrangedRewards.length) * index;
                const textAngle = angle + (360 / rearrangedRewards.length) / 2 - 25; // 웨지 중앙에서 시계 반대 방향으로 15도 이동
                const radius = 100; // 텍스트 위치를 중앙에 더 가깝게 조정
                
                const x = Math.cos((textAngle * Math.PI) / 180) * radius;
                const y = Math.sin((textAngle * Math.PI) / 180) * radius;
                
                return (
                  <div
                    key={index}
                    className="absolute text-white font-bold text-sm"
                    style={{
                      left: `calc(50% + ${x}px)`,
                      top: `calc(50% + ${y}px)`,
                      transform: 'translate(-50%, -50%)',
                      textShadow: '2px 2px 4px rgba(0,0,0,0.9)',
                      fontSize: '14px',
                      fontWeight: '700',
                    }}
                  >
                    {reward.toLocaleString()}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* 중앙 포인터 */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
          <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-red-600"></div>
        </div>
        
        {/* 중앙 다이아몬드 아이콘 */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-gray-300">
            <Gem className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>
    );
  }
);

RouletteWheel.displayName = 'RouletteWheel';

export default RouletteWheel;
