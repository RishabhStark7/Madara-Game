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
      name: "Laser Core (Continuous Beam)",
      cost: upgrades.kenjutsu * 150,
      desc: "Improves emitter frequencies. Increases continuous target-locking laser tick damage. Current level: " + upgrades.kenjutsu + "/5",
      effect: `Damage multiplier: x${(1 + (upgrades.kenjutsu - 1) * 0.20).toFixed(2)}`,
    },
    chakraSpeed: {
      name: "Repulsor Overdrive (Autopilot)",
      cost: upgrades.chakraSpeed * 200,
      desc: "Increases overcharge movement speed and autopilot regular bot sweep speed. Current level: " + upgrades.chakraSpeed + "/5",
      effect: `Speed modifier: +${(upgrades.chakraSpeed - 1) * 12}% sweep rate`,
    },
    susanooShield: {
      name: "Back-Mounted Micro-Missiles",
      cost: upgrades.susanooShield * 250,
      desc: "Improves missile launcher systems, increasing missile blast damage and payload size during ultimate. Current level: " + upgrades.susanooShield + "/5",
      effect: `Missile payload boost: +${(upgrades.susanooShield - 1) * 15}% splash radius`,
    },
  };

  return (
    <section className="w-full max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-16">
      {/* Title Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-800 bg-slate-900/30 text-slate-350 text-xs font-bold font-mono tracking-widest uppercase">
          🛸 Cybernetic Archives & Tech Codex
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-100 tracking-tight uppercase leading-tight font-sans">
          Archives of the Bot Invasions
        </h1>
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-450 font-sans leading-relaxed">
          Access the combat records, weapon specifications, and robotic threat databases of Iron Man as he defends the galactic void from rogue AI bots.
        </p>
        <div className="h-0.5 w-20 bg-gradient-to-r from-transparent via-slate-600 to-transparent mx-auto mt-4" />
      </div>

      {/* Grid: Character profile & Skill Upgrades */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Character Card */}
        <div className="lg:col-span-5 p-6 rounded-2xl glass-panel relative overflow-hidden group border-slate-800">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-600/5 rounded-full blur-3xl group-hover:bg-slate-650/10 transition-all duration-500 pointer-events-none" />
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border border-slate-600 shadow-md">
                <span className="text-2xl">⚡</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-200 font-mono">IRON MAN (v1.8)</h3>
                <p className="text-xs text-slate-450 font-semibold uppercase tracking-widest font-mono">Stark Tech • Blocky Skin Edition</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-400 font-sans leading-relaxed">
              Drifting through coordinates of deep space, Iron Man commands absolute laser energy and heavy rocket payloads. He repels waves of AI bots, firing a continuous target-locking laser and launching homing missile barrages to clear boss mechs.
            </p>

            <div className="border-t border-slate-800/40 pt-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-slate-500">
                <span>Primary Weapon:</span>
                <span className="text-slate-350 font-bold">Laser Core (Continuous Beam)</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Special Ability:</span>
                <span className="text-slate-350 font-bold">Homing Missile Barrage</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Power Core:</span>
                <span className="text-slate-350 font-bold">Arc Reactor (Suit Power)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tactical Upgrades panel */}
        <div className="lg:col-span-7 p-6 rounded-2xl glass-panel border-slate-800 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-extrabold text-slate-200 tracking-wide uppercase font-mono">
              Stark Tech Upgrade Panel
            </h3>
            <span className="text-[10px] text-slate-500 font-mono uppercase">Simulation Panel</span>
          </div>

          <div className="space-y-4">
            {(Object.keys(skillDescriptions) as Array<keyof typeof skillDescriptions>).map((key) => {
              const skill = skillDescriptions[key];
              const level = upgrades[key];
              return (
                <div key={key} className="p-4 rounded-xl bg-black/35 border border-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-slate-700">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wide">
                      {skill.name}
                    </h4>
                    <p className="text-xs text-slate-450 leading-relaxed font-sans">
                      {skill.desc}
                    </p>
                    <span className="inline-block text-[10px] bg-slate-800/40 text-slate-300 border border-slate-700 px-2 py-0.5 rounded font-mono font-bold mt-1">
                      {skill.effect}
                    </span>
                  </div>

                  <button
                    onClick={() => upgradeSkill(key)}
                    disabled={level >= 5}
                    className={`px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase transition-all whitespace-nowrap self-start md:self-auto
                      ${
                        level >= 5
                          ? "bg-slate-950 border border-slate-900 text-slate-700 cursor-not-allowed"
                          : "bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-250 active:scale-95"
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
        <h3 className="text-lg font-extrabold text-slate-200 tracking-wide uppercase text-center font-mono">
          Robotic Threat Codex: AI Invasions
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-5 rounded-xl bg-black/45 border border-zinc-900 hover:border-slate-850 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-zinc-500 font-mono">CLASS 01</span>
              <span className="w-2 h-2 rounded-full bg-slate-500" />
            </div>
            <h4 className="text-base font-bold text-zinc-200 uppercase tracking-wide font-mono mb-2 group-hover:text-slate-100 transition-colors">
              Creeper Bot v1 (Normal)
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Standard mechanical bot. Walks towards Iron Man to inflict damage on contact. Shoots plasma bolts occasionally. Deactivated easily by the continuous target-locking laser.
            </p>
            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
              <span>Contact: 5 HP • Shot: 0.5 HP</span>
              <span className="text-slate-400">Value: 1 Pt</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-5 rounded-xl bg-black/45 border border-zinc-900 hover:border-slate-850 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-450 font-mono">CLASS 02</span>
              <span className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
            </div>
            <h4 className="text-base font-bold text-zinc-200 uppercase tracking-wide font-mono mb-2 group-hover:text-slate-100 transition-colors">
              Hover Drone v2 (Fast)
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Highly agile drone equipped with rocket thrusters. Moves fast and fires square plasma charges from long distances. Dies in under a second of laser focus.
            </p>
            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
              <span>Contact: 4 HP • Shot: 0.5 HP</span>
              <span className="text-slate-400">Value: 2 Pts</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-5 rounded-xl bg-black/45 border border-zinc-900 hover:border-slate-850 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 font-mono">CLASS 03</span>
              <span className="w-2 h-2 rounded-full bg-slate-650" />
            </div>
            <h4 className="text-base font-bold text-zinc-200 uppercase tracking-wide font-mono mb-2 group-hover:text-slate-100 transition-colors">
              Titan Mech v3 (Heavy)
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Large, armored robot. Has high health (3 HP) and deals severe impact damage. Drops substantial energy power on destruction.
            </p>
            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
              <span>Contact: 10 HP • Shot: 0.5 HP</span>
              <span className="text-slate-400">Value: 3 Pts</span>
            </div>
          </div>
        </div>

        {/* Boss Section */}
        <div className="p-5 rounded-xl bg-black/45 border border-slate-800/40 hover:border-slate-700 transition-all group max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 font-mono">⚡ BOSS VILLAIN CLASS</span>
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500 animate-ping" />
          </div>
          <h4 className="text-lg font-bold text-slate-200 uppercase tracking-widest font-mono mb-2 group-hover:text-slate-100 transition-colors text-center">
            AI Core Titan Bosses
          </h4>
          <p className="text-xs text-zinc-400 leading-relaxed mb-4 text-center">
            Spawns at score milestones **15, 40, 70, 100, 130...** with massive health matrices. Fires dangerous **5-way spread plasma cubes** targeting Iron Man. Homing missiles track them as priority targets. Defeating them grants a large Suit Power boost, 10 points, and heals Iron Man's suit by 30 HP!
          </p>
          <div className="flex justify-between items-center text-[10px] text-zinc-550 font-mono border-t border-slate-850 pt-3 mt-3">
            <span>Health: 12 HP + Milestone Scaling</span>
            <span>Contact: 15 HP • Shot: 0.5 HP</span>
            <span className="text-slate-350 font-bold">Reward: +10 Pts & +30 HP Systems Restored</span>
          </div>
        </div>
      </div>

      {/* Arena Mechanics instructions */}
      <div className="p-6 rounded-2xl glass-panel border-slate-800 text-center max-w-3xl mx-auto space-y-4">
        <h4 className="text-sm font-extrabold text-slate-350 font-mono uppercase tracking-widest">
          Stark Suit Combat Protocols
        </h4>
        <p className="text-xs text-zinc-450 leading-relaxed max-w-xl mx-auto font-sans">
          Fly towards the mouse cursor automatically on desktop, or use the joystick on mobile devices. The continuous laser automatically targets and locks onto the closest on-screen enemy *only while moving*, ramping up damage and triggering splash micro-explosions. Activating **Repulsor Mega Attack** (ultimate overcharge) overrides manual controls with autopilot to fly to a safe screen corner, and launches intensive homing missiles from Iron Man's back that seek out and destroy all targets on screen, prioritizing boss mechs!
        </p>
      </div>
    </section>
  );
}
