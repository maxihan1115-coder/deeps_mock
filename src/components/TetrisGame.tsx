'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TetrisGameState, TetrisBlock } from '@/types';
import { Button } from '@/components/ui/button';
import { Pause, X } from 'lucide-react';
import GameResultModal from '@/components/GameResultModal';

// 테트리스 블록 모양 정의
const TETRIS_SHAPES = [
  // I 블록
  [[1, 1, 1, 1]],
  // O 블록
  [[1, 1], [1, 1]],
  // T 블록
  [[0, 1, 0], [1, 1, 1]],
  // S 블록
  [[0, 1, 1], [1, 1, 0]],
  // Z 블록
  [[1, 1, 0], [0, 1, 1]],
  // J 블록
  [[1, 0, 0], [1, 1, 1]],
  // L 블록
  [[0, 0, 1], [1, 1, 1]],
];

const COLORS = ['#00f5ff', '#ffff00', '#a000f0', '#00f000', '#f00000', '#0000f0', '#ffa500'];


interface TetrisGameProps {
  userId: number;  // gameUuid (숫자) - 플랫폼 연동용
  onScoreUpdate: (score: number) => void;
  onLevelUpdate: (level: number) => void;
  onLinesUpdate: (lines: number) => void;
  onGameOver: () => void;
  onHighScoreUpdate: (score: number, level: number, lines: number) => void;
  onPlatformLinkStatusChange?: (isLinked: boolean) => void;
  onGameStateChange?: (gameState: { score: number; level: number; lines: number; nextBlock: { shape: number[][]; color: string } | null }, isGameStarted: boolean) => void;
}

