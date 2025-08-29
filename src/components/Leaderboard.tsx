"use client";

import { useEffect, useState } from "react";

type Entry = {
  id: string;
  score: number;
  linesCleared: number;
  level: number;
  address?: string;
  username?: string;
  date: number;
};

export default function Leaderboard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
      const data = await res.json();
      setEntries(data.scores || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handler = () => load();
    if (typeof window !== "undefined") {
      window.addEventListener("leaderboard:refresh", handler as EventListener);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("leaderboard:refresh", handler as EventListener);
      }
    };
  }, []);

  if (loading) {
    return <div className="text-center text-gray-500">Loading leaderboard...</div>;
  }

  if (entries.length === 0) {
    return <div className="text-center text-gray-400">Belum ada skor. Mainkan game dan submit skor!</div>;
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-2">Leaderboard</h3>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {entries.map((e, i) => (
          <div key={e.id} className="flex items-center justify-between px-4 py-3 border-b last:border-b-0">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold">{i + 1}</div>
              <div>
                <div className="text-sm font-medium">{e.username || (e.address ? `${e.address.slice(0, 6)}...${e.address.slice(-4)}` : 'Anonymous')}</div>
                <div className="text-xs text-gray-500">Lv {e.level} • {e.linesCleared} lines</div>
              </div>
            </div>
            <div className="text-sm font-semibold">{e.score}</div>
          </div>
        ))}
      </div>
      <button onClick={load} className="mt-3 text-sm text-gray-600 underline">Refresh</button>
    </div>
  );
}


