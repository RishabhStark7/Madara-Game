"use client";

import React, { useRef, useState, useEffect } from "react";

// Types for entities
interface Player {
  worldX: number;
  worldY: number;
  hp: number;
  maxHp: number;
  suitPower: number;
  maxSuitPower: number;
  angle: number;
  speed: number;
  isAttacking: boolean;
  attackCooldown: number;
  isUltimateActive: boolean;
  ultimateDuration: number;
  iFrames: number;
}

interface Enemy {
  id: number;
  worldX: number;
  worldY: number;
  type: "normal" | "fast" | "heavy" | "boss";
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  scoreValue: number;
  angle: number;
  shootCooldown: number;
  bossName?: string;
}

interface Projectile {
  id: number;
  worldX: number;
  worldY: number;
  vx: number;
  vy: number;
  size: number;
  damage: number;
  owner: "player" | "enemy";
  color: string;
  isExplosive?: boolean;
  isMissile?: boolean;
  targetId?: number;
}

interface Particle {
  worldX: number;
  worldY: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  type: "impact" | "nebula" | "fire" | "chakra" | "heal" | "smoke" | "shockwave";
  growth?: number;
}

interface FloatingText {
  id: number;
  worldX: number;
  worldY: number;
  text: string;
  color: string;
  alpha: number;
  size: number;
  vy: number;
}

interface Props {
  onCloseGame: () => void;
}

