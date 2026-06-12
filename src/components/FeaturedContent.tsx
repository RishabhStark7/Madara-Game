"use client";

import React, { useState } from "react";

export default function FeaturedContent() {
  // Simple simulation of upgrades to make the page interactive
  const [upgrades, setUpgrades] = useState({
    kenjutsu: 1,
    chakraSpeed: 1,
    susanooShield: 1,
  });

  const upgradeSkill = (skill: "kenjutsu" | "chakraSpeed" | "susanooShield") => {
    setUpgrades((prev) => ({
      ...prev,
      [skill]: Math.min(prev[skill] + 1, 5),
    }));
  };

  const skillDescriptions = {
    kenjutsu: {
      name: "Uchiha Kenjutsu (Auto-Slash)",
      cost: upgrades.kenjutsu * 150,
      desc: "Increases auto-attack speed and radius. Current level: " + upgrades.kenjutsu + "/5",
      effect: `Damage multiplier: x${(1 + (upgrades.kenjutsu - 1) * 0.25).toFixed(2)}`,
    },
    chakraSpeed: {
      name: "Katon Mastery (Ultimate)",
      cost: upgrades.chakraSpeed * 200,
      desc: "Increases chakra gain rate from enemies. Current level: " + upgrades.chakraSpeed + "/5",
      effect: `Chakra gain: +${(upgrades.chakraSpeed - 1) * 20}%`,
    },
    susanooShield: {
      name: "Susanoo Aura (Passive)",
      cost: upgrades.susanooShield * 250,
      desc: "Reduces damage taken from heavy bandits. Current level: " + upgrades.susanooShield + "/5",
      effect: `Defense: +${(upgrades.susanooShield - 1) * 10}%`,
    },
  };

  return (
    <section className="w-full max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-16">
      {/* Title Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-500 text-xs font-bold font-mono tracking-widest uppercase">
          ⚔️ Archives & Codex
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-amber-500 tracking-tight uppercase leading-tight font-sans">
          Legend of the Desert Stand
        </h1>
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-zinc-400 font-sans leading-relaxed">
          Unveil the combat records, techniques, and lore of Uchiha Madara as he defends the desert boundaries from waves of black bandits.
        </p>
        <div className="h-1 w-20 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto mt-4" />
      </div>

      {/* Grid: Character profile & Skill Upgrades */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Character Card */}
        <div className="lg:col-span-5 p-6 rounded-2xl glass-panel relative overflow-hidden group border-amber-500/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-3xl group-hover:bg-red-600/10 transition-all duration-500 pointer-events-none" />
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-800 to-amber-600 flex items-center justify-center border border-red-500/20 shadow-md">
                <span className="text-2xl">🔥</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-amber-400 font-mono">MADARA UCHIHA</h3>
                <p className="text-xs text-red-500 font-semibold uppercase tracking-widest font-mono">Clan Leader • Ghost of the Uchiha</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed">
              Renowned as one of history's strongest ninja, Madara possesses peerless Kenjutsu and Fire Style prowess. Driven into the desert expanses, he stands alone against endless waves of dark intruders.
            </p>

            <div className="border-t border-amber-500/10 pt-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-zinc-500">
                <span>Primary Weapon:</span>
                <span className="text-zinc-300 font-bold">Uchiha Katana</span>
              </div>
              <div className="flex justify-between items-center text-zinc-500">
                <span>Special Jutsu:</span>
                <span className="text-red-400 font-bold">Majestic Destroyer Flame</span>
              </div>
              <div className="flex justify-between items-center text-zinc-500">
                <span>Dojutsu:</span>
                <span className="text-cyan-400 font-bold">Sharingan / Rinnegan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tactical Upgrades panel */}
        <div className="lg:col-span-7 p-6 rounded-2xl glass-panel border-amber-500/10 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-extrabold text-amber-400 tracking-wide uppercase font-mono">
              Technique Refinement
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono uppercase">Simulation Panel</span>
          </div>

          <div className="space-y-4">
            {(Object.keys(skillDescriptions) as Array<keyof typeof skillDescriptions>).map((key) => {
              const skill = skillDescriptions[key];
              const level = upgrades[key];
              return (
                <div key={key} className="p-4 rounded-xl bg-black/30 border border-amber-950/15 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-amber-500/20">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-amber-100 font-mono uppercase tracking-wide">
                      {skill.name}
                    </h4>
                    <p className="text-xs text-zinc-500 leading-relaxed font-sans">
                      {skill.desc}
                    </p>
                    <span className="inline-block text-[10px] bg-red-950/20 text-red-400 border border-red-500/10 px-2 py-0.5 rounded font-mono font-bold mt-1">
                      {skill.effect}
                    </span>
                  </div>

                  <button
                    onClick={() => upgradeSkill(key)}
                    disabled={level >= 5}
                    className={`px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase transition-all whitespace-nowrap self-start md:self-auto
                      ${
                        level >= 5
                          ? "bg-zinc-950 border border-zinc-800 text-zinc-600 cursor-not-allowed"
                          : "bg-amber-600/15 hover:bg-amber-600/35 border border-amber-500/30 text-amber-300 active:scale-95"
                      }
                    `}
                  >
                    {level >= 5 ? "MAXED OUT" : `Upgrade [${skill.cost} Pts]`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid: Enemy codex */}
      <div className="space-y-6">
        <h3 className="text-lg font-extrabold text-amber-400 tracking-wide uppercase text-center font-mono">
          Enemy Codex: Black Bandits
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-5 rounded-xl bg-black/45 border border-zinc-850 hover:border-amber-900/30 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-zinc-500 font-mono">CLASS 01</span>
              <span className="w-2 h-2 rounded-full bg-zinc-500" />
            </div>
            <h4 className="text-base font-bold text-zinc-200 uppercase tracking-wide font-mono mb-2 group-hover:text-amber-500 transition-colors">
              Standard Scout
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Standard-issue bandit troop. Moves at moderate speed and carries a single dagger. Defeated in 1 blade strike.
            </p>
            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
              <span>Threat: Low</span>
              <span className="text-amber-500">Value: 1 Pt</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-5 rounded-xl bg-black/45 border border-zinc-850 hover:border-red-950/30 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-red-500 font-mono">CLASS 02</span>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            </div>
            <h4 className="text-base font-bold text-zinc-200 uppercase tracking-wide font-mono mb-2 group-hover:text-red-400 transition-colors">
              Chaser (Red Scarf)
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Equipped with agile gear. Moves rapidly towards the player to catch them off guard. Defeated in 1 strike.
            </p>
            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
              <span>Threat: Medium</span>
              <span className="text-amber-500">Value: 2 Pts</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-5 rounded-xl bg-black/45 border border-zinc-850 hover:border-purple-950/30 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-purple-500 font-mono">CLASS 03</span>
              <span className="w-2 h-2 rounded-full bg-purple-500" />
            </div>
            <h4 className="text-base font-bold text-zinc-200 uppercase tracking-wide font-mono mb-2 group-hover:text-purple-400 transition-colors">
              Heavy Bandit
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Clad in armor plates. Possesses high health and deals massive damage. Drops large amounts of Chakra when defeated.
            </p>
            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
              <span>Threat: High</span>
              <span className="text-amber-500">Value: 3 Pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Arena Mechanics instructions */}
      <div className="p-6 rounded-2xl glass-panel-glow border-amber-500/10 text-center max-w-3xl mx-auto space-y-4">
        <h4 className="text-sm font-extrabold text-amber-400 font-mono uppercase tracking-widest">
          Arena Combat Protocols
        </h4>
        <p className="text-xs text-zinc-400 leading-relaxed max-w-xl mx-auto font-sans">
          To achieve the highest score, draw enemies together in a tight circle (kiting) and slide through them. Your blade will automatically swing, sweeping away groups instantly. When your chakra reaches 100%, trigger the Flame Jutsu to burn away massive waves and establish a new high score.
        </p>
      </div>
    </section>
  );
}
