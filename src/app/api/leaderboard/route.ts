import { NextRequest, NextResponse } from "next/server";

type ScoreEntry = {
  id: string;
  address?: string;
  username?: string;
  score: number;
  linesCleared: number;
  level: number;
  date: number;
};

// Ephemeral in-memory store (replace with DB or Irys later)
const scores: ScoreEntry[] = [];

export async function GET() {
  const top = [...scores]
    .sort((a, b) => b.score - a.score || b.linesCleared - a.linesCleared || b.level - a.level)
    .slice(0, 50);
  return NextResponse.json({ scores: top });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { score, linesCleared, level, address, username } = body || {};
    if (typeof score !== "number" || score < 0) {
      return NextResponse.json({ error: "Invalid score" }, { status: 400 });
    }
    const entry: ScoreEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      score: Math.floor(score),
      linesCleared: Math.max(0, Math.floor(linesCleared || 0)),
      level: Math.max(0, Math.floor(level || 0)),
      address,
      username,
      date: Date.now(),
    };
    scores.push(entry);
    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}