export default function AvengerGame({ onCloseGame }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Game state
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameover">("menu");
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [killCount, setKillCount] = useState<number>(0);
  const [hasVibrated, setHasVibrated] = useState<boolean>(false);

  // Backing refs to avoid closure staleness inside 60fps loop
  const scoreRef = useRef<number>(0);
  const killCountRef = useRef<number>(0);
  const highScoreRef = useRef<number>(0);

  // References to keep values inside game loop without re-triggering effects
  const gameStateRef = useRef<"menu" | "playing" | "gameover">("menu");
  gameStateRef.current = gameState;

  // Joystick state
  const joystickActive = useRef<boolean>(false);
  const joystickStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const joystickOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const joystickVector = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [joystickUIOffset, setJoystickUIOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mouse/Target state
  const mousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isMouseInCanvas = useRef<boolean>(false);

  // Game entities (stored in refs for 60fps performance)
  const player = useRef<Player>({
    worldX: 0,
    worldY: 0,
    hp: 100,
    maxHp: 100,
    suitPower: 0,
    maxSuitPower: 100,
    angle: 0,
    speed: 7.0,
    isAttacking: false,
    attackCooldown: 0,
    isUltimateActive: false,
    ultimateDuration: 0,
    iFrames: 0,
  });

  const enemies = useRef<Enemy[]>([]);
  const projectiles = useRef<Projectile[]>([]);
  const particles = useRef<Particle[]>([]);
  const floatingTexts = useRef<FloatingText[]>([]);
  const camera = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const activeNormalLaser = useRef<{ targetX: number; targetY: number } | null>(null);
  const laserCP = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lockTimer = useRef<number>(0);
  const currentLockedId = useRef<number | null>(null);
  const screenShake = useRef<number>(0);
  
  // Infinite Parallax Stars Setup (3 layers of static stars that wrap)
  const starLayers = useRef<Array<Array<{ x: number; y: number; opacity: number }>>>([[], [], []]);

  // Background Planets for deep space parallax
  const planets = useRef([
    { x: 200, y: 150, r: 65, baseColor: "#ffcc80", shadowColor: "#a35200", hasRings: true },
    { x: 1200, y: 550, r: 40, baseColor: "#f48fb1", shadowColor: "#880e4f", hasRings: false },
    { x: -500, y: -250, r: 50, baseColor: "#80deea", shadowColor: "#006064", hasRings: false },
    { x: 800, y: -600, r: 30, baseColor: "#c5e1a5", shadowColor: "#33691e", hasRings: false },
  ]);

  // Boss fight tracking (endless progression)
  const nextBossMilestone = useRef<number>(15);
  const bossCount = useRef<number>(0);
  const activeBoss = useRef<Enemy | null>(null);
  const [bossHUD, setBossHUD] = useState<{ name: string; hp: number; maxHp: number } | null>(null);

  const frameCount = useRef<number>(0);
  const nextEnemyId = useRef<number>(1);
  const nextProjectileId = useRef<number>(1);
  const nextTextId = useRef<number>(1);

  const addFloatingText = (worldX: number, worldY: number, text: string, color: string, size = 16) => {
    floatingTexts.current.push({
      id: nextTextId.current++,
      worldX,
      worldY,
      text,
      color,
      alpha: 1.0,
      size,
      vy: -1.2,
    });
  };

  // Initialize star placement once on mount
  useEffect(() => {
    // Layer 0: 60 far stars
    for (let i = 0; i < 60; i++) {
      starLayers.current[0].push({
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        opacity: Math.random() * 0.5 + 0.2,
      });
    }
    // Layer 1: 40 medium stars
    for (let i = 0; i < 40; i++) {
      starLayers.current[1].push({
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        opacity: Math.random() * 0.6 + 0.3,
      });
    }
    // Layer 2: 20 near stars
    for (let i = 0; i < 20; i++) {
      starLayers.current[2].push({
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        opacity: Math.random() * 0.7 + 0.3,
      });
    }

    const saved = localStorage.getItem("avenger_highscore");
    if (saved) {
      setHighScore(parseInt(saved, 10));
    }
    setHasVibrated(typeof navigator !== "undefined" && !!navigator.vibrate);
  }, []);

  // Handle resizing
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [gameState]);

  // Main game animation loop
  useEffect(() => {
    let animationId: number;

    const gameLoop = () => {
      if (gameStateRef.current === "playing") {
        updateGame();
        drawGame();
      }
      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Start a new game
  const startGame = () => {
    player.current = {
      worldX: 0,
      worldY: 0,
      hp: 100,
      maxHp: 100,
      suitPower: 0,
      maxSuitPower: 100,
      angle: 0,
      speed: 7.0,
      isAttacking: false,
      attackCooldown: 0,
      isUltimateActive: false,
      ultimateDuration: 0,
      iFrames: 0,
    };
    enemies.current = [];
    projectiles.current = [];
    particles.current = [];
    floatingTexts.current = [];
    camera.current = { x: -300, y: -250 };
    nextBossMilestone.current = 15;
    bossCount.current = 0;
    activeBoss.current = null;
    activeNormalLaser.current = null;
    lockTimer.current = 0;
    currentLockedId.current = null;
    screenShake.current = 0;
    setBossHUD(null);
    scoreRef.current = 0;
    killCountRef.current = 0;
    setScore(0);
    setKillCount(0);
    setGameState("playing");

    // Spawn some ambient cosmic dust particles initial
    for (let i = 0; i < 30; i++) {
      spawnInitialDustParticle();
    }
  };

  // Trigger Ultimate (Repulsor Mega Beam Overcharge + Healing)
  const triggerUltimate = () => {
    const p = player.current;
    if (p.suitPower >= p.maxSuitPower && !p.isUltimateActive) {
      p.isUltimateActive = true;
      p.ultimateDuration = 180; // 3 seconds of ultimate
      p.suitPower = 0;

      // Heal player by 20% of max HP (which is 20 HP)
      const healAmount = Math.round(p.maxHp * 0.20);
      p.hp = Math.min(p.maxHp, p.hp + healAmount);

      // Create screen flash
      createScreenFlash("rgba(0, 229, 255, 0.45)", 20);

      // Floating text alerts
      addFloatingText(p.worldX, p.worldY - 45, "REPULSOR MEGA BEAM!", "#ffd54f", 20);
      addFloatingText(p.worldX, p.worldY - 25, `+${healAmount} HP (SYSTEM HEAL)`, "#00e676", 16);

      // Spawn glowing cyan power particles
      for (let i = 0; i < 15; i++) {
        particles.current.push({
          worldX: p.worldX + (Math.random() - 0.5) * 30,
          worldY: p.worldY + (Math.random() - 0.5) * 30,
          vx: (Math.random() - 0.5) * 4,
          vy: -Math.random() * 3 - 1,
          color: "#00e5ff",
          size: Math.random() * 3.5 + 2,
          alpha: 1.0,
          decay: 0.02,
          type: "heal",
        });
      }

      if (hasVibrated) {
        navigator.vibrate([150, 70, 150]);
      }
    }
  };

  // Virtual Joystick touch listeners
  const handleTouchStart = (e: React.TouchEvent) => {
    if (gameStateRef.current !== "playing") return;
    const touch = e.touches[0];
    joystickActive.current = true;
    joystickStart.current = { x: touch.clientX, y: touch.clientY };
    joystickOffset.current = { x: 0, y: 0 };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!joystickActive.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - joystickStart.current.x;
    const dy = touch.clientY - joystickStart.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = 45;

    if (distance > maxRadius) {
      const angle = Math.atan2(dy, dx);
      joystickOffset.current = {
        x: Math.cos(angle) * maxRadius,
        y: Math.sin(angle) * maxRadius,
      };
      joystickVector.current = {
        x: Math.cos(angle),
        y: Math.sin(angle),
      };
    } else {
      joystickOffset.current = { x: dx, y: dy };
      joystickVector.current = {
        x: dx / maxRadius,
        y: dy / maxRadius,
      };
    }

    setJoystickUIOffset({ x: joystickOffset.current.x, y: joystickOffset.current.y });
  };

  const handleTouchEnd = () => {
    joystickActive.current = false;
    joystickOffset.current = { x: 0, y: 0 };
    joystickVector.current = { x: 0, y: 0 };
    setJoystickUIOffset({ x: 0, y: 0 });
  };

  // Listen to spacebar for ultimate activation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && gameStateRef.current === "playing") {
        e.preventDefault();
        triggerUltimate();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Update logic (60fps)
  const updateGame = () => {
    frameCount.current++;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
    const canvasHeight = canvas.height / (window.devicePixelRatio || 1);

    const p = player.current;

    // Decrement I-frames
    if (p.iFrames > 0) {
      p.iFrames--;
    }

    // 1. Move Player
    let moveX = 0;
    let moveY = 0;

    if (p.isUltimateActive) {
      // Autopilot: Move towards a corner where there are less enemies and hover/fire from there
      const cornerMargin = 80;
      const corners = [
        { x: camera.current.x + cornerMargin, y: camera.current.y + cornerMargin }, // top-left
        { x: camera.current.x + canvasWidth - cornerMargin, y: camera.current.y + cornerMargin }, // top-right
        { x: camera.current.x + cornerMargin, y: camera.current.y + canvasHeight - cornerMargin }, // bottom-left
        { x: camera.current.x + canvasWidth - cornerMargin, y: camera.current.y + canvasHeight - cornerMargin }, // bottom-right
      ];

      // Find the corner with the minimum number of enemies nearby (within 300px)
      let bestCorner = corners[0];
      let minEnemyCount = Infinity;

      for (const corner of corners) {
        let count = 0;
        for (const enemy of enemies.current) {
          const dx = enemy.worldX - corner.x;
          const dy = enemy.worldY - corner.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 300) {
            count++;
          }
        }
        if (count < minEnemyCount) {
          minEnemyCount = count;
          bestCorner = corner;
        }
      }

      // Fly towards bestCorner smoothly
      const dx = bestCorner.x - p.worldX;
      const dy = bestCorner.y - p.worldY;
      const distToCorner = Math.sqrt(dx * dx + dy * dy);
      
      // If we are still far, fly towards it at high speed. Otherwise hover gently.
      if (distToCorner > 40) {
        const chaseAngle = Math.atan2(dy, dx);
        p.angle = chaseAngle;
        moveX = Math.cos(chaseAngle) * p.speed * 2.0; // Double speed sweep
        moveY = Math.sin(chaseAngle) * p.speed * 2.0;
      } else {
        // Hover gently around the corner
        moveX = Math.sin(frameCount.current * 0.05) * 0.8;
        moveY = Math.cos(frameCount.current * 0.05) * 0.8;
        
        // Face the closest enemy on screen to lock-on
        let closestOnScreen: Enemy | null = null;
        let closestDist = Infinity;
        for (const enemy of enemies.current) {
          const rx = enemy.worldX - camera.current.x;
          const ry = enemy.worldY - camera.current.y;
          if (rx >= -20 && rx <= canvasWidth + 20 && ry >= -20 && ry <= canvasHeight + 20) {
            const edx = enemy.worldX - p.worldX;
            const edy = enemy.worldY - p.worldY;
            const edist = Math.sqrt(edx * edx + edy * edy);
            if (edist < closestDist) {
              closestDist = edist;
              closestOnScreen = enemy;
            }
          }
        }
        if (closestOnScreen) {
          p.angle = Math.atan2((closestOnScreen as Enemy).worldY - p.worldY, (closestOnScreen as Enemy).worldX - p.worldX);
        }
      }
    } else {
      // Manual controls (mouse & joystick)
      if (joystickActive.current) {
        moveX = joystickVector.current.x * p.speed;
        moveY = joystickVector.current.y * p.speed;
        if (Math.abs(moveX) > 0.1 || Math.abs(moveY) > 0.1) {
          p.angle = Math.atan2(moveY, moveX);
        }
      } else if (isMouseInCanvas.current) {
        const screenPX = p.worldX - camera.current.x;
        const screenPY = p.worldY - camera.current.y;
        
        const dx = mousePos.current.x - screenPX;
        const dy = mousePos.current.y - screenPY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 15) {
          const angle = Math.atan2(dy, dx);
          p.angle = angle;
          const factor = Math.min(dist / 80, 1);
          moveX = Math.cos(angle) * p.speed * factor;
          moveY = Math.sin(angle) * p.speed * factor;
        }
      }
    }

    p.worldX += moveX;
    p.worldY += moveY;

    // Camera follow (interpolation)
    const targetCamX = p.worldX - canvasWidth / 2;
    const targetCamY = p.worldY - canvasHeight / 2;
    camera.current.x += (targetCamX - camera.current.x) * 0.09;
    camera.current.y += (targetCamY - camera.current.y) * 0.09;

    // 2. Repulsor Mega Ultimate Lock-On & Missile Launch Logic
    if (p.isUltimateActive) {
      p.ultimateDuration--;
      if (p.ultimateDuration <= 0) {
        p.isUltimateActive = false;
      }

      // Launch 4 homing missiles from Iron Man's back every 12 frames
      if (frameCount.current % 12 === 0) {
        const launchX = p.worldX;
        const launchY = p.worldY;
        const speed = 4.0; // Launch outward speed before homing curves it
        
        const angles = [
          p.angle + Math.PI / 4,
          p.angle + 3 * Math.PI / 4,
          p.angle + 5 * Math.PI / 4,
          p.angle + 7 * Math.PI / 4,
        ];

        angles.forEach((launchAngle) => {
          projectiles.current.push({
            id: nextProjectileId.current++,
            worldX: launchX,
            worldY: launchY,
            vx: Math.cos(launchAngle) * speed,
            vy: Math.sin(launchAngle) * speed,
            size: 5,
            damage: 2.2,
            owner: "player",
            color: "#ff3d00",
            isExplosive: true,
            isMissile: true,
          });
        });

        // Add a floating text pop
        addFloatingText(p.worldX, p.worldY - 30, "MISSILE SALVO", "#ff3d00", 12);
      }

      // Overcharge trail sparks around player
      if (frameCount.current % 2 === 0) {
        particles.current.push({
          worldX: p.worldX + (Math.random() - 0.5) * 35,
          worldY: p.worldY + (Math.random() - 0.5) * 35,
          vx: -moveX * 0.3 + (Math.random() - 0.5) * 2,
          vy: -moveY * 0.3 + (Math.random() - 0.5) * 2,
          color: "#00e5ff",
          size: Math.random() * 4 + 1.5,
          alpha: 0.8,
          decay: 0.04,
          type: "nebula",
        });
      }
    }

    // 3. Continuous Target-Locking Laser Logic (Auto-Locking with Bending Bezier & Damage Overdrive)
    let closestEnemy: Enemy | null = null;
    let minDist = Infinity;

    // Laser only shoots when moving (velocity is non-zero)
    const isPlayerMoving = Math.abs(moveX) > 0.05 || Math.abs(moveY) > 0.05;

    if (isPlayerMoving) {
      for (const enemy of enemies.current) {
        const rx = enemy.worldX - camera.current.x;
        const ry = enemy.worldY - camera.current.y;
        // Check if enemy is on screen
        if (rx >= -20 && rx <= canvasWidth + 20 && ry >= -20 && ry <= canvasHeight + 20) {
          const dx = enemy.worldX - p.worldX;
          const dy = enemy.worldY - p.worldY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDist) {
            minDist = dist;
            closestEnemy = enemy;
          }
        }
      }
    }

    if (closestEnemy) {
      const target = closestEnemy as Enemy;
      
      // Lock-on timer and overdrive calculation
      if (currentLockedId.current === target.id) {
        lockTimer.current = Math.min(180, lockTimer.current + 1); // Max 3 seconds charge
      } else {
        currentLockedId.current = target.id;
        lockTimer.current = 0;
        // Start control point at midpoint
        laserCP.current.x = (p.worldX + target.worldX) / 2;
        laserCP.current.y = (p.worldY + target.worldY) / 2;
      }

      activeNormalLaser.current = { targetX: target.worldX, targetY: target.worldY };
      
      // Face towards target
      const angle = Math.atan2(target.worldY - p.worldY, target.worldX - p.worldX);
      p.angle = angle;
      p.isAttacking = true;

      // Deal ramping damage: base 0.08 per frame up to 0.24 (3x multiplier)
      const dmgScale = 1.0 + (lockTimer.current / 180) * 2.0;
      const currentDamage = 0.08 * dmgScale;
      target.hp -= currentDamage;

      // Whipping Bezier Control Point Physics (Midpoint + lag behind movement velocity)
      const midX = (p.worldX + target.worldX) / 2;
      const midY = (p.worldY + target.worldY) / 2;
      const targetCPX = midX - moveX * 4.5;
      const targetCPY = midY - moveY * 4.5;
      laserCP.current.x += (targetCPX - laserCP.current.x) * 0.18;
      laserCP.current.y += (targetCPY - laserCP.current.y) * 0.18;

      // Apply subtle physics-based pushing force away from player
      target.worldX += Math.cos(angle) * 0.15;
      target.worldY += Math.sin(angle) * 0.15;

      // Lock-on Overdrive Splash micro-explosions
      if (lockTimer.current >= 60 && frameCount.current % 6 === 0) {
        const blastDmg = 0.8;
        enemies.current.forEach((e) => {
          if (e.id === target.id) return;
          const edx = e.worldX - target.worldX;
          const edy = e.worldY - target.worldY;
          const edist = Math.sqrt(edx * edx + edy * edy);
          if (edist <= 75) {
            e.hp -= blastDmg;
            if (e.hp <= 0) defeatEnemy(e);
          }
        });

        // Volumetric spark puff at target
        for (let i = 0; i < 4; i++) {
          const sAngle = Math.random() * Math.PI * 2;
          const sSpeed = Math.random() * 3 + 1;
          particles.current.push({
            worldX: target.worldX,
            worldY: target.worldY,
            vx: Math.cos(sAngle) * sSpeed,
            vy: Math.sin(sAngle) * sSpeed,
            color: ["#d500f9", "#00e5ff", "#ffffff"][Math.floor(Math.random() * 3)],
            size: Math.random() * 4 + 2,
            alpha: 1.0,
            decay: 0.05,
            type: "fire",
            growth: 0.3,
          });
        }
        
        // Add screen shake on heavy overdrive hits
        screenShake.current = Math.max(screenShake.current, 1.5);
      }

      // Spawn physics-based impact sparks
      const sparkAngle = angle + Math.PI + (Math.random() - 0.5) * 1.0;
      for (let i = 0; i < 2; i++) {
        const speed = Math.random() * 3 + 2;
        particles.current.push({
          worldX: target.worldX,
          worldY: target.worldY,
          vx: Math.cos(sparkAngle) * speed + (Math.random() - 0.5) * 0.8,
          vy: Math.sin(sparkAngle) * speed + (Math.random() - 0.5) * 0.8,
          color: lockTimer.current >= 120 ? "#d500f9" : "#00e5ff",
          size: Math.random() * 3 + 1.5,
          alpha: 1.0,
          decay: 0.04,
          type: "impact",
        });
      }

      if (target.hp <= 0) {
        defeatEnemy(target);
        activeNormalLaser.current = null;
        p.isAttacking = false;
        currentLockedId.current = null;
        lockTimer.current = 0;
      }
    } else {
      activeNormalLaser.current = null;
      p.isAttacking = false;
      currentLockedId.current = null;
      lockTimer.current = 0;
    }

    // 4. Boss Villain Spawning Logic (endless milestones)
    if (scoreRef.current >= nextBossMilestone.current && !activeBoss.current) {
      spawnBoss(canvasWidth, canvasHeight, nextBossMilestone.current);
      // Calculate next boss milestone (previous + 25 + 10%)
      nextBossMilestone.current = nextBossMilestone.current + 25 + Math.floor(nextBossMilestone.current * 0.1);
    }

    // Time-based difficulty announcement
    if (frameCount.current > 0 && frameCount.current % 1800 === 0) {
      addFloatingText(p.worldX, p.worldY - 55, "AI BOT THREAT LEVEL CRITICAL!", "#ffb300", 17);
    }

    // 5. Endless Enemy Spawning (Normal / Fast / Heavy bandits)
    const difficultyTier = Math.floor(frameCount.current / 1800);
    const baseSpawnRate = Math.max(12, 75 - Math.floor(scoreRef.current / 4));
    const currentSpawnRate = Math.max(10, Math.floor(baseSpawnRate * Math.pow(0.95, difficultyTier)));
    
    // Keep max 40 normal enemies on screen at a time
    if (frameCount.current % currentSpawnRate === 0 && enemies.current.filter(e => e.type !== "boss").length < 40) {
      spawnEnemy(canvasWidth, canvasHeight);
    }

    // 6. Update Projectiles (Player Fireballs & Enemy Bullets)
    projectiles.current.forEach((proj) => {
      if (proj.isMissile) {
        let target: Enemy | null = null;
        // Try to find the boss first
        const bossEnemy = enemies.current.find((e) => e.type === "boss");
        if (bossEnemy) {
          target = bossEnemy;
        } else {
          // Find the closest enemy to the missile
          let minDist = Infinity;
          enemies.current.forEach((enemy) => {
            const dx = enemy.worldX - proj.worldX;
            const dy = enemy.worldY - proj.worldY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
              minDist = dist;
              target = enemy;
            }
          });
        }

        if (target) {
          const dx = (target as Enemy).worldX - proj.worldX;
          const dy = (target as Enemy).worldY - proj.worldY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            // Adjust velocity vector towards target
            const targetSpeed = 7.5; // Homing speed
            const targetVx = (dx / dist) * targetSpeed;
            const targetVy = (dy / dist) * targetSpeed;
            
            // Interpolate velocity for a smooth curved steering effect
            proj.vx += (targetVx - proj.vx) * 0.12;
            proj.vy += (targetVy - proj.vy) * 0.12;
          }
        }

        // Add trailing dense smoke/fire particles every frame for realism
        particles.current.push({
          worldX: proj.worldX,
          worldY: proj.worldY,
          vx: -proj.vx * 0.3 + (Math.random() - 0.5) * 1.0,
          vy: -proj.vy * 0.3 + (Math.random() - 0.5) * 1.0,
          color: ["#ff5722", "#ff9100", "#ffd54f"][Math.floor(Math.random() * 3)],
          size: Math.random() * 3 + 2,
          alpha: 0.9,
          decay: 0.05,
          type: "fire",
        });
        particles.current.push({
          worldX: proj.worldX,
          worldY: proj.worldY,
          vx: -proj.vx * 0.2 + (Math.random() - 0.5) * 1.0,
          vy: -proj.vy * 0.2 + (Math.random() - 0.5) * 1.0,
          color: "rgba(100, 100, 100, 0.5)",
          size: Math.random() * 4 + 3,
          alpha: 0.7,
          decay: 0.03,
          type: "smoke",
          growth: 0.2,
        });
      }

      proj.worldX += proj.vx;
      proj.worldY += proj.vy;

      // Check hits
      if (proj.owner === "enemy") {
        // Hits player
        const dx = p.worldX - proj.worldX;
        const dy = p.worldY - proj.worldY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const playerRadius = p.isUltimateActive ? 40 : 16; // 2.5x player collision scale
        if (dist < playerRadius) {
          if (p.iFrames === 0) {
            // Bullet hits player (only if no active I-frames)
            p.hp = Math.max(0, p.hp - proj.damage);
            addFloatingText(p.worldX, p.worldY - 20, `-${proj.damage}`, "#ff1744", 14);
            p.iFrames = 20; // Trigger I-frames (about 0.33s)
            screenShake.current = Math.max(screenShake.current, 6.0); // Set camera shake
          }

          // Impact spark particles (always spawn on hit)
          for (let i = 0; i < 4; i++) {
            particles.current.push({
              worldX: p.worldX,
              worldY: p.worldY,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              color: "#d500f9",
              size: 2,
              alpha: 0.9,
              decay: 0.04,
              type: "impact",
            });
          }

          if (hasVibrated) {
            navigator.vibrate(40);
          }

          // Trigger gameover
          if (p.hp <= 0) {
            p.hp = 0;
            setGameState("gameover");
            if (scoreRef.current > highScoreRef.current) {
              highScoreRef.current = scoreRef.current;
              setHighScore(scoreRef.current);
              localStorage.setItem("avenger_highscore", scoreRef.current.toString());
            }
          }

          // Mark for deletion
          proj.id = -1;
        }
      } else if (proj.owner === "player") {
        // Fireball hits enemies
        enemies.current.forEach((enemy) => {
          const dx = enemy.worldX - proj.worldX;
          const dy = enemy.worldY - proj.worldY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const hitRadius = enemy.type === "boss" ? 35 : 18;
          if (dist < hitRadius && proj.id !== -1) {
            // Explode fireball!
            explodeFireball(proj.worldX, proj.worldY, proj.damage);
            proj.id = -1; // Mark for deletion
          }
        });
      }
    });

    // Remove old projectiles (and those marked -1 or offscreen)
    projectiles.current = projectiles.current.filter((proj) => {
      if (proj.id === -1) return false;
      const relX = proj.worldX - camera.current.x;
      const relY = proj.worldY - camera.current.y;
      return relX > -100 && relX < canvasWidth + 100 && relY > -100 && relY < canvasHeight + 100;
    });

    // 7. Update Enemies
    enemies.current.forEach((enemy) => {
      const dx = p.worldX - enemy.worldX;
      const dy = p.worldY - enemy.worldY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      enemy.angle = angle;

      // AI: Move towards player (unless too close or shooting)
      const stopDistance = enemy.type === "boss" ? 180 : enemy.type === "heavy" ? 10 : 15;
      
      // Enemy shoot cooldowns
      if (enemy.shootCooldown > 0) {
        enemy.shootCooldown--;
      }

      if (dist > stopDistance) {
        enemy.worldX += Math.cos(angle) * enemy.speed;
        enemy.worldY += Math.sin(angle) * enemy.speed;
      }

      // Shoot Mechanics for Snipe/Boss enemies
      if (enemy.shootCooldown === 0) {
        if (enemy.type === "boss") {
          // Boss spread pattern
          enemy.shootCooldown = 90; // shoot every 1.5s
          // 5-way spread bullets
          const baseAngle = Math.atan2(p.worldY - enemy.worldY, p.worldX - enemy.worldX);
          for (let i = -2; i <= 2; i++) {
            const spreadAngle = baseAngle + i * 0.25;
            projectiles.current.push({
              id: nextProjectileId.current++,
              worldX: enemy.worldX,
              worldY: enemy.worldY,
              vx: Math.cos(spreadAngle) * 4.0,
              vy: Math.sin(spreadAngle) * 4.0,
              size: 4.5,
              damage: 0.5,
              owner: "enemy",
              color: "#e040fb",
            });
          }
          createScreenFlash("rgba(186,104,200,0.1)", 10);
        } else if (enemy.type === "normal" && dist < 380 && Math.random() < 0.12) {
          // Normal bandits shoot occasionally (without lower range block)
          enemy.shootCooldown = Math.round((150 + Math.random() * 90) / (1 + difficultyTier * 0.1));
          projectiles.current.push({
            id: nextProjectileId.current++,
            worldX: enemy.worldX,
            worldY: enemy.worldY,
            vx: Math.cos(angle) * 3.8,
            vy: Math.sin(angle) * 3.8,
            size: 3.5,
            damage: 0.5, // deals 0.5 hp damage
            owner: "enemy",
            color: "#d500f9",
          });
        } else if (enemy.type === "fast" && dist < 340 && Math.random() < 0.1) {
          // Fast bandit fires bullet
          enemy.shootCooldown = Math.round((120 + Math.random() * 60) / (1 + difficultyTier * 0.1));
          projectiles.current.push({
            id: nextProjectileId.current++,
            worldX: enemy.worldX,
            worldY: enemy.worldY,
            vx: Math.cos(angle) * 4.5,
            vy: Math.sin(angle) * 4.5,
            size: 3.0,
            damage: 0.5,
            owner: "enemy",
            color: "#00e5ff",
          });
        }
      }

      // Contact Damage on Touching Player
      const contactRadius = enemy.type === "boss" ? 34 : enemy.type === "heavy" ? 22 : 14;
      const playerHitRadius = p.isUltimateActive ? 30 : 12; // 2.5x player collision scale
      if (dist < contactRadius + playerHitRadius) {
        // Bounce enemy back
        enemy.worldX -= Math.cos(angle) * 22;
        enemy.worldY -= Math.sin(angle) * 22;

        if (p.iFrames === 0) {
          p.hp = Math.max(0, p.hp - enemy.damage);
          addFloatingText(p.worldX, p.worldY - 20, `-${enemy.damage}`, "#ff1744", 15);
          p.iFrames = 25; // Trigger I-frames
          screenShake.current = Math.max(screenShake.current, 6.0); // Set camera shake
        }

        for (let i = 0; i < 5; i++) {
          particles.current.push({
            worldX: p.worldX,
            worldY: p.worldY,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            color: "#b71c1c",
            size: Math.random() * 3.5 + 2,
            alpha: 1.0,
            decay: 0.03,
            type: "impact",
          });
        }

        if (hasVibrated) {
          navigator.vibrate(80);
        }

        if (p.hp <= 0) {
          p.hp = 0;
          setGameState("gameover");
          if (scoreRef.current > highScoreRef.current) {
            highScoreRef.current = scoreRef.current;
            setHighScore(scoreRef.current);
            localStorage.setItem("avenger_highscore", scoreRef.current.toString());
          }
        }
      }
    });

    // Update Boss HUD if boss is active
    if (activeBoss.current) {
      // Find the active boss in the array to get current HP
      const bossInArray = enemies.current.find(e => e.id === activeBoss.current?.id);
      if (bossInArray) {
        setBossHUD({
          name: bossInArray.bossName || "BANDIT OVERLORD",
          hp: bossInArray.hp,
          maxHp: bossInArray.maxHp,
        });
      } else {
        // Boss was defeated
        activeBoss.current = null;
        setBossHUD(null);
      }
    } else {
      if (bossHUD) setBossHUD(null);
    }

    // 8. Update Particles
    particles.current.forEach((part) => {
      part.worldX += part.vx;
      part.worldY += part.vy;
      part.alpha -= part.decay;
      if (part.growth) {
        part.size += part.growth;
      }
    });
    particles.current = particles.current.filter((p) => p.alpha > 0);

    // 9. Update Floating Text
    floatingTexts.current.forEach((text) => {
      text.worldY += text.vy;
      text.alpha -= 0.02;
    });
    floatingTexts.current = floatingTexts.current.filter((t) => t.alpha > 0);
  };

  // Explode Player Fireball (Ultimate Projectile)
  const explodeFireball = (worldX: number, worldY: number, damage: number) => {
    createScreenFlash("rgba(255, 110, 0, 0.18)", 10);
    screenShake.current = Math.max(screenShake.current, 8.0); // Trigger satisfying heavy screen shake
    
    // 1. Shockwave ring particle
    particles.current.push({
      worldX,
      worldY,
      vx: 0,
      vy: 0,
      color: "rgba(255, 255, 255, 0.85)",
      size: 5,
      alpha: 1.0,
      decay: 0.05,
      type: "shockwave",
      growth: 6, // expands rapidly
    });

    // 2. Volumetric Fire puffs (radial gradient spheres)
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      particles.current.push({
        worldX,
        worldY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: ["#ff3d00", "#ff9100", "#ffea00"][Math.floor(Math.random() * 3)],
        size: Math.random() * 10 + 6,
        alpha: 1.0,
        decay: 0.035,
        type: "fire",
        growth: 0.6, // expands as it burns out
      });
    }

    // 3. Gray/Dark smoke clouds (expanding circles)
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      particles.current.push({
        worldX,
        worldY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: ["rgba(80, 80, 80, 0.6)", "rgba(120, 120, 120, 0.5)", "rgba(50, 50, 50, 0.6)"][Math.floor(Math.random() * 3)],
        size: Math.random() * 8 + 5,
        alpha: 0.85,
        decay: 0.02,
        type: "smoke",
        growth: 1.1, // smoke expands very large
      });
    }

    // 4. Dynamic fast shrapnel/sparks
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 4;
      particles.current.push({
        worldX,
        worldY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: "#ffffff",
        size: Math.random() * 2.5 + 1.5,
        alpha: 1.0,
        decay: 0.05,
        type: "impact",
      });
    }

    // AoE damage checks
    const aoeRadius = 180;
    enemies.current.forEach((enemy) => {
      const dx = enemy.worldX - worldX;
      const dy = enemy.worldY - worldY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= aoeRadius) {
        enemy.hp -= damage;
        // knockback
        const pushAngle = Math.atan2(enemy.worldY - worldY, enemy.worldX - worldX);
        enemy.worldX += Math.cos(pushAngle) * 20;
        enemy.worldY += Math.sin(pushAngle) * 20;

        if (enemy.hp <= 0) {
          defeatEnemy(enemy);
        }
      }
    });
  };



  // Enemy Defeated Handler
  const defeatEnemy = (enemy: Enemy) => {
    enemies.current = enemies.current.filter((e) => e.id !== enemy.id);

    scoreRef.current += enemy.scoreValue;
    killCountRef.current += 1;
    setScore(scoreRef.current);
    setKillCount(killCountRef.current);

    // Charge Suit Power
    const powerGain = enemy.type === "boss" ? 45 : enemy.type === "heavy" ? 20 : enemy.type === "fast" ? 12 : 8;
    const p = player.current;
    p.suitPower = Math.min(p.maxSuitPower, p.suitPower + powerGain);

    addFloatingText(
      enemy.worldX,
      enemy.worldY - 15,
      `+${enemy.scoreValue}`,
      enemy.type === "boss" ? "#ffea00" : "#00e5ff",
      enemy.type === "boss" ? 22 : 15
    );

    // Floating energy core orb to player
    particles.current.push({
      worldX: enemy.worldX,
      worldY: enemy.worldY,
      vx: (p.worldX - enemy.worldX) * 0.04,
      vy: (p.worldY - enemy.worldY) * 0.04,
      color: "#00e5ff",
      size: 4.5,
      alpha: 1.0,
      decay: 0.012,
      type: "chakra",
    });

    // Dark smoke death
    for (let i = 0; i < 6; i++) {
      particles.current.push({
        worldX: enemy.worldX,
        worldY: enemy.worldY,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        color: ["#140824", "#231338", "#030107"][Math.floor(Math.random() * 3)],
        size: Math.random() * 6 + 3,
        alpha: 0.8,
        decay: 0.03,
        type: "impact",
      });
    }

    if (enemy.type === "boss") {
      activeBoss.current = null;
      setBossHUD(null);
      addFloatingText(p.worldX, p.worldY - 60, "AI CORE DESTROYED!", "#ffea00", 24);
      createScreenFlash("rgba(0, 229, 255, 0.25)", 25);
      
      // Heal player on boss defeat as a reward (+30 HP)
      p.hp = Math.min(p.maxHp, p.hp + 30);
      addFloatingText(p.worldX, p.worldY - 40, "+30 HP Systems Restored", "#00e676", 16);
    }
  };

  // Spawn regular enemies
  const spawnEnemy = (canvasWidth: number, canvasHeight: number) => {
    const p = player.current;
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = Math.max(canvasWidth, canvasHeight) * 0.6 + 50;

    const worldX = p.worldX + Math.cos(spawnAngle) * spawnDist;
    const worldY = p.worldY + Math.sin(spawnAngle) * spawnDist;

    const roll = Math.random() * 100;
    let type: "normal" | "fast" | "heavy" = "normal";
    let hp = 1;
    let speed = 2.0;
    let damage = 1.5; // standard contact damage
    let scoreValue = 1;

    const speedScaling = Math.min(scoreRef.current * 0.004, 1.0);
    const difficultyTier = Math.floor(frameCount.current / 1800);
    const baseSpeedAddition = difficultyTier * 0.2;

    if (roll > 80 && scoreRef.current > 8) {
      type = "heavy";
      hp = 3;
      speed = (1.2 + speedScaling * 0.4) + baseSpeedAddition;
      damage = 3.0;
      scoreValue = 3;
    } else if (roll > 55 && scoreRef.current > 4) {
      type = "fast";
      hp = 1;
      speed = (3.2 + speedScaling * 0.8) + baseSpeedAddition;
      damage = 1.0;
      scoreValue = 2;
    } else {
      type = "normal";
      hp = 1;
      speed = (2.0 + speedScaling * 0.6) + baseSpeedAddition;
      damage = 1.5;
      scoreValue = 1;
    }

    enemies.current.push({
      id: nextEnemyId.current++,
      worldX,
      worldY,
      type,
      hp,
      maxHp: hp,
      speed,
      damage,
      scoreValue,
      angle: 0,
      shootCooldown: 30 + Math.random() * 50, // randomized initial shot delay
    });
  };

  // Spawn Boss Villains (AI Titans)
  const spawnBoss = (canvasWidth: number, canvasHeight: number, milestoneValue: number) => {
    const p = player.current;
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = Math.max(canvasWidth, canvasHeight) * 0.5 + 40;

    const worldX = p.worldX + Math.cos(spawnAngle) * spawnDist;
    const worldY = p.worldY + Math.sin(spawnAngle) * spawnDist;

    const bossIndex = bossCount.current;
    bossCount.current++;
    const bossNames = [
      "AI Core Titan v1",
      "Cyber Golem Colossus",
      "Matrix Overlord v3",
      "Drone Nexus Core",
      "Doomsday Singularity",
      "Annihilator Protocol v6",
    ];
    const bossName = bossNames[bossIndex % bossNames.length];
    const bossHp = 12 + bossIndex * 8;

    const newBoss: Enemy = {
      id: nextEnemyId.current++,
      worldX,
      worldY,
      type: "boss",
      hp: bossHp,
      maxHp: bossHp,
      speed: 1.4,
      damage: 5.0,
      scoreValue: 10,
      angle: 0,
      shootCooldown: 40,
      bossName,
    };

    enemies.current.push(newBoss);
    activeBoss.current = newBoss;

    setBossHUD({
      name: bossName,
      hp: bossHp,
      maxHp: bossHp,
    });

    createScreenFlash("rgba(0, 229, 255, 0.4)", 30);
    addFloatingText(p.worldX, p.worldY - 60, `WARNING: AI BOSS DETECTED!`, "#ff3d00", 20);
    addFloatingText(p.worldX, p.worldY - 40, bossName, "#ffffff", 16);
  };

  // Ambient stardust
  const spawnInitialDustParticle = () => {
    const w = canvasRef.current ? canvasRef.current.width / (window.devicePixelRatio || 1) : 800;
    const h = canvasRef.current ? canvasRef.current.height / (window.devicePixelRatio || 1) : 500;

    particles.current.push({
      worldX: camera.current.x + Math.random() * w,
      worldY: camera.current.y + Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      color: ["#e040fb", "#00e5ff", "#0d47a1"][Math.floor(Math.random() * 3)],
      size: Math.random() * 2 + 1,
      alpha: Math.random() * 0.5 + 0.1,
      decay: 0.001,
      type: "nebula",
    });
  };

  // Screen flashes / alerts
  const [flashAlpha, setFlashAlpha] = useState<number>(0);
  const [flashColor, setFlashColor] = useState<string>("#ff3d00");
  const createScreenFlash = (color: string, duration: number) => {
    setFlashColor(color);
    setFlashAlpha(0.5);
    
    let currentAlpha = 0.5;
    const fadeRate = 0.5 / duration;

    const fade = () => {
      currentAlpha -= fadeRate;
      if (currentAlpha > 0) {
        setFlashAlpha(currentAlpha);
        requestAnimationFrame(fade);
      } else {
        setFlashAlpha(0);
      }
    };
    requestAnimationFrame(fade);
  };



  // Draw Engine (HTML5 Canvas)
  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const canvasWidth = canvas.width / dpr;
    const canvasHeight = canvas.height / dpr;

    // Clear frame
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Screen shake translation
    let shakeX = 0;
    let shakeY = 0;
    if (screenShake.current > 0.1) {
      shakeX = (Math.random() - 0.5) * screenShake.current;
      shakeY = (Math.random() - 0.5) * screenShake.current;
      screenShake.current *= 0.9;
    } else {
      screenShake.current = 0;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // 1. Deep Space Void Background
    ctx.fillStyle = "#030107";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const camX = camera.current.x;
    const camY = camera.current.y;

    // Draw Parallax Nebulas (Glowing soft color patches in space)
    drawSpaceNebulas(ctx, canvasWidth, canvasHeight, camX, camY);

    // 2. Parallax Starfields
    // Layer 0: Far small stars (slowest scroll)
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    starLayers.current[0].forEach((star) => {
      const sx = (star.x - camX * 0.1) % canvasWidth;
      const sy = (star.y - camY * 0.1) % canvasHeight;
      ctx.fillRect(sx < 0 ? sx + canvasWidth : sx, sy < 0 ? sy + canvasHeight : sy, 1, 1);
    });

    // Layer 1: Mid stars (medium scroll, glowing cyan)
    ctx.fillStyle = "rgba(0, 229, 255, 0.55)";
    starLayers.current[1].forEach((star) => {
      const sx = (star.x - camX * 0.25) % canvasWidth;
      const sy = (star.y - camY * 0.25) % canvasHeight;
      ctx.fillRect(sx < 0 ? sx + canvasWidth : sx, sy < 0 ? sy + canvasHeight : sy, 1.5, 1.5);
    });

    // Layer 2: Near stars (fastest scroll, magenta hints)
    ctx.fillStyle = "rgba(224, 64, 251, 0.75)";
    starLayers.current[2].forEach((star) => {
      const sx = (star.x - camX * 0.5) % canvasWidth;
      const sy = (star.y - camY * 0.5) % canvasHeight;
      ctx.fillRect(sx < 0 ? sx + canvasWidth : sx, sy < 0 ? sy + canvasHeight : sy, 2, 2);
    });

    // 2.5 Draw Parallax Background Planets
    planets.current.forEach((planet) => {
      // Very slow scrolling for deep background (0.05x speed)
      const px = planet.x - camX * 0.05;
      const py = planet.y - camY * 0.05;

      ctx.save();
      
      // Draw rings behind the planet if hasRings is true
      if (planet.hasRings) {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(0.2); // tilt the rings slightly
        
        ctx.strokeStyle = "rgba(255, 204, 128, 0.4)";
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.ellipse(0, 0, planet.r * 1.8, planet.r * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "rgba(255, 167, 38, 0.6)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, 0, planet.r * 1.6, planet.r * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }

      // Draw the planet body with a realistic radial gradient shading
      const grad = ctx.createRadialGradient(
        px - planet.r * 0.35,
        py - planet.r * 0.35,
        planet.r * 0.05,
        px,
        py,
        planet.r
      );
      grad.addColorStop(0, planet.baseColor);
      grad.addColorStop(0.7, planet.shadowColor);
      grad.addColorStop(1, "#030107"); // deep space blending shadow

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, planet.r, 0, Math.PI * 2);
      ctx.fill();

      // If it has rings, draw the front part of the rings to overlap the planet body
      if (planet.hasRings) {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(0.2);
        
        // Draw only the front arc (from 0 to PI) to simulate the ring wrapping
        ctx.strokeStyle = "rgba(255, 204, 128, 0.45)";
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.ellipse(0, 0, planet.r * 1.8, planet.r * 0.35, 0, 0, Math.PI);
        ctx.stroke();

        ctx.strokeStyle = "rgba(255, 167, 38, 0.65)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, 0, planet.r * 1.6, planet.r * 0.3, 0, 0, Math.PI);
        ctx.stroke();

        ctx.restore();
      }

      ctx.restore();
    });

    // 3. Draw Ambient cosmic dust and energy particles
    particles.current.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;

      const rx = p.worldX - camX;
      const ry = p.worldY - camY;

      if (p.type === "fire") {
        // Volumetric fire puff radial gradient shading
        const grad = ctx.createRadialGradient(rx, ry, p.size * 0.1, rx, ry, p.size);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.25, "#ffea00"); // bright gold core
        grad.addColorStop(0.55, "#ff3d00"); // hot orange
        grad.addColorStop(1, "rgba(255, 61, 0, 0)"); // fading edge
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(rx, ry, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "smoke") {
        // Volumetric smoke circle puff
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(rx, ry, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "shockwave") {
        // Volumetric hollow shockwave ring
        ctx.strokeStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(rx, ry, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Standard blocky retro sparks / chakra orbs
        ctx.fillStyle = p.color;
        ctx.fillRect(rx - p.size, ry - p.size, p.size * 2, p.size * 2);
      }
      ctx.restore();
    });

    // 4. Draw Projectiles (Energy Bullets & Homing Missiles)
    projectiles.current.forEach((proj) => {
      const rx = proj.worldX - camX;
      const ry = proj.worldY - camY;

      if (proj.isMissile) {
        // Draw a realistic sleek rocket missile
        const angle = Math.atan2(proj.vy, proj.vx);
        ctx.save();
        ctx.translate(rx, ry);
        ctx.rotate(angle);
        
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#ff3d00"; // exhaust glow

        // Missile body: sleek tapered gray metal cylinder
        ctx.fillStyle = "#cfd8dc";
        ctx.beginPath();
        ctx.moveTo(-10, -3.5);
        ctx.lineTo(5, -3.5);
        ctx.quadraticCurveTo(12, 0, 5, 3.5);
        ctx.lineTo(-10, 3.5);
        ctx.closePath();
        ctx.fill();

        // Missile tip: red nose cone
        ctx.fillStyle = "#ff1744";
        ctx.beginPath();
        ctx.moveTo(5, -3.5);
        ctx.quadraticCurveTo(12, 0, 5, 3.5);
        ctx.closePath();
        ctx.fill();

        // Tail fins: dark steel triangular fins
        ctx.fillStyle = "#37474f";
        
        // Top fin
        ctx.beginPath();
        ctx.moveTo(-9, -3.5);
        ctx.lineTo(-14, -7);
        ctx.lineTo(-7, -3.5);
        ctx.closePath();
        ctx.fill();

        // Bottom fin
        ctx.beginPath();
        ctx.moveTo(-9, 3.5);
        ctx.lineTo(-14, 7);
        ctx.lineTo(-7, 3.5);
        ctx.closePath();
        ctx.fill();

        // Exhaust flame trail behind the missile
        const flameLen = Math.random() * 12 + 8;
        const grad = ctx.createLinearGradient(-10, 0, -10 - flameLen, 0);
        grad.addColorStop(0, "#ffd54f");
        grad.addColorStop(0.4, "#ff3d00");
        grad.addColorStop(1, "rgba(255, 61, 0, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-10, -2.5);
        ctx.lineTo(-10 - flameLen, 0);
        ctx.lineTo(-10, 2.5);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
      } else {
        ctx.save();
        // Glowing robot energy bullets / plasma cubes
        ctx.shadowBlur = 8;
        ctx.shadowColor = proj.color;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(rx - proj.size, ry - proj.size, proj.size * 2, proj.size * 2);
        ctx.fillStyle = proj.color;
        ctx.fillRect(rx - proj.size * 0.6, ry - proj.size * 0.6, proj.size * 1.2, proj.size * 1.2);
        ctx.restore();
      }
    });

    // Draw Normal target-locking laser beam
    if (activeNormalLaser.current) {
      const rx = player.current.worldX - camX;
      const ry = player.current.worldY - camY;
      const tx = activeNormalLaser.current.targetX - camX;
      const ty = activeNormalLaser.current.targetY - camY;

      ctx.save();
      ctx.shadowBlur = 12;

      // Outer glow width mapping
      const outerWidth = 4 + (lockTimer.current / 180) * 12;
      // Inner core width mapping
      const innerWidth = 1.5 + (lockTimer.current / 180) * 2.5;

      // Determine color based on lock timer
      let glowColor = "rgba(0, 229, 255, 0.45)"; // cyan
      let coreGlow = "#00e5ff";
      if (lockTimer.current >= 120) {
        glowColor = "rgba(213, 0, 249, 0.55)"; // glowing white/purple
        coreGlow = "#d500f9";
      } else if (lockTimer.current >= 60) {
        glowColor = "rgba(41, 121, 255, 0.5)"; // electric blue
        coreGlow = "#2979ff";
      }

      ctx.shadowColor = coreGlow;

      // Bezier control point in screen coordinates
      const cpx = laserCP.current.x - camX;
      const cpy = laserCP.current.y - camY;

      // Outer glow
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = outerWidth;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.quadraticCurveTo(cpx, cpy, tx, ty);
      ctx.stroke();

      // Inner core
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = innerWidth;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.quadraticCurveTo(cpx, cpy, tx, ty);
      ctx.stroke();

      // Draw floating blocky energy segments along the Bezier path
      const dist = Math.sqrt((tx - rx) * (tx - rx) + (ty - ry) * (ty - ry));
      const segments = Math.floor(dist / 16);
      ctx.fillStyle = coreGlow;
      ctx.shadowBlur = 0;
      for (let i = 0; i < segments; i++) {
        const t = (i / segments + frameCount.current * 0.04) % 1.0;
        const lx = (1 - t) * (1 - t) * rx + 2 * (1 - t) * t * cpx + t * t * tx;
        const ly = (1 - t) * (1 - t) * ry + 2 * (1 - t) * t * cpy + t * t * ty;
        ctx.fillRect(lx - 2.5, ly - 2.5, 5, 5);
      }

      ctx.restore();
    }

    // 5. Draw Enemies (AI Bots)
    enemies.current.forEach((enemy) => {
      const rx = enemy.worldX - camX;
      const ry = enemy.worldY - camY;

      // Draw local HP bar for regular enemies
      if (enemy.type !== "boss" && enemy.hp < enemy.maxHp) {
        const radius = enemy.type === "heavy" ? 20 : enemy.type === "fast" ? 11 : 14;
        const barY = ry - radius * 1.3;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(rx - 15, barY, 30, 4);
        ctx.fillStyle = "#ff1744";
        ctx.fillRect(rx - 15, barY, (enemy.hp / enemy.maxHp) * 30, 4);
      }

      drawAIBot(ctx, rx, ry, enemy.angle, enemy.type);
    });

    // 6. Draw Player (Minecraft Iron Man)
    const px = player.current.worldX - camX;
    const py = player.current.worldY - camY;



    // Flicker player if invulnerable (taking damage)
    const isPlayerFlickering = player.current.iFrames > 0 && Math.floor(frameCount.current / 4) % 2 === 0;
    if (isPlayerFlickering) {
      ctx.save();
      ctx.globalAlpha = 0.35;
    }

    drawIronMan(
      ctx,
      px,
      py,
      player.current.angle,
      frameCount.current,
      player.current.isAttacking,
      player.current.isUltimateActive
    );

    if (isPlayerFlickering) {
      ctx.restore();
    }

    // 7. Draw Floating Indicators (e.g. +1, -12 HP)
    floatingTexts.current.forEach((text) => {
      ctx.save();
      ctx.globalAlpha = text.alpha;
      ctx.fillStyle = text.color;
      ctx.font = `bold ${text.size}px 'Courier New', monospace`;
      ctx.textAlign = "center";
      
      const rx = text.worldX - camX;
      const ry = text.worldY - camY;
      ctx.fillText(text.text, rx, ry);
      ctx.restore();
    });

    ctx.restore(); // Restore global screen shake translate
  };

  // Render static procedural space nebulas
  const drawSpaceNebulas = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    camX: number,
    camY: number
  ) => {
    // 3 Fixed cosmic gas clouds in the solar space
    const nebulae = [
      { x: w * 0.2 - camX * 0.05, y: h * 0.2 - camY * 0.05, r: 280, color1: "rgba(186, 104, 200, 0.08)", color2: "rgba(186, 104, 200, 0)" },
      { x: w * 0.85 - camX * 0.08, y: h * 0.4 - camY * 0.08, r: 350, color1: "rgba(0, 229, 255, 0.06)", color2: "rgba(0, 229, 255, 0)" },
      { x: w * 0.45 - camX * 0.03, y: h * 0.8 - camY * 0.03, r: 250, color1: "rgba(245, 0, 87, 0.05)", color2: "rgba(245, 0, 87, 0)" },
    ];

    nebulae.forEach((neb) => {
      const grad = ctx.createRadialGradient(neb.x, neb.y, 10, neb.x, neb.y, neb.r);
      grad.addColorStop(0, neb.color1);
      grad.addColorStop(1, neb.color2);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(neb.x, neb.y, neb.r, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  // Draw Minecraft Iron Man standing upright from eye-level
  const drawIronMan = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    frame: number,
    isAttacking: boolean,
    isUltimate: boolean
  ) => {
    ctx.save();
    ctx.translate(x, y);

    // Determine horizontal facing direction (flip if facing left)
    const facingLeft = Math.cos(angle) < 0;
    if (facingLeft) {
      ctx.scale(-1, 1);
    }

    const isMoving = isUltimate || joystickActive.current || isMouseInCanvas.current;
    const walkCycle = isMoving ? (frame * 0.18) : 0;
    const bobY = isMoving ? Math.sin(walkCycle) * 2.0 : 0;

    // --- DRAW MINECRAFT IRON MAN ---
    // 1. Legs (Minecraft style rectangular columns)
    const legLeftSwing = isMoving ? Math.sin(walkCycle) * 7 : 0;
    const legRightSwing = isMoving ? -Math.sin(walkCycle) * 7 : 0;

    // Left Leg
    ctx.fillStyle = "#b71c1c"; // Red thigh
    ctx.fillRect(-5, 6 + bobY, 4, 6);
    ctx.fillStyle = "#ffb300"; // Gold boot
    ctx.fillRect(-5 + (legLeftSwing * 0.2), 12 + bobY, 4, 5);

    // Right Leg
    ctx.fillStyle = "#b71c1c";
    ctx.fillRect(1, 6 + bobY, 4, 6);
    ctx.fillStyle = "#ffb300"; // Gold boot
    ctx.fillRect(1 + (legRightSwing * 0.2), 12 + bobY, 4, 5);

    // 2. Torso (Rectangular Minecraft body block)
    ctx.fillStyle = "#b71c1c"; // Red armor body
    ctx.fillRect(-7, -10 + bobY, 14, 16);
    
    // Gold shoulders
    ctx.fillStyle = "#ffb300";
    ctx.fillRect(-8, -10 + bobY, 2, 6);
    ctx.fillRect(6, -10 + bobY, 2, 6);

    // Arc Reactor in center of chest (glowing cyan square/triangle)
    ctx.fillStyle = "#e0f7fa";
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = isUltimate ? 12 : 5;
    ctx.shadowColor = "#00e5ff";
    ctx.fillRect(-2, -5 + bobY, 4, 4);
    ctx.strokeRect(-2, -5 + bobY, 4, 4);
    ctx.shadowBlur = 0; // reset

    // Gold chestplate detail
    ctx.fillStyle = "#ffb300";
    ctx.fillRect(-4, -9 + bobY, 8, 3);
    ctx.fillRect(-3, -2 + bobY, 6, 2);

    // 3. Head (Minecraft blocky head: 10x10 square)
    ctx.fillStyle = "#b71c1c"; // Red head
    ctx.fillRect(-5, -20 + bobY, 10, 10);
    
    ctx.fillStyle = "#ffb300"; // Gold faceplate
    ctx.fillRect(-3, -18 + bobY, 7, 7);

    // Cyan glowing eye slits
    ctx.fillStyle = "#00e5ff";
    ctx.fillRect(1, -16 + bobY, 2.5, 1.2); // front eye
    ctx.fillRect(-2.5, -16 + bobY, 1.8, 1.2); // back eye

    // 4. Arms
    const armSwing = isMoving ? Math.sin(walkCycle) * 6 : 0;
    
    if (isAttacking) {
      // Pointing arm (right arm points forward to shoot electric shocks)
      ctx.fillStyle = "#b71c1c"; // Red arm
      ctx.fillRect(6, -9 + bobY, 11, 4);
      ctx.fillStyle = "#ffb300"; // Gold hand
      ctx.fillRect(17, -9 + bobY, 2, 4);
      
      // Back arm swings normally
      ctx.fillStyle = "#b71c1c";
      ctx.fillRect(-9, -9 + bobY + (armSwing * 0.2), 3, 9);
      ctx.fillStyle = "#ffb300";
      ctx.fillRect(-9, 0 + bobY + (armSwing * 0.2), 3, 2);
    } else {
      // Left arm (back)
      ctx.fillStyle = "#b71c1c";
      ctx.fillRect(-9, -9 + bobY + (armSwing * 0.3), 3, 9);
      ctx.fillStyle = "#ffb300";
      ctx.fillRect(-9, 0 + bobY + (armSwing * 0.3), 3, 2);

      // Right arm (front)
      ctx.fillStyle = "#b71c1c";
      ctx.fillRect(6, -9 + bobY - (armSwing * 0.3), 3, 9);
      ctx.fillStyle = "#ffb300";
      ctx.fillRect(6, 0 + bobY - (armSwing * 0.3), 3, 2);
    }

    // Thruster flames from boots if moving/ultimate (cyan jet flames)
    if (isMoving || isUltimate) {
      ctx.fillStyle = "#00e5ff";
      const flameHeight = Math.random() * 6 + 3;
      ctx.fillRect(-4, 17 + bobY, 2, flameHeight);
      ctx.fillRect(2, 17 + bobY, 2, flameHeight);
    }



    ctx.restore();
  };

  // Draw AIBots standing upright (Minecraft/Cyber style)
  const drawAIBot = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    type: "normal" | "fast" | "heavy" | "boss"
  ) => {
    ctx.save();
    ctx.translate(x, y);

    // Face left/right based on angle (towards player)
    const facingLeft = Math.cos(angle) < 0;
    if (facingLeft) {
      ctx.scale(-1, 1);
    }

    const radius = type === "boss" ? 30 : type === "heavy" ? 20 : type === "fast" ? 11 : 14;
    const walkCycle = (frameCount.current * 0.16 + radius) % (Math.PI * 2);
    const bobY = Math.sin(walkCycle) * 1.5;

    // Glowing cyan bot shield for boss class
    if (type === "boss") {
      ctx.strokeStyle = "rgba(0, 229, 255, 0.45)";
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#00e5ff";
      ctx.beginPath();
      ctx.strokeRect(-radius * 1.3, -radius * 1.3 + bobY, radius * 2.6, radius * 2.6);
      ctx.shadowBlur = 0;
    }

    ctx.lineWidth = 1;
    ctx.lineCap = "square";

    if (type === "normal") {
      // --- CREEPER BOT ---
      // Legs (2 blocky legs)
      ctx.fillStyle = "#37474f"; 
      ctx.fillRect(-4, radius * 0.4 + bobY, 3, radius * 0.6);
      ctx.fillRect(1, radius * 0.4 + bobY, 3, radius * 0.6);

      // Body (Green block)
      ctx.fillStyle = "#2e7d32"; 
      ctx.fillRect(-6, -radius * 0.6 + bobY, 12, 14);

      // CPU/Wire details on chest
      ctx.fillStyle = "#d32f2f"; 
      ctx.fillRect(-2, -radius * 0.2 + bobY, 2, 2);
      ctx.fillStyle = "#1976d2"; 
      ctx.fillRect(1, -radius * 0.2 + bobY, 2, 2);

      // Head (Green square)
      ctx.fillStyle = "#1b5e20";
      ctx.fillRect(-4, -radius * 1.2 + bobY, 8, 8);

      // Red visor eye
      ctx.fillStyle = "#ff1744";
      ctx.fillRect(0, -radius * 1.05 + bobY, 4, 1.5);
    } 
    else if (type === "fast") {
      // --- HOVER SCOUT BOT ---
      // Yellow hover drone (no legs, rocket flame)
      ctx.fillStyle = "#00e5ff";
      const fH = Math.random() * 5 + 3;
      ctx.fillRect(-1.5, radius * 0.5 + bobY, 3, fH);

      // Metal base
      ctx.fillStyle = "#ffd54f"; 
      ctx.fillRect(-5, -radius * 0.4 + bobY, 10, 10);
      
      // Side thrusters (black)
      ctx.fillStyle = "#212121";
      ctx.fillRect(-7, -radius * 0.2 + bobY, 2, 5);
      ctx.fillRect(5, -radius * 0.2 + bobY, 2, 5);

      // Glowing lens/eye
      ctx.fillStyle = "#00e5ff"; 
      ctx.fillRect(2, -radius * 0.1 + bobY, 3, 3);
    } 
    else if (type === "heavy") {
      // --- CYBER GOLEM ---
      // Heavy blocky legs
      ctx.fillStyle = "#212121";
      ctx.fillRect(-7, radius * 0.4 + bobY, 5, radius * 0.6 + 2);
      ctx.fillRect(2, radius * 0.4 + bobY, 5, radius * 0.6 + 2);

      // Bulkier Torso
      ctx.fillStyle = "#455a64"; 
      ctx.fillRect(-12, -radius * 0.7 + bobY, 24, 22);

      // Yellow caution stripes on shoulders
      ctx.fillStyle = "#ffea00";
      ctx.fillRect(-12, -radius * 0.7 + bobY, 4, 5);
      ctx.fillRect(8, -radius * 0.7 + bobY, 4, 5);
      ctx.fillStyle = "#212121";
      ctx.fillRect(-10, -radius * 0.7 + bobY, 2, 5);
      ctx.fillRect(10, -radius * 0.7 + bobY, 2, 5);

      // Glowing core in center
      ctx.fillStyle = "#ffd54f";
      ctx.fillRect(-2, -radius * 0.2 + bobY, 4, 4);

      // Head
      ctx.fillStyle = "#37474f";
      ctx.fillRect(-6, -radius * 1.25 + bobY, 12, 11);

      // Orange visor
      ctx.fillStyle = "#ff9100";
      ctx.fillRect(1, -radius * 1.05 + bobY, 5, 2);
    } 
    else if (type === "boss") {
      // --- MEGA AI TITAN BOSS ---
      // Giant blocky legs
      ctx.fillStyle = "#212121"; 
      ctx.fillRect(-14, radius * 0.4 + bobY, 9, radius * 0.7 + 2);
      ctx.fillRect(5, radius * 0.4 + bobY, 9, radius * 0.7 + 2);
      ctx.fillStyle = "#b71c1c"; 
      ctx.fillRect(-14, radius * 0.8 + bobY, 9, 6);
      ctx.fillRect(5, radius * 0.8 + bobY, 9, 6);

      // Massive Torso
      ctx.fillStyle = "#37474f"; 
      ctx.fillRect(-18, -radius * 0.8 + bobY, 36, 36);
      
      // Red armored shoulder pods
      ctx.fillStyle = "#b71c1c";
      ctx.fillRect(-23, -radius * 0.8 + bobY, 5, 20);
      ctx.fillRect(18, -radius * 0.8 + bobY, 5, 20);

      // Gold core reactor
      ctx.fillStyle = "#ffb300";
      ctx.fillRect(-5, -radius * 0.2 + bobY, 10, 10);
      
      // Giant head with antenna
      ctx.fillStyle = "#455a64";
      ctx.fillRect(-9, -radius * 1.35 + bobY, 18, 17);
      
      // Gold face vents
      ctx.fillStyle = "#ffb300";
      ctx.fillRect(-5, -radius * 0.95 + bobY, 10, 4);

      // Orange double laser eyes
      ctx.fillStyle = "#ff5722";
      ctx.fillRect(2, -radius * 1.25 + bobY, 6, 2.5);

      // Antenna on head
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -radius * 1.35 + bobY);
      ctx.lineTo(0, -radius * 1.7 + bobY);
      ctx.stroke();
      ctx.fillStyle = "#ff1744"; 
      ctx.fillRect(-2, -radius * 1.85 + bobY, 4, 3);
    }

    ctx.restore();
  };

  return (
    <div className="relative flex flex-col w-full overflow-hidden border rounded-xl sm:rounded-2xl glass-panel border-slate-800/40 select-none portrait:aspect-[9/14] portrait:h-auto portrait:max-w-md portrait:mx-auto landscape:aspect-[16/9] landscape:h-auto landscape:max-h-[82vh] landscape:max-w-[88vw] landscape:mx-auto md:landscape:max-h-none md:landscape:max-w-none md:landscape:mx-0">
      {/* Screen flash layer */}
      {flashAlpha > 0 && (
        <div
          className="absolute inset-0 z-50 pointer-events-none transition-opacity duration-75"
          style={{ backgroundColor: flashColor, opacity: flashAlpha }}
        />
      )}

      {/* Main Canvas Context */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full bg-black">
        <canvas
          ref={canvasRef}
          className="block w-full h-full cursor-crosshair"
          onMouseMove={(e) => {
            if (gameState !== "playing") return;
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) {
              mousePos.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
              };
            }
          }}
          onMouseEnter={() => {
            isMouseInCanvas.current = true;
          }}
          onMouseLeave={() => {
            isMouseInCanvas.current = false;
          }}
        />
      </div>

      {/* CRT scanlines overlay filter */}
      <div className="absolute inset-0 z-20 pointer-events-none scanlines opacity-35" />

      {/* Close button top right */}
      <button
        onClick={onCloseGame}
        className="absolute top-4 right-4 z-40 p-2.5 rounded-full glass-panel hover:bg-red-950/40 text-cyan-400 hover:text-red-400 hover:border-red-500/30 transition-all duration-300 pointer-events-auto flex items-center gap-1 text-sm font-semibold tracking-wide"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        <span className="hidden sm:inline">Close Arena</span>
      </button>

      {/* Boss Health Bar Overlay HUD */}
      {gameState === "playing" && bossHUD && (
        <div className="absolute top-[105px] xs:top-[120px] landscape:top-[75px] sm:top-4 left-1/2 -translate-x-1/2 w-[70%] max-w-md z-30 pointer-events-none flex flex-col gap-1 items-center p-2 rounded-xl bg-black/75 border border-red-500/25 shadow-red-950/20 shadow-lg">
          <div className="flex justify-between w-full text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono">
            <span>👹 {bossHUD.name}</span>
            <span>{Math.round(bossHUD.hp)} / {bossHUD.maxHp} HP</span>
          </div>
          <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-red-950/30">
            <div
              className="h-full bg-gradient-to-r from-red-900 via-red-600 to-red-400 transition-all duration-150"
              style={{ width: `${(bossHUD.hp / bossHUD.maxHp) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* HUD Overlay (Playing) */}
      {gameState === "playing" && (
        <div className="absolute inset-0 z-30 pointer-events-none p-4 flex flex-col justify-between">
          {/* Top Info HUD */}
          <div className="flex justify-between items-start pr-14 sm:pr-0 w-full">
            {/* Health and Chakra Bars */}
            <div className="flex flex-col gap-1.5 landscape:gap-1 w-[130px] xs:w-36 landscape:w-40 sm:w-48 md:w-56 p-2 rounded-xl glass-panel pointer-events-auto">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-[9px] xs:text-[10px] sm:text-xs font-bold uppercase tracking-widest text-cyan-400 font-mono">IRON MAN</span>
              </div>
              
              {/* HP Bar */}
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between text-[8px] xs:text-[9px] sm:text-[10px] font-bold text-red-400 font-mono">
                  <span>SUIT HP</span>
                  <span>{player.current.hp}%</span>
                </div>
                <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-red-950/25">
                  <div
                    className="h-full bg-gradient-to-r from-red-800 to-red-500 transition-all duration-150"
                    style={{ width: `${(player.current.hp / player.current.maxHp) * 100}%` }}
                  />
                </div>
              </div>

              {/* Suit Power Bar */}
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between text-[8px] xs:text-[9px] sm:text-[10px] font-bold text-cyan-400 font-mono">
                  <span>SUIT PWR</span>
                  <span>{player.current.suitPower}%</span>
                </div>
                <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-cyan-950/25">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-800 to-cyan-400 transition-all duration-150"
                    style={{ width: `${player.current.suitPower}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Score & Stats */}
            <div className="flex flex-col items-center gap-0.5 bg-black/45 px-3 py-1.5 rounded-xl glass-panel border-cyan-950/20 text-center">
              <span className="text-[9px] sm:text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-mono">SCORE</span>
              <span className="text-xl sm:text-3xl font-extrabold text-cyan-100 glow-text-cyan font-mono leading-none">{score}</span>
              <span className="text-[8px] sm:text-[9px] font-semibold text-zinc-500 font-mono">Kills: {killCount}</span>
            </div>
          </div>

          {/* Bottom Controls UI */}
          <div className="flex justify-between items-end">
            {/* Joystick overlay for touch devices */}
            <div
              className="w-28 h-28 flex items-center justify-center rounded-full glass-panel pointer-events-auto touch-none border-dashed border-cyan-500/20 active:scale-95 active:border-purple-500/30 transition-transform sm:hidden"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="relative w-20 h-20 rounded-full bg-black/40 border border-slate-800/40 flex items-center justify-center">
                {/* Joystick knob */}
                <div
                  className="absolute w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 shadow-lg border border-slate-300 transition-transform duration-75 ease-out"
                  style={{
                    transform: `translate(${joystickUIOffset.x}px, ${joystickUIOffset.y}px)`,
                  }}
                />
              </div>
            </div>

            <div className="hidden sm:block text-[13px] font-semibold text-slate-100 glass-panel bg-slate-950/50 px-6 py-4 font-mono max-w-lg leading-relaxed sm:mb-6">
              🚀 FLIGHT: Move mouse cursor to fly towards it<br />
              🛡️ EVASION: Dodge glowing enemy plasma blocks<br />
              ⚡ LASER CORE: Laser targets the closest enemy *only while moving*<br />
              🔋 REPULSOR MEGA: Spacebar triggers autopilot corner retreat and heavy homing missile launch!
            </div>

            {/* Ultimate Skill Button - Round, matching joystick outer circle dimensions */}
            <button
              onClick={triggerUltimate}
              disabled={player.current.suitPower < player.current.maxSuitPower || player.current.isUltimateActive}
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full font-mono text-[9px] sm:text-[10px] font-extrabold tracking-wider pointer-events-auto transition-all duration-300 border flex flex-col items-center justify-center gap-1 shadow-lg select-none sm:mb-14
                ${
                  player.current.suitPower >= player.current.maxSuitPower && !player.current.isUltimateActive
                    ? "bg-gradient-to-br from-slate-600 to-slate-850 border-slate-500 text-slate-100 animate-pulse-glow hover:scale-105 active:scale-95"
                    : "bg-black/60 border-zinc-800 text-zinc-500 cursor-not-allowed"
                }
              `}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-slate-300 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-[8px] sm:text-[9px] uppercase leading-none">Repulsor</span>
              <span className="text-[8px] sm:text-[9px] uppercase leading-none">Mega</span>
            </button>
          </div>
        </div>
      )}

      {/* Menu Overlay */}
      {gameState === "menu" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/75 p-6 text-center select-none">
          <div className="max-w-md p-5 landscape:p-3 sm:landscape:p-6 rounded-2xl glass-panel border-slate-800/40 flex flex-col items-center gap-4 landscape:gap-2 sm:landscape:gap-5">
            <div>
              <span className="text-[9px] xs:text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Cybernetic Arena</span>
              <h2 className="text-lg xs:text-xl landscape:text-base sm:landscape:text-2xl font-extrabold text-slate-100 leading-tight tracking-wider mt-1 uppercase px-2">
                Become Iron Man and stop AI from killing humanity.
              </h2>
              <div className="h-0.5 w-24 bg-gradient-to-r from-transparent via-slate-500 to-transparent mx-auto mt-2 landscape:mt-1" />
            </div>

            {/* Basic Instructions */}
            <div className="text-[10px] sm:text-xs text-zinc-400 bg-black/30 p-2.5 rounded-xl border border-slate-800/40 font-mono space-y-1 w-full max-w-xs select-none">
              <div className="font-bold text-slate-400 uppercase tracking-widest text-[8px] xs:text-[9px]">Suit Instructions</div>
              <div className="text-left leading-normal text-zinc-350">
                🎮 FLIGHT: Move Mouse or use touch Joystick<br />
                ⚡ ATTACK: Laser auto-fires when moving<br />
                🔋 MEGA POWER: Spacebar or tap Repulsor Mega button
              </div>
            </div>

            {highScore > 0 && (
              <div className="bg-black/35 py-1 px-4 landscape:py-0.5 rounded-lg border border-cyan-950/20 text-[10px] font-bold text-cyan-400 font-mono">
                🌌 ARENA RECORD: {highScore} BOTS DEACTIVATED
              </div>
            )}

            {/* Two Action Buttons */}
            <div className="flex gap-4 w-full justify-center">
              <button
                onClick={startGame}
                className="flex-1 max-w-[130px] px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 font-extrabold text-xs uppercase tracking-widest rounded-full transition-all duration-300 hover:scale-105 active:scale-95 border border-slate-550"
              >
                Defeat AI
              </button>
              <button
                onClick={() => {
                  const element = document.getElementById("featured-content");
                  if (element) {
                    element.scrollIntoView({ behavior: "smooth", block: "start" });
                    addFloatingText(player.current.worldX, player.current.worldY - 30, "CODES ARCHIVED", "#cbd5e1", 12);
                  }
                }}
                className="flex-1 max-w-[130px] px-4 py-2.5 bg-black/60 hover:bg-slate-800/40 text-slate-350 font-extrabold text-xs uppercase tracking-widest rounded-full transition-all duration-300 hover:scale-105 active:scale-95 border border-slate-800"
              >
                Continue to Unoriz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameState === "gameover" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 p-6 text-center select-none">
          <div className="max-w-md p-6 landscape:p-3 sm:landscape:p-6 rounded-2xl glass-panel border-cyan-950/40 flex flex-col items-center gap-5 landscape:gap-2 sm:landscape:gap-5">
            <div>
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono">Systems Compromised</span>
              <h2 className="text-3xl landscape:text-xl sm:landscape:text-3xl font-extrabold text-red-500 leading-tight tracking-wider mt-1 uppercase glow-text-red">
                You lost to AI
              </h2>
            </div>

            <div className="flex flex-col gap-1 w-full bg-black/40 p-4 landscape:p-2 sm:landscape:p-4 rounded-xl border border-cyan-950/10 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">AI bots destroyed:</span>
                <span className="text-cyan-400 font-extrabold">{score}</span>
              </div>
              <div className="flex justify-between border-t border-cyan-950/15 pt-2 landscape:pt-1 landscape:mt-1 mt-2">
                <span className="text-zinc-500">Record:</span>
                <span className="text-cyan-400 font-extrabold">{highScore}</span>
              </div>
            </div>

            <button
              onClick={startGame}
              className="w-full sm:w-auto px-8 py-3 landscape:py-1.5 bg-gradient-to-r from-cyan-800 to-blue-600 hover:from-cyan-750 hover:to-blue-500 text-cyan-100 font-extrabold text-xs uppercase tracking-widest rounded-full transition-all duration-300 hover:scale-105 active:scale-95 border border-cyan-500/25"
            >
              Try again?
            </button>

            <button
              onClick={onCloseGame}
              className="text-xs text-zinc-500 hover:text-cyan-400 transition-colors uppercase tracking-wider font-semibold font-mono"
            >
              Exit Arena
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
