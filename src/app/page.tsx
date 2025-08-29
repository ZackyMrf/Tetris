"use client";

import { useState } from "react";
import TetrisGame from "@/components/TetrisGame";
import { WalletAuthButton } from "@/components/WalletAuthButton";

export default function Home() {
  const [user, setUser] = useState<{ address: string; username?: string } | null>(null);

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="scanlines" />
      <header className="px-6 py-6 text-center">
        <div className="inline-block px-4 py-2 rounded-xl glass-card neon-border animated-gradient">
          <h1 className="text-2xl font-bold neon-gradient-text">Tetris MiniApp</h1>
          <p className="text-xs text-gray-300">Cyberpunk Edition</p>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 pb-10">
        <div className="w-full max-w-md space-y-6 glass-card neon-border p-4 rounded-2xl">
          {!user && (
            <div className="space-y-3">
              <div className="text-center text-sm text-gray-300">Connect wallet untuk mulai</div>
              <WalletAuthButton onAuthSuccess={setUser} />
            </div>
          )}
          <TetrisGame address={user?.address} username={user?.username} />
        </div>
      </main>
    </div>
  );
}
