"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Cell = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7; // 0 empty; 1-7 colored

type Point = { x: number; y: number };

type Shape = number[][]; // matrix

const BOARD_COLS = 10;
const BOARD_ROWS = 20;
const CELL_SIZE = 20; // px (scaled via CSS container)

const COLORS = [
  "#00000000", // empty
  "#00BCD4", // I
  "#FF9800", // L
  "#3F51B5", // J
  "#FFC107", // O
  "#4CAF50", // S
  "#F44336", // Z
  "#9C27B0", // T
];

const SHAPES: Shape[] = [
  // I
  [
    [1, 1, 1, 1],
  ],
  // L
  [
    [2, 0, 0],
    [2, 2, 2],
  ],
  // J
  [
    [0, 0, 3],
    [3, 3, 3],
  ],
  // O
  [
    [4, 4],
    [4, 4],
  ],
  // S
  [
    [0, 5, 5],
    [5, 5, 0],
  ],
  // Z
  [
    [6, 6, 0],
    [0, 6, 6],
  ],
  // T
  [
    [0, 7, 0],
    [7, 7, 7],
  ],
];

function rotate(shape: Shape): Shape {
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rotated[c][rows - 1 - r] = shape[r][c];
    }
  }
  return rotated;
}

function randomShape(): Shape {
  const idx = Math.floor(Math.random() * SHAPES.length);
  // Deep copy to avoid mutation issues
  return SHAPES[idx].map((row) => row.slice());
}

function createEmptyBoard(): Cell[][] {
  return Array.from({ length: BOARD_ROWS }, () => Array<Cell>(BOARD_COLS).fill(0 as Cell));
}

function collides(board: Cell[][], shape: Shape, pos: Point): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      const val = shape[r][c] as Cell;
      if (!val) continue;
      const x = pos.x + c;
      const y = pos.y + r;
      if (x < 0 || x >= BOARD_COLS || y >= BOARD_ROWS) return true;
      if (y >= 0 && board[y][x]) return true;
    }
  }
  return false;
}

function merge(board: Cell[][], shape: Shape, pos: Point): Cell[][] {
  const copy = board.map((row) => row.slice());
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      const val = shape[r][c] as Cell;
      if (!val) continue;
      const x = pos.x + c;
      const y = pos.y + r;
      if (y >= 0 && y < BOARD_ROWS && x >= 0 && x < BOARD_COLS) {
        copy[y][x] = val;
      }
    }
  }
  return copy;
}

function clearLines(board: Cell[][]): { next: Cell[][]; cleared: number } {
  const next: Cell[][] = [];
  let cleared = 0;
  for (let r = 0; r < BOARD_ROWS; r++) {
    const full = board[r].every((v) => v !== 0);
    if (full) {
      cleared++;
    } else {
      next.push(board[r]);
    }
  }
  while (next.length < BOARD_ROWS) {
    next.unshift(Array<Cell>(BOARD_COLS).fill(0 as Cell));
  }
  return { next, cleared };
}

interface TetrisGameProps {
  address?: string;
  username?: string;
}

