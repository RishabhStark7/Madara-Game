"use client";

import React, { useState } from "react";
import NinjaGame from "@/components/NinjaGame";
import FeaturedContent from "@/components/FeaturedContent";

export default function Home() {
  const [isGameOpen, setIsGameOpen] = useState(true);

  const handleCloseGame = () => {
    setIsGameOpen(false);
    // Smooth scroll down to featured content
    setTimeout(() => {
      const element = document.getElementById("featured-content");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const handleOpenGame = () => {
    setIsGameOpen(true);
    // Smooth scroll back up to the game container
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#0a0512] to-[#11091c] text-[#f4effa]">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-amber-950/20 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-red-800 to-amber-600 border border-red-500/25 flex items-center justify-center font-bold font-mono text-sm text-white">
            U
          </div>
          <div>
            <span className="font-extrabold text-amber-500 tracking-wider text-base font-mono uppercase">Unoriz Arena</span>
            <span className="hidden sm:inline-block ml-2 text-[10px] text-zinc-500 font-mono tracking-widest uppercase bg-zinc-950/45 px-2 py-0.5 rounded border border-zinc-900">
              V1.0.0
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-4">
          <a
            href="#featured-content"
            className="text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-amber-500 transition-colors font-mono"
          >
            Archives
          </a>
          {!isGameOpen ? (
            <button
              onClick={handleOpenGame}
              className="px-4 py-2 text-xs font-extrabold uppercase tracking-widest bg-red-800/15 hover:bg-red-800/35 border border-red-500/30 text-red-400 rounded-lg transition-all hover:scale-105 active:scale-95 font-mono flex items-center gap-1.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
              Re-open Arena
            </button>
          ) : (
            <button
              onClick={handleCloseGame}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-widest glass-panel text-amber-500 rounded-lg hover:bg-amber-950/25 transition-all font-mono"
            >
              Close Game
            </button>
          )}
        </nav>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full flex flex-col items-center">
        {/* Game Container Section with collapsible height animation */}
        <div
          className={`w-full max-w-6xl px-4 sm:px-6 lg:px-8 pt-8 transition-all duration-700 ease-in-out overflow-hidden
            ${
              isGameOpen
                ? "opacity-100 max-h-[700px] mb-8"
                : "opacity-0 max-h-0 mb-0 pointer-events-none"
            }
          `}
        >
          {isGameOpen && <NinjaGame onCloseGame={handleCloseGame} />}
        </div>

        {/* Small header reminder if game is closed */}
        {!isGameOpen && (
          <div className="w-full max-w-6xl px-4 sm:px-6 lg:px-8 mt-6">
            <div className="p-4 rounded-xl glass-panel-glow border-red-950/20 bg-red-950/5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <p className="text-xs text-zinc-400 font-sans">
                  The combat arena has been closed. Ready to jump back into battle as Madara?
                </p>
              </div>
              <button
                onClick={handleOpenGame}
                className="w-full sm:w-auto px-5 py-2 text-xs font-extrabold uppercase tracking-widest bg-gradient-to-r from-red-800 to-red-600 hover:from-red-700 hover:to-red-500 text-amber-100 rounded-lg border border-red-500/20 transition-all hover:scale-105 active:scale-95 font-mono"
              >
                Launch Arena
              </button>
            </div>
          </div>
        )}

        {/* Separator */}
        <div className="w-full border-t border-amber-950/10 my-8" />

        {/* Featured Content Below */}
        <div id="featured-content" className="w-full pt-4 scroll-mt-24">
          <FeaturedContent />
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 px-6 border-t border-amber-950/15 bg-black/40 text-center font-mono text-[10px] text-zinc-600">
        <p>© 2026 UNORIZ ARENA. DEVELOPED FOR UCHIHA LEGENDS INC.</p>
        <p className="mt-1.5 text-zinc-700">POWERED BY NEXT.JS, TAILWIND CSS & CANVAS ENGINE</p>
      </footer>
    </div>
  );
}
