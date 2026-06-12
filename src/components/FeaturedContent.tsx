"use client";

import React, { useState } from "react";

export default function FeaturedContent() {
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
      desc: "Increases auto-attack swing speed and sweep radius. Current level: " + upgrades.kenjutsu + "/5",
      effect: `Damage multiplier: x${(1 + (upgrades.kenjutsu - 1) * 0.25).toFixed(2)}`,
    },
    chakraSpeed: {
      name: "Katon: Fireball Storm",
      cost: upgrades.chakraSpeed * 200,
      desc: "Increases speed and AoE damage of fireballs thrown in Susanoo state. Current level: " + upgrades.chakraSpeed + "/5",
      effect: `AoE Blast: +${(upgrades.chakraSpeed - 1) * 15}% area`,
    },
    susanooShield: {
      name: "Susanoo Shield (Healing Boost)",
      cost: upgrades.susanooShield * 250,
      desc: "Reduces damage taken from bullets and contact. Current level: " + upgrades.susanooShield + "/5",
      effect: `Heal bonus: +${(upgrades.susanooShield - 1) * 5}% recovery`,
    },
  };

  return (
    <section className="w-full max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-16">
      {/* Title Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-xs font-bold font-mono tracking-widest uppercase">
          🛸 Cosmic Archives & Codex
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-cyan-400 tracking-tight uppercase leading-tight font-sans glow-text-cyan">
          Archives of the Cosmic Stand
        </h1>
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-zinc-400 font-sans leading-relaxed">
          Unveil the combat records, stellar jutsu databases, and threat manuals of Uchiha Madara as he defends the galactic void from invading bandits.
        </p>
        <div className="h-0.5 w-20 bg-gradient-to-r from-transparent via-cyan-500 to-transparent mx-auto mt-4" />
      </div>

      {/* Grid: Character profile & Skill Upgrades */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Character Card */}
        <div className="lg:col-span-5 p-6 rounded-2xl glass-panel relative overflow-hidden group border-cyan-500/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 rounded-full blur-3xl group-hover:bg-purple-600/10 transition-all duration-500 pointer-events-none" />
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-800 to-cyan-600 flex items-center justify-center border border-cyan-500/20 shadow-md">
                <span className="text-2xl">🌌</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-cyan-400 font-mono">MADARA UCHIHA</h3>
                <p className="text-xs text-purple-400 font-semibold uppercase tracking-widest font-mono">Clan Leader • Ghost of the Uchiha</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed">
              Drifting alone through the deep space void, Madara commands absolute Kenjutsu power and ancient chakra armor. He repels endless waves of void bandits, slicing them down on contact and utilizing fireballs to sweep entire sectors.
            </p>

            <div className="border-t border-cyan-500/10 pt-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-zinc-500">
                <span>Primary Weapon:</span>
                <span className="text-zinc-300 font-bold">Uchiha Katana</span>
              </div>
              <div className="flex justify-between items-center text-zinc-500">
                <span>Special Jutsu:</span>
                <span className="text-red-400 font-bold">Susanoo Fireball Storm</span>
              </div>
              <div className="flex justify-between items-center text-zinc-500">
                <span>Dojutsu:</span>
                <span className="text-cyan-400 font-bold">Sharingan / Rinnegan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tactical Upgrades panel */}
        <div className="lg:col-span-7 p-6 rounded-2xl glass-panel border-cyan-500/10 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-extrabold text-cyan-400 tracking-wide uppercase font-mono">
              Technique Refinement
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono uppercase">Simulation Panel</span>
          </div>

          <div className="space-y-4">
            {(Object.keys(skillDescriptions) as Array<keyof typeof skillDescriptions>).map((key) => {
              const skill = skillDescriptions[key];
              const level = upgrades[key];
              return (
                <div key={key} className="p-4 rounded-xl bg-black/35 border border-cyan-950/15 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-cyan-500/20">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-cyan-100 font-mono uppercase tracking-wide">
                      {skill.name}
                    </h4>
                    <p className="text-xs text-zinc-500 leading-relaxed font-sans">
                      {skill.desc}
                    </p>
                    <span className="inline-block text-[10px] bg-purple-950/20 text-purple-400 border border-purple-500/10 px-2 py-0.5 rounded font-mono font-bold mt-1">
                      {skill.effect}
                    </span>
                  </div>

                  <button
                    onClick={() => upgradeSkill(key)}
                    disabled={level >= 5}
                    className={`px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase transition-all whitespace-nowrap self-start md:self-auto
                      ${
                        level >= 5
                          ? "bg-zinc-950 border border-zinc-800 text-zinc-650 cursor-not-allowed"
                          : "bg-cyan-600/15 hover:bg-cyan-600/35 border border-cyan-500/30 text-cyan-300 active:scale-95"
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
        <h3 className="text-lg font-extrabold text-cyan-400 tracking-wide uppercase text-center font-mono glow-text-cyan">
          Space Enemy Codex: Void Raiders
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-5 rounded-xl bg-black/45 border border-zinc-900 hover:border-cyan-950/30 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-zinc-500 font-mono">CLASS 01</span>
              <span className="w-2 h-2 rounded-full bg-zinc-500" />
            </div>
            <h4 className="text-base font-bold text-zinc-200 uppercase tracking-wide font-mono mb-2 group-hover:text-cyan-400 transition-colors">
              Void Scout (Melee)
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Standard-issue grunt. Walks towards Madara to deal contact damage. Fires bullets occasionally. Dies in 1 katana strike.
            </p>
            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
              <span>Contact: 5 HP • Shot: 0.5 HP</span>
              <span className="text-cyan-400">Value: 1 Pt</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-5 rounded-xl bg-black/45 border border-zinc-900 hover:border-purple-950/30 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-purple-400 font-mono">CLASS 02</span>
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            </div>
            <h4 className="text-base font-bold text-zinc-200 uppercase tracking-wide font-mono mb-2 group-hover:text-purple-400 transition-colors">
              Void Chaser (Ranged)
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Highly agile unit carrying cyan pulse charges. Moves fast and shoots frequently from a distance. Dies in 1 strike.
            </p>
            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
              <span>Contact: 4 HP • Shot: 0.5 HP</span>
              <span className="text-cyan-400">Value: 2 Pts</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-5 rounded-xl bg-black/45 border border-zinc-900 hover:border-red-950/30 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-red-500 font-mono">CLASS 03</span>
              <span className="w-2 h-2 rounded-full bg-red-500" />
            </div>
            <h4 className="text-base font-bold text-zinc-200 uppercase tracking-wide font-mono mb-2 group-hover:text-red-400 transition-colors">
              Overlord Dreadnought
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Large, armored shock troop. Possesses high health (3 HP) and deals severe damage on touch. Drops large chakra amounts.
            </p>
            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
              <span>Contact: 10 HP • Shot: 0.5 HP</span>
              <span className="text-cyan-400">Value: 3 Pts</span>
            </div>
          </div>
        </div>

        {/* Boss Section */}
        <div className="p-5 rounded-xl bg-black/45 border border-red-950/20 hover:border-red-950/50 transition-all group max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-red-500 font-mono">⚡ BOSS VILLAIN CLASS</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
          </div>
          <h4 className="text-lg font-bold text-red-400 uppercase tracking-widest font-mono mb-2 group-hover:text-red-300 transition-colors text-center">
            Bandit Overlord Leaders
          </h4>
          <p className="text-xs text-zinc-400 leading-relaxed mb-4 text-center">
            Spawns at score milestones **15, 40, 70, 100, 130...** with massive health scaling. Equipped with heavy energy armor. Stops periodically to fire dangerous **5-way spread bullets** targeting Madara. Defeating them grants a large chakra cores, 10 points, and heals Madara by 15 HP!
          </p>
          <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono border-t border-red-950/15 pt-3 mt-3">
            <span>Health: 12 HP + Milestone Scaling</span>
            <span>Contact: 15 HP • Shot: 0.5 HP</span>
            <span className="text-yellow-400 font-bold">Reward: +10 Pts & +15 HP</span>
          </div>
        </div>
      </div>

      {/* Arena Mechanics instructions */}
      <div className="p-6 rounded-2xl glass-panel-glow border-cyan-500/10 text-center max-w-3xl mx-auto space-y-4">
        <h4 className="text-sm font-extrabold text-cyan-400 font-mono uppercase tracking-widest">
          Stellar Combat Mechanics
        </h4>
        <p className="text-xs text-zinc-400 leading-relaxed max-w-xl mx-auto font-sans">
          Maneuver through stardust. Evade bullets by flying in wide arcs. Draw enemies together in groups (kiting) to slice them down with auto-attacks. Activating **Susanoo** triggers a +20% HP heal, builds a shielding aura, and automatically fires high-damage explosive fireballs at targets to clear sectors quickly.
        </p>
      </div>
    </section>
  );
}