export default function TetrisGame({ address, username }: TetrisGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nextRef = useRef<HTMLCanvasElement | null>(null);
  const [board, setBoard] = useState<Cell[][]>(() => createEmptyBoard());
  const [current, setCurrent] = useState<Shape>(() => randomShape());
  const [nextPiece, setNextPiece] = useState<Shape>(() => randomShape());
  const [pos, setPos] = useState<Point>({ x: 3, y: -2 });
  const [score, setScore] = useState(0);
  const [linesClearedTotal, setLinesClearedTotal] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [dropMs, setDropMs] = useState(700);
  const [paused, setPaused] = useState(false);
  const [best, setBest] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  const canvasSize = useMemo(() => ({
    width: BOARD_COLS * CELL_SIZE,
    height: BOARD_ROWS * CELL_SIZE,
  }), []);

  const draw = useCallback((ctx: CanvasRenderingContext2D, stateBoard: Cell[][], shape: Shape, p: Point) => {
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    // Draw board
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const v = stateBoard[r][c];
        if (v) {
          ctx.fillStyle = COLORS[v];
          ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
        } else {
          ctx.fillStyle = "#f5f5f5";
          ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
        }
      }
    }
    // Draw current
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        const v = shape[r][c] as Cell;
        if (!v) continue;
        const x = p.x + c;
        const y = p.y + r;
        if (y >= 0) {
          ctx.fillStyle = COLORS[v];
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
        }
      }
    }
  }, [canvasSize.height, canvasSize.width]);

  const drawNext = useCallback((ctx: CanvasRenderingContext2D, shape: Shape) => {
    const size = 4;
    const cell = 18;
    ctx.clearRect(0, 0, size * cell, size * cell);
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, size * cell, size * cell);
    // center shape
    const offsetX = Math.floor((size - shape[0].length) / 2);
    const offsetY = Math.floor((size - shape.length) / 2);
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        const v = shape[r][c] as Cell;
        if (!v) continue;
        ctx.fillStyle = COLORS[v];
        ctx.fillRect((c + offsetX) * cell, (r + offsetY) * cell, cell - 1, cell - 1);
      }
    }
  }, []);

  // Render loop
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    draw(ctx, board, current, pos);
  }, [board, current, pos, draw]);

  useEffect(() => {
    const ctx = nextRef.current?.getContext("2d");
    if (!ctx) return;
    drawNext(ctx, nextPiece);
  }, [nextPiece, drawNext]);

  // Auto drop
  useEffect(() => {
    if (gameOver || paused) return;
    const timer = setInterval(() => {
      setPos((prev) => {
        const next = { x: prev.x, y: prev.y + 1 };
        if (collides(board, current, next)) {
          // merge and spawn next
          const merged = merge(board, current, prev);
          const { next: clearedBoard, cleared } = clearLines(merged);
          if (cleared) {
            setScore((s) => s + (cleared === 1 ? 100 : cleared === 2 ? 300 : cleared === 3 ? 500 : 800) * level);
            setLinesClearedTotal((x) => x + cleared);
            setLevel((lv) => 1 + Math.floor((linesClearedTotal + cleared) / 10));
            setDropMs((ms) => Math.max(120, ms - 20 * cleared));
          }
          const nextShape = nextPiece;
          const startPos = { x: 3, y: -2 };
          const blocked = collides(clearedBoard, nextShape, startPos);
          setBoard(clearedBoard);
          setCurrent(nextShape);
          setNextPiece(randomShape());
          if (blocked) {
            setGameOver(true);
          }
          return startPos;
        }
        return next;
      });
    }, dropMs);
    return () => clearInterval(timer);
  }, [board, current, dropMs, gameOver, paused, level, linesClearedTotal, nextPiece]);

  const hardDrop = useCallback(() => {
    let y = pos.y;
    while (!collides(board, current, { x: pos.x, y: y + 1 })) y++;
    setPos({ x: pos.x, y });
  }, [board, current, pos.x, pos.y]);

  const move = useCallback((dx: number) => {
    const next = { x: pos.x + dx, y: pos.y };
    if (!collides(board, current, next)) setPos(next);
  }, [board, current, pos.x, pos.y]);

  const rotatePiece = useCallback(() => {
    const rotated = rotate(current);
    // Wall kick simple
    const candidates = [0, -1, 1, -2, 2];
    for (const kick of candidates) {
      const next = { x: pos.x + kick, y: pos.y };
      if (!collides(board, rotated, next)) {
        setCurrent(rotated);
        setPos(next);
        break;
      }
    }
  }, [board, current, pos.x, pos.y]);

  const reset = () => {
    setBoard(createEmptyBoard());
    setCurrent(randomShape());
    setNextPiece(randomShape());
    setPos({ x: 3, y: -2 });
    setScore(0);
    setLinesClearedTotal(0);
    setLevel(1);
    setDropMs(700);
    setGameOver(false);
    setPaused(false);
    setSubmitMsg(null);
    setIsSubmitting(false);
  };

  const submitScore = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, linesCleared: linesClearedTotal, level, username: (username || playerName) || undefined, address }),
      });
      if (!res.ok) throw new Error("Failed to submit score");
      setSubmitMsg("Skor berhasil dikirim!");
      // notify leaderboard to refresh
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("leaderboard:refresh"));
      }
    } catch (e) {
      setSubmitMsg("Gagal submit skor. Coba lagi.");
    }
    setIsSubmitting(false);
  };

  // Keyboard controls and pause
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "p") {
        setPaused((p) => !p);
        return;
      }
      if (gameOver || paused) return;
      if (e.key === "ArrowLeft") move(-1);
      else if (e.key === "ArrowRight") move(1);
      else if (e.key === "ArrowDown") setPos((p) => ({ x: p.x, y: p.y + 1 }));
      else if (e.key.toLowerCase() === "x" || e.key === "ArrowUp") rotatePiece();
      else if (e.key.toLowerCase() === " ") hardDrop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gameOver, hardDrop, move, rotatePiece, paused]);

  // Best score in localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = Number(localStorage.getItem("tetris:best") || 0);
    setBest(Number.isFinite(saved) ? saved : 0);
  }, []);
  useEffect(() => {
    if (gameOver) {
      setBest((prev) => {
        const next = Math.max(prev, score);
        if (typeof window !== "undefined") {
          localStorage.setItem("tetris:best", String(next));
        }
        return next;
      });
    }
  }, [gameOver, score]);

  // Prefill player name from wallet when available
  useEffect(() => {
    if (username) setPlayerName(username);
    else if (address) setPlayerName(`${address.slice(0, 6)}...${address.slice(-4)}`);
  }, [address, username]);

  // Touch controls
  const touchStart = useRef<Point | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    const threshold = 24; // px
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > threshold) {
        move(1);
        touchStart.current = { x: t.clientX, y: t.clientY };
      } else if (dx < -threshold) {
        move(-1);
        touchStart.current = { x: t.clientX, y: t.clientY };
      }
    } else {
      if (dy > threshold) {
        setPos((p) => ({ x: p.x, y: p.y + 1 }));
        touchStart.current = { x: t.clientX, y: t.clientY };
      } else if (dy < -40) {
        rotatePiece();
        touchStart.current = { x: t.clientX, y: t.clientY };
      }
    }
  };
  const onTouchEnd = () => {
    touchStart.current = null;
  };

  return (
    <div className="w-full flex flex-col items-center gap-3 select-none">
      <div className="flex items-center justify-between w-full max-w-md">
        <div>
          <div className="text-lg font-semibold">Score: {score}</div>
          <div className="text-xs text-gray-500">Best: {best}</div>
        </div>
        <div className="text-sm text-gray-600">Lv {level} • {linesClearedTotal} lines</div>
        <div className="flex gap-2">
          <button
            onClick={() => setPaused((p) => !p)}
            className="px-3 py-2 bg-gray-100 rounded-xl border border-gray-200 hover:bg-gray-200"
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={reset}
            className="px-3 py-2 bg-gray-100 rounded-xl border border-gray-200 hover:bg-gray-200"
          >
            {gameOver ? "Restart" : "Reset"}
          </button>
        </div>
      </div>

      <div className="w-full max-w-md flex items-start gap-3">
        <div
          className="mx-auto neon-border"
          style={{ width: canvasSize.width, height: canvasSize.height }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="border border-gray-200 rounded-md touch-none neon-glow"
          />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs text-gray-500">Next</div>
          <canvas ref={nextRef} width={72} height={72} className="border border-gray-200 rounded-md neon-glow" />
          <div className="text-xs text-gray-400 max-w-[80px] text-center hidden sm:block">Tap ⟳ to rotate</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 w-full max-w-md">
        <button className="neon-btn rounded-xl py-3" onClick={() => move(-1)}>
          ←
        </button>
        <button className="neon-btn rounded-xl py-3" onClick={rotatePiece}>
          ⟳
        </button>
        <button className="neon-btn rounded-xl py-3" onClick={() => move(1)}>
          →
        </button>
        <button className="neon-btn-primary rounded-xl py-3" onClick={hardDrop}>
          ⤓
        </button>
      </div>

      {gameOver && (
        <div className="w-full max-w-md space-y-3">
          <div className="text-center text-red-600 font-medium">Game Over</div>
          <div className="flex gap-2">
            <input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Nama (opsional)"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl"
              disabled={Boolean(username)}
            />
            <button
              onClick={submitScore}
              disabled={isSubmitting}
              className="px-4 py-2 bg-black text-white rounded-xl disabled:opacity-60"
            >
              {isSubmitting ? "Menyimpan..." : "Submit Score"}
            </button>
          </div>
          {submitMsg && (
            <div className="text-center text-sm text-gray-600">{submitMsg}</div>
          )}
        </div>
      )}
    </div>
  );
}


