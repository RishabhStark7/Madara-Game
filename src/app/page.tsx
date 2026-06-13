"use client";

import React, { useState } from "react";
import AvengerGame from "@/components/AvengerGame";
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
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#0b0f19] to-[#111827] text-[#f8fafc]">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-850 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center font-bold font-mono text-sm text-slate-100">
            I
          </div>
          <div>
            <span className="font-extrabold text-slate-100 tracking-wider text-base font-mono uppercase">Stark Arena</span>
            <span className="hidden sm:inline-block ml-2 text-[10px] text-slate-350 font-mono tracking-widest uppercase bg-slate-800/40 px-2 py-0.5 rounded border border-slate-700">
              Bot Invasion
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-4">
          <a
            href="#featured-content"
            className="text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-100 transition-colors font-mono"
          >
            Archives
          </a>
          {!isGameOpen ? (
            <button
              onClick={handleOpenGame}
              className="px-4 py-2 text-xs font-extrabold uppercase tracking-widest bg-slate-800/30 hover:bg-slate-800/60 border border-slate-700 text-slate-200 rounded-lg transition-all hover:scale-105 active:scale-95 font-mono flex items-center gap-1.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-ping" />
              Re-open Arena
            </button>
          ) : (
            <button
              onClick={handleCloseGame}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-widest glass-panel text-slate-200 hover:text-slate-100 rounded-lg hover:bg-slate-800/40 transition-all font-mono"
            >
              Close Arena
            </button>
          )}
        </nav>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full flex flex-col items-center">
        {/* Game Container Section with collapsible height animation */}
        <div
          className={`w-full max-w-6xl px-2 landscape:px-4 sm:px-6 lg:px-8 pt-4 landscape:pt-2 sm:pt-8 transition-all duration-700 ease-in-out overflow-hidden
            ${
              isGameOpen
                ? "opacity-100 max-h-[800px] mb-4 sm:mb-8"
                : "opacity-0 max-h-0 mb-0 pointer-events-none"
            }
          `}
        >
          {isGameOpen && <AvengerGame onCloseGame={handleCloseGame} />}
        </div>

        {/* Small header reminder if game is closed */}
        {!isGameOpen && (
          <div className="w-full max-w-6xl px-4 sm:px-6 lg:px-8 mt-6">
            <div className="p-4 rounded-xl glass-panel border-slate-850 bg-slate-900/5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-500"></span>
                </span>
                <p className="text-xs text-slate-400 font-sans">
                  The cyber battle arena has been closed. Ready to launch back into space battle as Iron Man?
                </p>
              </div>
              <button
                onClick={handleOpenGame}
                className="w-full sm:w-auto px-5 py-2 text-xs font-extrabold uppercase tracking-widest bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-750 text-slate-200 rounded-lg border border-slate-650 transition-all hover:scale-105 active:scale-95 font-mono"
              >
                Launch Arena
              </button>
            </div>
          </div>
        )}

        {/* Separator */}
        <div className="w-full border-t border-slate-900/10 my-8" />

        {/* Featured Content Below */}
        <div id="featured-content" className="w-full pt-4 scroll-mt-24">
          <FeaturedContent />
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 px-6 border-t border-slate-900/15 bg-black/60 text-center font-mono text-[10px] text-slate-600">
        <p>© 2026 CYBERNETIC ARENA. DEVELOPED FOR STARK SPACE INDUSTRIES INC.</p>
        <p className="mt-1.5 text-slate-750">POWERED BY NEXT.JS, TAILWIND CSS & CANVAS ENGINE</p>
      </footer>
    </div>
  );
}