export default function TetrisGame({ userId, onScoreUpdate, onLevelUpdate, onLinesUpdate, onGameOver, onHighScoreUpdate, onPlatformLinkStatusChange, onGameStateChange }: TetrisGameProps) {
  // 게임 결과 모달 상태
  const [showGameResultModal, setShowGameResultModal] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [failureMessage, setFailureMessage] = useState('');
  const [isProcessingGameOver, setIsProcessingGameOver] = useState(false);
  const isProcessingGameOverRef = useRef(false);
  const [gameResult, setGameResult] = useState({
    score: 0,
    level: 1,
    lines: 0,
    earnedGold: 0,
    isNewHighScore: false,
    isRankingUpdated: false,
    rankingInfo: undefined as {
      currentRank: number;
      previousRank?: number;
      rankChange?: number;
      totalPlayers: number;
    } | undefined
  });
  const BOARD_WIDTH = 10;
  const BOARD_HEIGHT = 20;

  // onScoreUpdate를 ref로 저장하여 최신 값 참조
  const onScoreUpdateRef = useRef(onScoreUpdate);
  onScoreUpdateRef.current = onScoreUpdate;

  // onLevelUpdate와 onLinesUpdate를 ref로 저장
  const onLevelUpdateRef = useRef(onLevelUpdate);
  onLevelUpdateRef.current = onLevelUpdate;

  const onLinesUpdateRef = useRef(onLinesUpdate);
  onLinesUpdateRef.current = onLinesUpdate;

  // onGameOver를 ref로 저장
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  const [gameState, setGameState] = useState<TetrisGameState>({
    board: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)),
    currentBlock: null,
    nextBlock: null,
    score: 0,
    level: 1,
    lines: 0,
    isGameOver: false,
    isPaused: false,
  });

  const [gameInterval, setGameInterval] = useState<NodeJS.Timeout | null>(null);
  const [isGameStarted, setIsGameStarted] = useState(false);

  // 퀘스트 관련 상태
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLinked, setIsLinked] = useState(false);

  // 플랫폼 연동 상태 확인 (platform-link/status로만 확인)
  const checkPlatformLinkStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/platform-link/status?gameUuid=${userId}`);
      const data = await response.json();
      if (data.success && data.payload?.isLinked) {
        setIsLinked(true);
        onPlatformLinkStatusChange?.(true);
        return true;
      } else {
        setIsLinked(false);
        onPlatformLinkStatusChange?.(false);
        return false;
      }
    } catch (error) {
      console.error('플랫폼 연동 상태 확인 실패:', error);
      setIsLinked(false);
      onPlatformLinkStatusChange?.(false);
      return false;
    }
  }, [userId, onPlatformLinkStatusChange]);

  // 컴포넌트 마운트 시 플랫폼 연동 상태 확인
  useEffect(() => {
    checkPlatformLinkStatus();
  }, [checkPlatformLinkStatus]);

  // 게임 상태 변경 시 부모에게 알림
  useEffect(() => {
    if (onGameStateChange) {
      onGameStateChange({
        score: gameState.score,
        level: gameState.level,
        lines: gameState.lines,
        nextBlock: gameState.nextBlock
      }, isGameStarted);
    }
  }, [gameState.score, gameState.level, gameState.lines, gameState.nextBlock, isGameStarted, onGameStateChange]);


  // 새로운 블록 생성
  const createNewBlock = useCallback((): TetrisBlock => {
    const shapeIndex = Math.floor(Math.random() * TETRIS_SHAPES.length);
    const shape = TETRIS_SHAPES[shapeIndex];
    const color = COLORS[shapeIndex];

    return {
      shape,
      color,
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(shape[0].length / 2),
      y: 0,
    };
  }, []);

  // 블록이 보드 내에 있는지 확인
  const isValidPosition = useCallback((block: TetrisBlock, board: number[][]): boolean => {
    for (let y = 0; y < block.shape.length; y++) {
      for (let x = 0; x < block.shape[y].length; x++) {
        if (block.shape[y][x]) {
          const newX = block.x + x;
          const newY = block.y + y;

          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return false;
          }

          if (newY >= 0 && board[newY][newX] >= 1) { // 1 이상이면 블록이 있는 것
            return false;
          }
        }
      }
    }
    return true;
  }, []);

  // 블록을 보드에 고정
  const placeBlock = useCallback((block: TetrisBlock, board: number[][]): number[][] => {
    const newBoard = board.map(row => [...row]);

    for (let y = 0; y < block.shape.length; y++) {
      for (let x = 0; x < block.shape[y].length; x++) {
        if (block.shape[y][x]) {
          const boardX = block.x + x;
          const boardY = block.y + y;
          if (boardY >= 0) {
            // 블록의 원래 색상을 유지하기 위해 색상 인덱스를 저장
            const colorIndex = COLORS.findIndex(color => color === block.color);
            newBoard[boardY][boardX] = colorIndex >= 0 ? colorIndex + 2 : 1; // 2부터 시작하여 0과 1과 구분
          }
        }
      }
    }

    return newBoard;
  }, []);

  // 완성된 라인 제거
  const clearLines = useCallback((board: number[][]): { newBoard: number[][]; linesCleared: number } => {
    let linesCleared = 0;
    const newBoard = board.filter(row => {
      if (row.every(cell => cell >= 1)) { // 1 이상이면 블록이 있는 것
        linesCleared++;
        return false;
      }
      return true;
    });

    // 제거된 라인만큼 빈 라인 추가
    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(0));
    }

    return { newBoard, linesCleared };
  }, []);

  // 점수 계산
  const calculateScore = useCallback((linesCleared: number, level: number): number => {
    const lineScores = [0, 100, 300, 500, 800];
    return lineScores[linesCleared] * level;
  }, []);


  // 게임오버 처리 통합 함수
  const handleGameOver = useCallback(async (score: number, level: number, lines: number) => {
    try {
      if (isProcessingGameOverRef.current) {
        return;
      }
      isProcessingGameOverRef.current = true;

      // 즉시 로딩 표시 (키 입력 차단됨)
      setShowGameResultModal(false);
      setShowFailureModal(false);
      setIsProcessingGameOver(true);

      console.log('🎮 게임오버 API 호출 시작:', { gameUuid: userId, score, level, lines });

      // 게임오버 API 호출 (하이스코어 저장 + 퀘스트 업데이트 통합 처리)
      const baseUrl = (typeof window !== 'undefined' ? window.location.origin : '') || (process.env.NEXT_PUBLIC_APP_URL || '');
      const response = await fetch(`${baseUrl}/api/game/over`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameUuid: userId,
          score,
          level,
          lines
        })
      });

      // 로딩 해제
      setIsProcessingGameOver(false);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('게임오버 API 호출 실패:', response.status, errorText);

        // 실패 모달 표시
        setFailureMessage(`서버 처리 실패 (${response.status}): ${errorText}`);
        setShowFailureModal(true);

      } else {
        const result = await response.json();
        console.log('✅ 게임오버 API 호출 성공:', result);

        // 하이스코어 업데이트 콜백 호출
        if (onHighScoreUpdate && result.payload?.highScore) {
          onHighScoreUpdate(result.payload.highScore.score, result.payload.highScore.level, result.payload.highScore.lines);
        }

        // 성공 모달 표시 (HISCORE/RANKING 업데이트 여부 포함)
        setGameResult({
          score,
          level,
          lines,
          earnedGold: result.payload?.earnedGold || 0,
          isNewHighScore: result.payload?.isNewHighScore || false,
          isRankingUpdated: !!result.payload?.rankingUpdated,
          rankingInfo: result.payload?.rankingInfo ? {
            currentRank: result.payload.rankingInfo.currentRank,
            previousRank: result.payload.rankingInfo.previousRank,
            rankChange: result.payload.rankingInfo.rankChange,
            totalPlayers: result.payload.rankingInfo.totalPlayers
          } : undefined
        });
        setShowGameResultModal(true);

        // 재화 잔액 업데이트
        if (typeof (window as unknown as { updateCurrencyBalance?: () => void }).updateCurrencyBalance === 'function') {
          (window as unknown as { updateCurrencyBalance: () => void }).updateCurrencyBalance();
        }
      }

      // 게임오버 콜백 호출
      onGameOverRef.current();

    } catch (error) {
      console.error('게임오버 처리 중 오류:', error);

      // 로딩 해제
      setIsProcessingGameOver(false);

      // 네트워크 오류 등 예외 상황
      setFailureMessage(`네트워크 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      setShowFailureModal(true);

      // 게임오버 콜백 호출
      onGameOverRef.current();
    } finally {
      isProcessingGameOverRef.current = false;
    }
  }, [userId, onHighScoreUpdate]);

  // 게임 상태 업데이트
  const updateGame = useCallback(async () => {
    setGameState(prevState => {
      if (prevState.isGameOver || prevState.isPaused) {
        return prevState;
      }

      const newState = { ...prevState };

      if (newState.currentBlock) {
        // 블록을 아래로 이동
        const movedBlock = { ...newState.currentBlock, y: newState.currentBlock.y + 1 };

        if (isValidPosition(movedBlock, newState.board)) {
          newState.currentBlock = movedBlock;
        } else {
          // 블록을 보드에 고정
          newState.board = placeBlock(newState.currentBlock, newState.board);

          // 라인 제거 및 점수 계산
          const { newBoard, linesCleared } = clearLines(newState.board);
          newState.board = newBoard;

          if (linesCleared > 0) {
            const scoreGain = calculateScore(linesCleared, newState.level);
            newState.score += scoreGain;
            newState.lines += linesCleared;
            newState.level = Math.floor(newState.lines / 10) + 1;

            // 상태 업데이트를 다음 렌더 사이클로 지연
            setTimeout(() => {
              onScoreUpdateRef.current(newState.score);
              onLevelUpdateRef.current(newState.level);
              onLinesUpdateRef.current(newState.lines);
            }, 0);

            // 퀘스트 체크는 게임 종료 시 서버에서 자동으로 처리됩니다.
          }

          // 다음 블록 생성
          newState.currentBlock = newState.nextBlock || createNewBlock();
          newState.nextBlock = createNewBlock();

          // 게임 오버 체크
          if (!isValidPosition(newState.currentBlock, newState.board)) {
            newState.isGameOver = true;
            // 오버레이를 즉시 표시 (가드는 handleGameOver 진입 시 설정)
            setIsProcessingGameOver(true);

            // 게임오버 즉시 처리
            const gameOverScore = newState.score;
            const gameOverLevel = newState.level;
            const gameOverLines = newState.lines;
            if (typeof handleGameOver === 'function') {
              handleGameOver(gameOverScore, gameOverLevel, gameOverLines);
            }
          }
        }
      } else {
        // 첫 블록 생성
        newState.currentBlock = createNewBlock();
        newState.nextBlock = createNewBlock();
      }

      return newState;
    });
  }, [isValidPosition, placeBlock, clearLines, calculateScore, createNewBlock, handleGameOver]);

  // 키보드 이벤트 처리
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 로딩 중이면 모든 키 입력 차단
    if (isProcessingGameOver) {
      event.preventDefault();
      return;
    }

    if (gameState.isGameOver || gameState.isPaused) return;

    // 게임 관련 키인지 확인
    const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '];
    if (!gameKeys.includes(event.key)) return;

    // 기본 동작 방지 (페이지 스크롤 등)
    event.preventDefault();

    setGameState(prevState => {
      if (!prevState.currentBlock) return prevState;

      const newState = { ...prevState };

      switch (event.key) {
        case 'ArrowLeft':
          const leftBlock = { ...prevState.currentBlock, x: prevState.currentBlock.x - 1 };
          if (isValidPosition(leftBlock, prevState.board)) {
            newState.currentBlock = leftBlock;
          }
          break;
        case 'ArrowRight':
          const rightBlock = { ...prevState.currentBlock, x: prevState.currentBlock.x + 1 };
          if (isValidPosition(rightBlock, prevState.board)) {
            newState.currentBlock = rightBlock;
          }
          break;
        case 'ArrowDown':
          const downBlock = { ...prevState.currentBlock, y: prevState.currentBlock.y + 1 };
          if (isValidPosition(downBlock, prevState.board)) {
            newState.currentBlock = downBlock;
          }
          break;
        case 'ArrowUp':
          // 블록 회전
          if (prevState.currentBlock) {
            const rotatedShape = prevState.currentBlock.shape[0].map((_, i) =>
              prevState.currentBlock!.shape.map(row => row[row.length - 1 - i])
            );
            const rotatedBlock = { ...prevState.currentBlock, shape: rotatedShape };
            if (isValidPosition(rotatedBlock, prevState.board)) {
              newState.currentBlock = rotatedBlock;
            }
          }
          break;
        case ' ':
          // 하드 드롭 (즉시 떨어뜨리기) - 직접 구현
          if (prevState.currentBlock) {
            let dropDistance = 0;
            const currentBlock = { ...prevState.currentBlock };

            // 블록이 더 이상 떨어질 수 없을 때까지 아래로 이동
            while (isValidPosition({ ...currentBlock, y: currentBlock.y + 1 }, prevState.board)) {
              currentBlock.y += 1;
              dropDistance += 1;
            }

            // 블록을 보드에 고정
            newState.board = placeBlock(currentBlock, prevState.board);

            // 라인 제거 및 점수 계산
            const { newBoard, linesCleared } = clearLines(newState.board);
            newState.board = newBoard;

            if (linesCleared > 0) {
              const scoreGain = calculateScore(linesCleared, newState.level);
              newState.score += scoreGain;
              newState.lines += linesCleared;
              newState.level = Math.floor(newState.lines / 10) + 1;

              // 상태 업데이트를 다음 렌더 사이클로 지연
              setTimeout(() => {
                onScoreUpdateRef.current(newState.score);
                onLevelUpdateRef.current(newState.level);
                onLinesUpdateRef.current(newState.lines);
              }, 0);

              // 퀘스트 체크는 게임 종료 시 서버에서 자동으로 처리됩니다.
            }

            // 하드 드롭 보너스 점수 (떨어진 거리 * 2)
            if (dropDistance > 0) {
              newState.score += dropDistance * 2;

              // 점수 업데이트를 다음 렌더 사이클로 지연
              setTimeout(() => {
                onScoreUpdateRef.current(newState.score);
              }, 0);

              // 하드 드롭 카운트 업데이트
              // setHardDropsUsed(prev => prev + 1);
            }

            // 다음 블록 생성
            newState.currentBlock = newState.nextBlock || createNewBlock();
            newState.nextBlock = createNewBlock();

            // 게임 오버 체크
            if (!isValidPosition(newState.currentBlock, newState.board)) {
              newState.isGameOver = true;
              // 오버레이 즉시 표시 (가드는 handleGameOver 진입 시 설정)
              setIsProcessingGameOver(true);

              // 게임오버 즉시 처리
              const gameOverScore = newState.score;
              const gameOverLevel = newState.level;
              const gameOverLines = newState.lines;
              if (typeof handleGameOver === 'function') {
                handleGameOver(gameOverScore, gameOverLevel, gameOverLines);
              }
            }
          }
          break;
      }

      return newState;
    });
  }, [isProcessingGameOver, gameState.isGameOver, gameState.isPaused, isValidPosition, placeBlock, clearLines, calculateScore, createNewBlock, handleGameOver]);

  // 게임 시작
  const startGame = () => {
    setIsGameStarted(true);
    setGameState(prev => ({
      ...prev,
      board: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)),
      currentBlock: null,
      nextBlock: null,
      score: 0,
      level: 1,
      lines: 0,
      isGameOver: false,
      isPaused: false,
    }));

    // 첫 게임 퀘스트는 게임 종료 시 서버에서 자동으로 체크됩니다.
  };

  // 게임 시작/일시정지
  const togglePause = () => {
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  // 게임 재시작
  const restartGame = () => {
    setIsGameStarted(false);
    setGameState({
      board: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)),
      currentBlock: null,
      nextBlock: null,
      score: 0,
      level: 1,
      lines: 0,
      isGameOver: false,
      isPaused: false,
    });
  };

  // 게임 루프 설정
  useEffect(() => {
    if (isGameStarted && !gameState.isPaused && !gameState.isGameOver) {
      const interval = setInterval(() => {
        updateGame();
      }, 1000 / gameState.level);
      setGameInterval(interval);
      return () => {
        clearInterval(interval);
      };
    } else {
      if (gameInterval) {
        clearInterval(gameInterval);
        setGameInterval(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGameStarted, gameState.isPaused, gameState.isGameOver, gameState.level, updateGame]);

  // 터치 이벤트 처리
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  // 터치 시작
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (gameState.isGameOver || gameState.isPaused) return;

    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setTouchEnd({ x: touch.clientX, y: touch.clientY }); // 초기값 설정
  }, [gameState.isGameOver, gameState.isPaused]);

  // 터치 이동
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (gameState.isGameOver || gameState.isPaused) return;

    e.preventDefault(); // 스크롤 방지
    const touch = e.touches[0];
    setTouchEnd({ x: touch.clientX, y: touch.clientY });
  }, [gameState.isGameOver, gameState.isPaused]);

  // 터치 종료
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (gameState.isGameOver || gameState.isPaused || !touchStart || !touchEnd) {
      setTouchStart(null);
      setTouchEnd(null);
      return;
    }

    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    const minSwipeDistance = 20; // 최소 스와이프 거리 (30px -> 20px로 감소)
    const maxTapDistance = 15; // 최대 탭 거리 (10px -> 15px로 증가)

    // 수직 스와이프 (아래로) - 하드 드롭
    if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY > minSwipeDistance) {
      e.preventDefault();
      // 하드 드롭 로직 (키보드 스페이스바와 동일)
      setGameState(prevState => {
        if (!prevState.currentBlock) return prevState;

        const newState = { ...prevState };
        let dropDistance = 0;
        const currentBlock = { ...prevState.currentBlock };

        // 블록이 더 이상 떨어질 수 없을 때까지 아래로 이동
        while (isValidPosition({ ...currentBlock, y: currentBlock.y + 1 }, prevState.board)) {
          currentBlock.y += 1;
          dropDistance += 1;
        }

        // 블록을 보드에 고정
        newState.board = placeBlock(currentBlock, prevState.board);

        // 라인 제거 및 점수 계산
        const { newBoard, linesCleared } = clearLines(newState.board);
        newState.board = newBoard;

        if (linesCleared > 0) {
          const scoreGain = calculateScore(linesCleared, newState.level);
          newState.score += scoreGain;
          newState.lines += linesCleared;
          newState.level = Math.floor(newState.lines / 10) + 1;

          // 상태 업데이트를 다음 렌더 사이클로 지연
          setTimeout(() => {
            onScoreUpdateRef.current(newState.score);
            onLevelUpdateRef.current(newState.level);
            onLinesUpdateRef.current(newState.lines);
          }, 0);

          // 퀘스트 체크는 게임 종료 시 서버에서 자동으로 처리됩니다.
        }

        // 하드 드롭 점수 추가
        if (dropDistance > 0) {
          newState.score += dropDistance * 2;
          setTimeout(() => onScoreUpdateRef.current(newState.score), 0);
        }

        // 새 블록 생성 (기존 nextBlock을 currentBlock으로, 새로운 블록을 nextBlock으로)
        newState.currentBlock = newState.nextBlock || createNewBlock();
        newState.nextBlock = createNewBlock();

        // 게임 오버 체크
        if (!isValidPosition(newState.currentBlock, newState.board)) {
          newState.isGameOver = true;
          // 오버레이 즉시 표시
          setIsProcessingGameOver(true);
          setTimeout(() => handleGameOver(newState.score, newState.level, newState.lines), 100);
        }

        return newState;
      });
    }
    // 수평 스와이프 (좌우) - 블록 이동
    else if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      e.preventDefault();

      setGameState(prevState => {
        if (!prevState.currentBlock) return prevState;

        const newState = { ...prevState };

        // 스와이프 거리에 따라 이동 거리 결정 (더 빠른 이동)
        const moveDistance = Math.min(Math.floor(Math.abs(deltaX) / 20), 3); // 최대 3칸까지

        if (deltaX > 0) {
          // 오른쪽 스와이프
          for (let i = 1; i <= moveDistance; i++) {
            const rightBlock = { ...prevState.currentBlock, x: prevState.currentBlock.x + i };
            if (isValidPosition(rightBlock, prevState.board)) {
              newState.currentBlock = rightBlock;
            } else {
              break;
            }
          }
        } else {
          // 왼쪽 스와이프
          for (let i = 1; i <= moveDistance; i++) {
            const leftBlock = { ...prevState.currentBlock, x: prevState.currentBlock.x - i };
            if (isValidPosition(leftBlock, prevState.board)) {
              newState.currentBlock = leftBlock;
            } else {
              break;
            }
          }
        }

        return newState;
      });
    }
    // 짧은 터치 - 블록 회전
    else if (Math.abs(deltaX) < maxTapDistance && Math.abs(deltaY) < maxTapDistance) {
      e.preventDefault();

      setGameState(prevState => {
        if (!prevState.currentBlock) return prevState;

        const newState = { ...prevState };

        // 블록 회전 로직 (키보드 위쪽 화살표와 동일)
        const rotatedShape = prevState.currentBlock.shape[0].map((_, i) =>
          prevState.currentBlock!.shape.map(row => row[row.length - 1 - i])
        );
        const rotatedBlock = { ...prevState.currentBlock, shape: rotatedShape };
        if (isValidPosition(rotatedBlock, prevState.board)) {
          newState.currentBlock = rotatedBlock;
        }

        return newState;
      });
    }

    setTouchStart(null);
    setTouchEnd(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.isGameOver, gameState.isPaused, touchStart, touchEnd, isValidPosition, placeBlock, clearLines, calculateScore, handleGameOver]);

  // 키보드 이벤트 리스너
  useEffect(() => {
    if (isGameStarted) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isGameStarted, handleKeyDown]);

  // 고스트 블록 위치 계산
  const ghostBlockPosition = React.useMemo(() => {
    if (!gameState.currentBlock) return null;

    let ghostY = gameState.currentBlock.y;
    while (isValidPosition({ ...gameState.currentBlock, y: ghostY + 1 }, gameState.board)) {
      ghostY++;
    }

    return { ...gameState.currentBlock, y: ghostY };
  }, [gameState.currentBlock, gameState.board, isValidPosition]);

  // 반응형 처리를 위한 ref 및 state


  // 화면 크기에 맞춰 보드 크기 조절
  const [boardDimensions, setBoardDimensions] = useState({ width: 350, height: 700, cellSize: 35 });

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return;

      const isMobile = window.innerWidth < 1024; // lg breakpoint

      // 여백 설정
      const paddingX = 32;
      const paddingY = isMobile ? 200 : 80; // 모바일에서는 하단 컨트롤 공간 확보, 데스크탑은 여유 있게

      const availableWidth = window.innerWidth - paddingX;
      const availableHeight = window.innerHeight - paddingY;

      // 보드 비율 10:20 (1:2)
      // 셀 크기 계산
      const cellWidth = availableWidth / 10;
      const cellHeight = (availableHeight - 80) / 20; // 상단 바(56px) + 여백 등 고려하여 80px 제외

      // 최대 크기 제한 (너무 커지지 않도록)
      const maxCellSize = isMobile ? 50 : 45;

      const newCellSize = Math.floor(Math.min(cellWidth, cellHeight, maxCellSize));

      // 최소 크기 보장
      const finalCellSize = Math.max(newCellSize, 15);

      setBoardDimensions({
        cellSize: finalCellSize,
        width: finalCellSize * 10,
        height: finalCellSize * 20
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getCellSizePx = () => {
    return boardDimensions.cellSize;
  };

  // 보드 렌더링
  const renderBoard = () => {
    const cellSize = getCellSizePx();
    const boardWidth = cellSize * 10;
    const boardHeight = cellSize * 20;

    return (
      <div
        className="inline-block border-2 border-gray-700 bg-black/40 touch-none select-none rounded-lg shadow-inner"
        style={{ touchAction: 'none', userSelect: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(10, ${cellSize}px)`,
            gridTemplateRows: `repeat(20, ${cellSize}px)`,
            width: `${boardWidth}px`,
            height: `${boardHeight}px`,
          }}
        >
          {gameState.board.map((row, y) =>
            row.map((cell, x) => {
              // 현재 떨어지고 있는 블록인지 확인
              let isCurrentBlock = false;
              let blockColor = '';

              if (gameState.currentBlock) {
                const { x: bx, y: by, shape, color } = gameState.currentBlock;
                if (
                  y >= by &&
                  y < by + shape.length &&
                  x >= bx &&
                  x < bx + shape[0].length &&
                  shape[y - by][x - bx]
                ) {
                  isCurrentBlock = true;
                  blockColor = color;
                }
              }

              // 고스트 블록 확인
              let isGhostBlock = false;
              if (!isCurrentBlock && ghostBlockPosition) {
                const { x: gx, y: gy, shape } = ghostBlockPosition;
                if (
                  y >= gy &&
                  y < gy + shape.length &&
                  x >= gx &&
                  x < gx + shape[0].length &&
                  shape[y - gy][x - gx]
                ) {
                  isGhostBlock = true;
                }
              }

              // 셀 색상 결정
              let cellColor: string | undefined = undefined;

              if (cell !== 0) {
                // 고정된 블록
                if (cell === 1) cellColor = '#3b82f6';
                else if (cell >= 2) cellColor = COLORS[cell - 2] || '#3b82f6';
              } else if (isCurrentBlock) {
                cellColor = blockColor;
              }

              return (
                <div
                  key={`${y}-${x}`}
                  className={`border-[0.5px] border-white/5 ${cell !== 0
                    ? ''
                    : isCurrentBlock
                      ? ''
                      : isGhostBlock
                        ? 'bg-white/10'
                        : ''
                    }`}
                  style={{
                    backgroundColor: cellColor,
                  }}
                />
              );
            })
          )}
        </div>
      </div>
    );
  };

  // 다음 블록 렌더링 (미니 버전)
  const renderNextBlockMini = () => {
    if (!gameState.nextBlock) return null;
    const size = 10;
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gameState.nextBlock.shape[0].length}, ${size}px)`,
        gridTemplateRows: `repeat(${gameState.nextBlock.shape.length}, ${size}px)`,
        gap: '1px',
      }}>
        {gameState.nextBlock.shape.map((row, y) =>
          row.map((cell, x) => (
            <div key={`${y}-${x}`} style={{
              width: `${size}px`, height: `${size}px`,
              backgroundColor: cell ? gameState.nextBlock!.color : 'transparent',
              border: cell ? '0.5px solid rgba(255,255,255,0.3)' : 'none'
            }} />
          ))
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden font-sans select-none">
      {/* 배경 그라데이션 효과 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black" />

      {/* 배경 그리드 패턴 (은은하게) */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />

      {/* 메인 컨텐츠 컨테이너 - 스케일링 적용 */}
      <div
        className="relative z-10 flex w-full h-full items-center justify-center p-4"
      >
        {/* [중앙] 게임 보드 (통합 UI) */}
        <div className="relative flex-1 h-full min-w-[320px] min-h-0">
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            {/* 보드 테두리 및 글로우 효과 */}
            <div className="relative rounded-lg overflow-hidden shadow-[0_0_50px_-12px_rgba(59,130,246,0.5)] border border-white/10 bg-black/80 backdrop-blur-md flex flex-col min-w-[320px]">

              {/* [통합 UI] 상단 정보 바 */}
              <div className="w-full h-14 bg-black/60 backdrop-blur-sm border-b border-white/10 z-10 flex items-center justify-between px-4 flex-none">
                <div className="flex gap-6">
                  <div className="flex flex-col justify-center">
                    <span className="text-xs text-slate-400 font-bold uppercase leading-tight">Score</span>
                    <span className="text-lg font-black text-white leading-tight">{gameState.score.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-xs text-slate-400 font-bold uppercase leading-tight">Level</span>
                    <span className="text-lg font-bold text-blue-400 leading-tight">{gameState.level}</span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-xs text-slate-400 font-bold uppercase leading-tight">Lines</span>
                    <span className="text-lg font-bold text-purple-400 leading-tight">{gameState.lines}</span>
                  </div>
                </div>

                {/* Next Block (우측 상단) */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-bold uppercase">Next</span>
                  <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded border border-white/10">
                    {renderNextBlockMini()}
                  </div>
                </div>
              </div>

              {/* Board Area */}
              <div className="flex-1 flex items-center justify-center bg-black/20">
                {renderBoard()}
              </div>

              {/* 게임 오버레이들 */}
              {!isGameStarted && !isProcessingGameOver && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] z-20 cursor-pointer hover:bg-black/50 transition-colors"
                  onClick={startGame}
                >
                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 mb-4 drop-shadow-2xl tracking-tighter pr-2">
                    TETRIS
                  </h1>
                  <div className="text-white/80 text-lg font-medium animate-pulse">
                    Click to Start
                  </div>
                </div>
              )}

              {isProcessingGameOver && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-50">
                  <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <div className="text-white font-bold text-xl animate-pulse">Processing...</div>
                </div>
              )}

              {/* 일시정지 오버레이 */}
              {isGameStarted && gameState.isPaused && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20">
                  <div className="text-2xl font-bold text-white mb-4">PAUSED</div>
                  <div className="flex gap-2">
                    <Button onClick={togglePause} size="sm" variant="outline" className="bg-transparent text-white border-white/20 hover:bg-white/10">Resume</Button>
                    <Button onClick={restartGame} size="sm" variant="outline" className="bg-transparent text-white border-white/20 hover:bg-white/10">Restart</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 컨트롤 버튼 (우측 하단 고정 - 선택 사항) */}
        {isGameStarted && !gameState.isPaused && (
          <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-20 opacity-50 hover:opacity-100 transition-opacity">
            <Button onClick={togglePause} size="icon" variant="ghost" className="text-white hover:bg-white/10 rounded-full">
              <Pause className="w-6 h-6" />
            </Button>
          </div>
        )}



      </div>

      {/* 게임 결과 모달 */}
      <GameResultModal
        isOpen={showGameResultModal}
        onClose={() => setShowGameResultModal(false)}
        gameResult={gameResult}
      />

      {/* 실패 모달 */}
      {showFailureModal && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 text-center max-w-sm mx-4 border border-white/10 shadow-2xl">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Error</h3>
            <p className="text-slate-400 mb-6 text-sm">{failureMessage}</p>
            <Button onClick={() => setShowFailureModal(false)} className="w-full bg-slate-800 hover:bg-slate-700 text-white">
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
