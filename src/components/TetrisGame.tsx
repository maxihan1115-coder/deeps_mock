'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TetrisGameState, TetrisBlock } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, RotateCw, ArrowLeft, ArrowRight, ArrowDown } from 'lucide-react';

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

// 퀘스트 ID 매핑
const QUEST_IDS = {
  FIRST_GAME: '1',
  SCORE_1000: '2',
  SCORE_5000: '3',
  SCORE_10000: '4',
  CLEAR_LINES_10: '5',
  CLEAR_LINES_50: '6',
  REACH_LEVEL_5: '7',
  REACH_LEVEL_10: '8',
  PLAY_GAMES_5: '9',
  PLAY_GAMES_20: '10',
  HARD_DROP_10: '11',
  DAILY_LOGIN: '12'
};

interface TetrisGameProps {
  userId: string;
  onScoreUpdate: (score: number) => void;
  onLevelUpdate: (level: number) => void;
  onLinesUpdate: (lines: number) => void;
  onGameOver: () => void;
}

export default function TetrisGame({ userId, onScoreUpdate, onLevelUpdate, onLinesUpdate, onGameOver }: TetrisGameProps) {
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
  const [isLinked, setIsLinked] = useState(false);
  const [hardDropsUsed, setHardDropsUsed] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [hasCheckedFirstGame, setHasCheckedFirstGame] = useState(false);

  // 플랫폼 연동 상태 확인
  const checkPlatformLinkStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/platform-link/status?gameUuid=${userId}`);
      const data = await response.json();
      
      if (data.success && data.payload.isLinked) {
        setIsLinked(true);
        return true;
      } else {
        setIsLinked(false);
        return false;
      }
    } catch (error) {
      console.error('플랫폼 연동 상태 확인 실패:', error);
      setIsLinked(false);
      return false;
    }
  }, [userId]);

  // 퀘스트 진행도 업데이트
  const updateQuestProgress = useCallback(async (questId: string, progress: number) => {
    if (!isLinked) return; // 플랫폼 연동이 안되어 있으면 퀘스트 업데이트 안함
    
    try {
      const response = await fetch('/api/quests/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          questId: questId,
          progress: progress
        })
      });
      
      if (!response.ok) {
        console.error('퀘스트 업데이트 실패:', response.status);
      }
    } catch (error) {
      console.error('퀘스트 업데이트 오류:', error);
    }
  }, [isLinked, userId]);

  // 게임 시작 시 퀘스트 체크
  const checkFirstGameQuest = useCallback(() => {
    if (!hasCheckedFirstGame && isLinked) {
      updateQuestProgress(QUEST_IDS.FIRST_GAME, 1);
      setHasCheckedFirstGame(true);
    }
  }, [hasCheckedFirstGame, isLinked, updateQuestProgress]);

  // 점수 관련 퀘스트 체크
  const checkScoreQuests = useCallback((score: number) => {
    if (!isLinked) return;
    
    if (score >= 1000) {
      updateQuestProgress(QUEST_IDS.SCORE_1000, 1);
    }
    if (score >= 5000) {
      updateQuestProgress(QUEST_IDS.SCORE_5000, 1);
    }
    if (score >= 10000) {
      updateQuestProgress(QUEST_IDS.SCORE_10000, 1);
    }
  }, [isLinked, updateQuestProgress]);

  // 라인 제거 관련 퀘스트 체크
  const checkLinesQuests = useCallback((totalLines: number) => {
    if (!isLinked) return;
    
    updateQuestProgress(QUEST_IDS.CLEAR_LINES_10, Math.min(totalLines, 10));
    updateQuestProgress(QUEST_IDS.CLEAR_LINES_50, Math.min(totalLines, 50));
  }, [isLinked, updateQuestProgress]);

  // 레벨 관련 퀘스트 체크
  const checkLevelQuests = useCallback((level: number) => {
    if (!isLinked) return;
    
    if (level >= 5) {
      updateQuestProgress(QUEST_IDS.REACH_LEVEL_5, 1);
    }
    if (level >= 10) {
      updateQuestProgress(QUEST_IDS.REACH_LEVEL_10, 1);
    }
  }, [isLinked, updateQuestProgress]);

  // 게임 플레이 관련 퀘스트 체크
  const checkPlayGamesQuests = useCallback((gamesCount: number) => {
    if (!isLinked) return;
    
    updateQuestProgress(QUEST_IDS.PLAY_GAMES_5, Math.min(gamesCount, 5));
    updateQuestProgress(QUEST_IDS.PLAY_GAMES_20, Math.min(gamesCount, 20));
  }, [isLinked, updateQuestProgress]);

  // 하드 드롭 관련 퀘스트 체크
  const checkHardDropQuests = useCallback((hardDropsCount: number) => {
    if (!isLinked) return;
    
    updateQuestProgress(QUEST_IDS.HARD_DROP_10, Math.min(hardDropsCount, 10));
  }, [isLinked, updateQuestProgress]);

  // 컴포넌트 마운트 시 플랫폼 연동 상태 확인
  useEffect(() => {
    checkPlatformLinkStatus();
  }, [checkPlatformLinkStatus]);

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



  // 게임 상태 업데이트
  const updateGame = useCallback(() => {
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
            
            // 퀘스트 체크 (점수, 라인, 레벨)
            checkScoreQuests(newState.score);
            checkLinesQuests(newState.lines);
            checkLevelQuests(newState.level);
          }
          
          // 다음 블록 생성
          newState.currentBlock = newState.nextBlock || createNewBlock();
          newState.nextBlock = createNewBlock();
          
          // 게임 오버 체크
          if (!isValidPosition(newState.currentBlock, newState.board)) {
            newState.isGameOver = true;
            
            // 게임 오버 핸들러를 다음 렌더 사이클로 지연
            setTimeout(() => {
              onGameOverRef.current();
            }, 0);
            
            // 게임 오버 시 게임 플레이 퀘스트 체크
            const newGamesPlayed = gamesPlayed + 1;
            setGamesPlayed(newGamesPlayed);
            checkPlayGamesQuests(newGamesPlayed);
          }
        }
      } else {
        // 첫 블록 생성
        newState.currentBlock = createNewBlock();
        newState.nextBlock = createNewBlock();
      }
      
      return newState;
    });
  }, [isValidPosition, placeBlock, clearLines, calculateScore, createNewBlock, checkScoreQuests, checkLinesQuests, checkLevelQuests]);

  // 키보드 이벤트 처리
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
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
              
              // 퀘스트 체크 (점수, 라인, 레벨)
              checkScoreQuests(newState.score);
              checkLinesQuests(newState.lines);
              checkLevelQuests(newState.level);
            }

            // 하드 드롭 보너스 점수 (떨어진 거리 * 2)
            if (dropDistance > 0) {
              newState.score += dropDistance * 2;
              
              // 점수 업데이트를 다음 렌더 사이클로 지연
              setTimeout(() => {
                onScoreUpdateRef.current(newState.score);
              }, 0);
              
              // 하드 드롭 퀘스트 체크
              const newHardDropsCount = hardDropsUsed + 1;
              setHardDropsUsed(newHardDropsCount);
              checkHardDropQuests(newHardDropsCount);
            }
            
            // 다음 블록 생성
            newState.currentBlock = newState.nextBlock || createNewBlock();
            newState.nextBlock = createNewBlock();
            
            // 게임 오버 체크
            if (!isValidPosition(newState.currentBlock, newState.board)) {
              newState.isGameOver = true;
              
              // 게임 오버 핸들러를 다음 렌더 사이클로 지연
              setTimeout(() => {
                onGameOverRef.current();
              }, 0);
              
              // 게임 오버 시 게임 플레이 퀘스트 체크
              const newGamesPlayed = gamesPlayed + 1;
              setGamesPlayed(newGamesPlayed);
              checkPlayGamesQuests(newGamesPlayed);
            }
          }
          break;
      }
      
      return newState;
    });
  }, [gameState.isGameOver, gameState.isPaused, isValidPosition, placeBlock, clearLines, calculateScore, createNewBlock, checkScoreQuests, checkLinesQuests, checkLevelQuests, checkHardDropQuests, checkPlayGamesQuests, hardDropsUsed, gamesPlayed]);

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
    
    // 첫 게임 퀘스트 체크
    checkFirstGameQuest();
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
      const interval = setInterval(updateGame, 1000 / gameState.level);
      setGameInterval(interval);
      return () => clearInterval(interval);
    } else {
      if (gameInterval) {
        clearInterval(gameInterval);
        setGameInterval(null);
      }
    }
  }, [isGameStarted, gameState.isPaused, gameState.isGameOver, gameState.level, updateGame]);

  // 키보드 이벤트 리스너
  useEffect(() => {
    if (isGameStarted) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isGameStarted, handleKeyDown]);

  // 보드 렌더링
  const renderBoard = () => {
    const displayBoard = gameState.board.map(row => [...row]);
    
    // 현재 블록을 보드에 표시 (게임이 시작된 경우에만)
    if (isGameStarted && gameState.currentBlock) {
      for (let y = 0; y < gameState.currentBlock.shape.length; y++) {
        for (let x = 0; x < gameState.currentBlock.shape[y].length; x++) {
          if (gameState.currentBlock.shape[y][x]) {
            const boardX = gameState.currentBlock.x + x;
            const boardY = gameState.currentBlock.y + y;
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              displayBoard[boardY][boardX] = 1;
            }
          }
        }
      }
    }

    return (
      <div className={`grid grid-cols-10 gap-0 border-2 border-gray-300 bg-gray-100 ${
        !isGameStarted ? 'opacity-50' : ''
      }`}>
        {displayBoard.map((row, y) =>
          row.map((cell, x) => {
            // 현재 블록의 색상 확인
            let cellColor = 'white';
            if (cell) {
              if (isGameStarted && gameState.currentBlock) {
                // 현재 블록이 있는 위치인지 확인
                const isCurrentBlock = (() => {
                  for (let by = 0; by < gameState.currentBlock.shape.length; by++) {
                    for (let bx = 0; bx < gameState.currentBlock.shape[by].length; bx++) {
                      if (gameState.currentBlock.shape[by][bx]) {
                        const boardX = gameState.currentBlock.x + bx;
                        const boardY = gameState.currentBlock.y + by;
                        if (boardX === x && boardY === y) {
                          return true;
                        }
                      }
                    }
                  }
                  return false;
                })();
                
                if (isCurrentBlock) {
                  cellColor = gameState.currentBlock.color;
                } else {
                  // 고정된 블록의 색상 (cell 값이 2 이상이면 블록 타입 인덱스)
                  if (cell >= 2) {
                    const blockIndex = cell - 2;
                    cellColor = COLORS[blockIndex] || '#3b82f6';
                  } else if (cell === 1) {
                    cellColor = '#3b82f6'; // 기본 파란색 (기존 블록)
                  }
                }
              } else {
                // 고정된 블록의 색상
                if (cell >= 2) {
                  const blockIndex = cell - 2;
                  cellColor = COLORS[blockIndex] || '#3b82f6';
                } else if (cell === 1) {
                  cellColor = '#3b82f6'; // 기본 파란색 (기존 블록)
                }
              }
            }
            
            return (
              <div
                key={`${y}-${x}`}
                className="w-6 h-6 border border-gray-200"
                style={{
                  backgroundColor: cellColor
                }}
              />
            );
          })
        )}
      </div>
    );
  };

  // 다음 블록 렌더링
  const renderNextBlock = () => {
    if (!gameState.nextBlock) return null;

    const maxCols = Math.max(...gameState.nextBlock.shape.map(row => row.length));
    const maxRows = gameState.nextBlock.shape.length;

    return (
      <div 
        className="border border-gray-300 bg-gray-100 p-4 flex justify-center items-center"
        style={{
          minWidth: `${maxCols * 24 + 32}px`,
          minHeight: `${maxRows * 24 + 32}px`
        }}
      >
        <div 
          className="grid gap-0"
          style={{
            gridTemplateColumns: `repeat(${maxCols}, 24px)`,
            gridTemplateRows: `repeat(${maxRows}, 24px)`
          }}
        >
          {gameState.nextBlock.shape.map((row, y) =>
            row.map((cell, x) => (
              <div
                key={`next-${y}-${x}`}
                className="w-6 h-6 border border-gray-200"
                style={{
                  backgroundColor: cell && gameState.nextBlock ? gameState.nextBlock.color : 'transparent'
                }}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex gap-8 justify-center items-start p-8">
      {/* 게임 보드 */}
      <Card className="w-80">
        <CardHeader>
          <CardTitle className="text-center">테트리스</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 relative">
          {renderBoard()}
          
          {/* 게임 시작 전 오버레이 */}
          {!isGameStarted && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center rounded-lg">
              <div className="text-center space-y-6">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                  BORA TETRIS
                </h2>
                <Button
                  onClick={startGame}
                  className="text-xl font-semibold px-8 py-3 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 hover:from-yellow-500 hover:via-orange-600 hover:to-red-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  START
                </Button>
              </div>
            </div>
          )}
          
          {/* 컨트롤 버튼 */}
          {isGameStarted && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (gameState.currentBlock) {
                    const leftBlock = { ...gameState.currentBlock, x: gameState.currentBlock.x - 1 };
                    if (isValidPosition(leftBlock, gameState.board)) {
                      setGameState(prev => ({ ...prev, currentBlock: leftBlock }));
                    }
                  }
                }}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (gameState.currentBlock) {
                    const rightBlock = { ...gameState.currentBlock, x: gameState.currentBlock.x + 1 };
                    if (isValidPosition(rightBlock, gameState.board)) {
                      setGameState(prev => ({ ...prev, currentBlock: rightBlock }));
                    }
                  }
                }}
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (gameState.currentBlock) {
                    const downBlock = { ...gameState.currentBlock, y: gameState.currentBlock.y + 1 };
                    if (isValidPosition(downBlock, gameState.board)) {
                      setGameState(prev => ({ ...prev, currentBlock: downBlock }));
                    }
                  }
                }}
              >
                <ArrowDown className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (gameState.currentBlock) {
                    const rotatedShape = gameState.currentBlock.shape[0].map((_, i) =>
                      gameState.currentBlock!.shape.map(row => row[row.length - 1 - i])
                    );
                    const rotatedBlock = { ...gameState.currentBlock, shape: rotatedShape };
                    if (isValidPosition(rotatedBlock, gameState.board)) {
                      setGameState(prev => ({ ...prev, currentBlock: rotatedBlock }));
                    }
                  }
                }}
              >
                <RotateCw className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          {/* 키보드 컨트롤 안내 */}
          {isGameStarted && (
            <div className="text-xs text-gray-500 text-center space-y-1">
              <p>← → : 이동 | ↑ : 회전 | ↓ : 빠른 하강 | 스페이스바 : 즉시 떨어뜨리기</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 게임 정보 */}
      <Card className="w-80">
        <CardHeader>
          <CardTitle>게임 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 플랫폼 연동 상태 */}
          <div className="p-3 rounded-lg border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">플랫폼 연동:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                isLinked 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {isLinked ? '연동됨' : '미연동'}
              </span>
            </div>
            {!isLinked && (
              <p className="text-xs text-gray-500 mt-1">
                퀘스트 진행도를 저장하려면 플랫폼 연동이 필요합니다
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span>점수:</span>
              <span className="font-bold">{gameState.score}</span>
            </div>
            <div className="flex justify-between">
              <span>레벨:</span>
              <span className="font-bold">{gameState.level}</span>
            </div>
            <div className="flex justify-between">
              <span>라인:</span>
              <span className="font-bold">{gameState.lines}</span>
            </div>
            <div className="flex justify-between">
              <span>하드 드롭:</span>
              <span className="font-bold">{hardDropsUsed}</span>
            </div>
            <div className="flex justify-between">
              <span>게임 수:</span>
              <span className="font-bold">{gamesPlayed}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-center">다음 블록</h3>
            <div className="flex justify-center">
              {renderNextBlock()}
            </div>
          </div>

          <div className="space-y-2">
            {!isGameStarted ? (
              <Button
                onClick={startGame}
                className="w-full"
                variant="default"
              >
                <Play className="w-4 h-4 mr-2" />
                게임 시작
              </Button>
            ) : (
              <>
                <Button
                  onClick={togglePause}
                  className="w-full"
                  variant={gameState.isPaused ? "default" : "outline"}
                >
                  {gameState.isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                  {gameState.isPaused ? '계속' : '일시정지'}
                </Button>
                
                <Button
                  onClick={restartGame}
                  className="w-full"
                  variant="outline"
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  재시작
                </Button>
              </>
            )}
          </div>

          {gameState.isGameOver && (
            <div className="text-center p-4 bg-red-100 rounded-lg">
              <p className="font-bold text-red-600">게임 오버!</p>
              <p className="text-sm text-red-500">최종 점수: {gameState.score}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
