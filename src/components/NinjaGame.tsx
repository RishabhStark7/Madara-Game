"use client";

import React, { useRef, useState, useEffect } from "react";

// Types for entities
interface Player {
  worldX: number;
  worldY: number;
  hp: number;
  maxHp: number;
  chakra: number;
  maxChakra: number;
  angle: number;
  speed: number;
  isAttacking: boolean;
  attackCooldown: number;
  isUltimateActive: boolean;
  ultimateDuration: number;
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
  type: "impact" | "nebula" | "fire" | "chakra" | "heal";
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

export default function NinjaGame({ onCloseGame }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Game state
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameover">("menu");
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [killCount, setKillCount] = useState<number>(0);
  const [hasVibrated, setHasVibrated] = useState<boolean>(false);

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
    chakra: 0,
    maxChakra: 100,
    angle: 0,
    speed: 4.5,
    isAttacking: false,
    attackCooldown: 0,
    isUltimateActive: false,
    ultimateDuration: 0,
  });

  const enemies = useRef<Enemy[]>([]);
  const projectiles = useRef<Projectile[]>([]);
  const particles = useRef<Particle[]>([]);
  const floatingTexts = useRef<FloatingText[]>([]);
  const camera = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Infinite Parallax Stars Setup (3 layers of static stars that wrap)
  const starLayers = useRef<Array<Array<{ x: number; y: number; opacity: number }>>>([[], [], []]);

  // Boss fight tracking
  const bossMilestones = [15, 40, 70, 100, 130, 160, 190, 220, 250];
  const nextBossMilestoneIndex = useRef<number>(0);
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

    const saved = localStorage.getItem("ninja_highscore");
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
      chakra: 0,
      maxChakra: 100,
      angle: 0,
      speed: 4.5,
      isAttacking: false,
      attackCooldown: 0,
      isUltimateActive: false,
      ultimateDuration: 0,
    };
    enemies.current = [];
    projectiles.current = [];
    particles.current = [];
    floatingTexts.current = [];
    camera.current = { x: -300, y: -250 };
    nextBossMilestoneIndex.current = 0;
    activeBoss.current = null;
    setBossHUD(null);
    setScore(0);
    setKillCount(0);
    setGameState("playing");

    // Spawn some ambient cosmic dust particles initial
    for (let i = 0; i < 30; i++) {
      spawnInitialDustParticle();
    }
  };

  // Trigger Ultimate (Susanoo + Healing + Fireballs)
  const triggerUltimate = () => {
    const p = player.current;
    if (p.chakra >= p.maxChakra && !p.isUltimateActive) {
      p.isUltimateActive = true;
      p.ultimateDuration = 210; // 3.5 seconds of ultimate
      p.chakra = 0;

      // Heal player by 20% of max HP (which is 20 HP)
      const healAmount = Math.round(p.maxHp * 0.2);
      p.hp = Math.min(p.maxHp, p.hp + healAmount);

      // Create screen flash
      createScreenFlash("rgba(224, 64, 251, 0.4)", 20);

      // Floating text alerts
      addFloatingText(p.worldX, p.worldY - 45, "SUSANOO UNLEASHED!", "#e040fb", 20);
      addFloatingText(p.worldX, p.worldY - 25, `+${healAmount} HP (RECOVERY)`, "#00e676", 16);

      // Spawn glowing green heal particles
      for (let i = 0; i < 15; i++) {
        particles.current.push({
          worldX: p.worldX + (Math.random() - 0.5) * 30,
          worldY: p.worldY + (Math.random() - 0.5) * 30,
          vx: (Math.random() - 0.5) * 2,
          vy: -Math.random() * 3 - 1,
          color: "#00e676",
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
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Update logic (60fps)
  const updateGame = () => {
    frameCount.current++;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
    const canvasHeight = canvas.height / (window.devicePixelRatio || 1);

    const p = player.current;

    // 1. Move Player
    let moveX = 0;
    let moveY = 0;

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

    p.worldX += moveX;
    p.worldY += moveY;

    // Camera follow (interpolation)
    const targetCamX = p.worldX - canvasWidth / 2;
    const targetCamY = p.worldY - canvasHeight / 2;
    camera.current.x += (targetCamX - camera.current.x) * 0.09;
    camera.current.y += (targetCamY - camera.current.y) * 0.09;

    // 2. Ultimate Fireball Throw Logic
    if (p.isUltimateActive) {
      p.ultimateDuration--;
      if (p.ultimateDuration <= 0) {
        p.isUltimateActive = false;
      }

      // Shoot Fireballs every 10 frames in ultimate state
      if (frameCount.current % 10 === 0) {
        // Find closest target
        let target: Enemy | null = null;
        let minDist = 400;

        enemies.current.forEach((enemy) => {
          const dx = enemy.worldX - p.worldX;
          const dy = enemy.worldY - p.worldY;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < minDist) {
            minDist = d;
            target = enemy;
          }
        });

        // Determine angle
        let shootAngle = p.angle;
        if (target) {
          shootAngle = Math.atan2((target as Enemy).worldY - p.worldY, (target as Enemy).worldX - p.worldX);
        } else {
          // If no enemies close, shoot in a spiral pattern for visual flair!
          shootAngle = (frameCount.current * 0.15) % (Math.PI * 2);
        }

        // Spawn fireball projectile
        projectiles.current.push({
          id: nextProjectileId.current++,
          worldX: p.worldX,
          worldY: p.worldY,
          vx: Math.cos(shootAngle) * 7.5,
          vy: Math.sin(shootAngle) * 7.5,
          size: 9,
          damage: 3, // Heavy explosive damage
          owner: "player",
          color: "#ff3d00",
          isExplosive: true,
        });

        // Spawn fire particle splash
        for (let i = 0; i < 4; i++) {
          particles.current.push({
            worldX: p.worldX,
            worldY: p.worldY,
            vx: (Math.random() - 0.5) * 3 - Math.cos(shootAngle) * 2,
            vy: (Math.random() - 0.5) * 3 - Math.sin(shootAngle) * 2,
            color: "#ff9100",
            size: Math.random() * 4 + 2,
            alpha: 1.0,
            decay: 0.03,
            type: "fire",
          });
        }
      }

      // Trailing purple Susanoo visual aura particles
      if (frameCount.current % 3 === 0) {
        particles.current.push({
          worldX: p.worldX + (Math.random() - 0.5) * 35,
          worldY: p.worldY + (Math.random() - 0.5) * 35,
          vx: -moveX * 0.3 + (Math.random() - 0.5) * 1.5,
          vy: -moveY * 0.3 + (Math.random() - 0.5) * 1.5,
          color: "#ba68c8",
          size: Math.random() * 5 + 2,
          alpha: 0.8,
          decay: 0.04,
          type: "nebula",
        });
      }
    }

    // 3. Auto-swing Vicinity Kenjutsu
    if (p.attackCooldown > 0) {
      p.attackCooldown--;
      if (p.attackCooldown < 15) {
        p.isAttacking = false;
      }
    }

    if (p.attackCooldown === 0 && enemies.current.length > 0) {
      let closestEnemy: Enemy | null = null;
      let minDist = Infinity;

      enemies.current.forEach((enemy) => {
        const dx = enemy.worldX - p.worldX;
        const dy = enemy.worldY - p.worldY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          closestEnemy = enemy;
        }
      });

      const attackRange = p.isUltimateActive ? 150 : 90;
      if (closestEnemy && minDist < attackRange) {
        p.isAttacking = true;
        p.attackCooldown = p.isUltimateActive ? 12 : 28;

        const enemy = closestEnemy as Enemy;
        const attackAngle = Math.atan2(enemy.worldY - p.worldY, enemy.worldX - p.worldX);
        p.angle = attackAngle;

        swingBlade(attackAngle, attackRange);
      }
    }

    // 4. Boss Villain Spawning Logic
    const currentMilestone = bossMilestones[nextBossMilestoneIndex.current];
    if (score >= currentMilestone && !activeBoss.current) {
      spawnBoss(canvasWidth, canvasHeight, currentMilestone);
      nextBossMilestoneIndex.current++;
    }

    // 5. Endless Enemy Spawning (Normal / Fast / Heavy bandits)
    const baseSpawnRate = Math.max(12, 75 - Math.floor(score / 4));
    // Keep max 40 normal enemies on screen at a time
    if (frameCount.current % baseSpawnRate === 0 && enemies.current.filter(e => e.type !== "boss").length < 40) {
      spawnEnemy(canvasWidth, canvasHeight);
    }

    // 6. Update Projectiles (Player Fireballs & Enemy Bullets)
    projectiles.current.forEach((proj) => {
      proj.worldX += proj.vx;
      proj.worldY += proj.vy;

      // Check hits
      if (proj.owner === "enemy") {
        // Hits player
        const dx = p.worldX - proj.worldX;
        const dy = p.worldY - proj.worldY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 16) {
          // Bullet hits Madara
          p.hp -= proj.damage; // 0.5 HP damage
          addFloatingText(p.worldX, p.worldY - 20, `-${proj.damage}`, "#ff1744", 14);

          // Impact spark particles
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
            if (score > highScore) {
              setHighScore(score);
              localStorage.setItem("ninja_highscore", score.toString());
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
        } else if (enemy.type === "normal" && dist > 100 && dist < 320 && Math.random() < 0.15) {
          // Normal bandits shoot occasionally
          enemy.shootCooldown = 180 + Math.random() * 100; // shoot cooldown
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
        } else if (enemy.type === "fast" && dist > 100 && dist < 260 && Math.random() < 0.1) {
          // Fast bandit fires bullet
          enemy.shootCooldown = 150;
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
      if (dist < contactRadius + 12) {
        // Bounce enemy back
        enemy.worldX -= Math.cos(angle) * 22;
        enemy.worldY -= Math.sin(angle) * 22;

        p.hp -= enemy.damage;
        addFloatingText(p.worldX, p.worldY - 20, `-${enemy.damage}`, "#ff1744", 15);

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
          if (score > highScore) {
            setHighScore(score);
            localStorage.setItem("ninja_highscore", score.toString());
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
    createScreenFlash("rgba(255, 61, 0, 0.15)", 8);
    
    // Spawn explosion fire ring
    for (let i = 0; i < 16; i++) {
      const theta = (i / 16) * Math.PI * 2;
      const r = Math.random() * 3 + 2;
      particles.current.push({
        worldX,
        worldY,
        vx: Math.cos(theta) * r,
        vy: Math.sin(theta) * r,
        color: ["#ff3d00", "#ff9100", "#ffea00"][Math.floor(Math.random() * 3)],
        size: Math.random() * 6 + 4,
        alpha: 1.0,
        decay: 0.02,
        type: "fire",
      });
    }

    // AoE damage checks
    const aoeRadius = 85;
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

  // Perform physical swing and hit detection (Kenjutsu)
  const swingBlade = (angle: number, range: number) => {
    const p = player.current;

    enemies.current.forEach((enemy) => {
      const dx = enemy.worldX - p.worldX;
      const dy = enemy.worldY - p.worldY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= range) {
        const enemyAngle = Math.atan2(dy, dx);
        let angleDiff = enemyAngle - angle;
        
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        if (Math.abs(angleDiff) <= 1.35) { // ~150 degrees front slash
          const dmg = p.isUltimateActive ? 2.5 : 1;
          enemy.hp -= dmg;

          // Knockback
          enemy.worldX += Math.cos(enemyAngle) * 30;
          enemy.worldY += Math.sin(enemyAngle) * 30;

          // Slash Sparks
          for (let i = 0; i < 4; i++) {
            particles.current.push({
              worldX: enemy.worldX,
              worldY: enemy.worldY,
              vx: Math.cos(enemyAngle) * 4.5 + (Math.random() - 0.5) * 3,
              vy: Math.sin(enemyAngle) * 4.5 + (Math.random() - 0.5) * 3,
              color: p.isUltimateActive ? "#e040fb" : "#00e5ff",
              size: Math.random() * 3.5 + 1.5,
              alpha: 1.0,
              decay: 0.04,
              type: "impact",
            });
          }

          if (enemy.hp <= 0) {
            defeatEnemy(enemy);
          }
        }
      }
    });
  };

  // Enemy Defeated Handler
  const defeatEnemy = (enemy: Enemy) => {
    enemies.current = enemies.current.filter((e) => e.id !== enemy.id);

    setScore((prev) => prev + enemy.scoreValue);
    setKillCount((prev) => prev + 1);

    // Charge Chakra
    const chakraGain = enemy.type === "boss" ? 45 : enemy.type === "heavy" ? 20 : enemy.type === "fast" ? 12 : 8;
    const p = player.current;
    p.chakra = Math.min(p.maxChakra, p.chakra + chakraGain);

    addFloatingText(
      enemy.worldX,
      enemy.worldY - 15,
      `+${enemy.scoreValue}`,
      enemy.type === "boss" ? "#ffea00" : "#00e5ff",
      enemy.type === "boss" ? 22 : 15
    );

    // Floating chakra orb to player
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
      addFloatingText(p.worldX, p.worldY - 60, "BOSS DEFEATED!", "#ffea00", 24);
      createScreenFlash("rgba(0, 229, 255, 0.25)", 25);
      
      // Heal player on boss defeat as a reward
      p.hp = Math.min(p.maxHp, p.hp + 15);
      addFloatingText(p.worldX, p.worldY - 40, "+15 HP Reward", "#00e676", 16);
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
    let damage = 5; // standard contact damage
    let scoreValue = 1;

    const speedScaling = Math.min(score * 0.004, 1.0);

    if (roll > 80 && score > 8) {
      type = "heavy";
      hp = 3;
      speed = 1.2 + speedScaling * 0.4;
      damage = 10;
      scoreValue = 3;
    } else if (roll > 55 && score > 4) {
      type = "fast";
      hp = 1;
      speed = 3.2 + speedScaling * 0.8;
      damage = 4;
      scoreValue = 2;
    } else {
      type = "normal";
      hp = 1;
      speed = 2.0 + speedScaling * 0.6;
      damage = 5;
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
      shootCooldown: 90 + Math.random() * 100, // randomized initial shot delay
    });
  };

  // Spawn Boss Villains
  const spawnBoss = (canvasWidth: number, canvasHeight: number, milestoneValue: number) => {
    const p = player.current;
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = Math.max(canvasWidth, canvasHeight) * 0.5 + 40;

    const worldX = p.worldX + Math.cos(spawnAngle) * spawnDist;
    const worldY = p.worldY + Math.sin(spawnAngle) * spawnDist;

    const bossIndex = bossMilestones.indexOf(milestoneValue);
    const bossNames = [
      "Zabuza's Spectre",
      "Kage Orochi",
      "Gedo Shadow Beast",
      "Uchiha Obito Phantasm",
      "Kaguya's Sentinel",
      "Madara's Shadow Clones",
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
      damage: 15,
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

    createScreenFlash("rgba(183, 28, 28, 0.4)", 30);
    addFloatingText(p.worldX, p.worldY - 60, `WARNING: BOSS SPAWNED!`, "#b71c1c", 20);
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

    // 3. Draw Ambient cosmic dust and energy particles
    particles.current.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      const rx = p.worldX - camX;
      const ry = p.worldY - camY;

      ctx.beginPath();
      ctx.arc(rx, ry, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 4. Draw Projectiles (Fireballs & Bullet streams)
    projectiles.current.forEach((proj) => {
      const rx = proj.worldX - camX;
      const ry = proj.worldY - camY;

      ctx.save();
      if (proj.owner === "player" && proj.isExplosive) {
        // Glowing Fireballs
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#ff3d00";
        const fireballGrad = ctx.createRadialGradient(rx, ry, 1, rx, ry, proj.size);
        fireballGrad.addColorStop(0, "#ffffff");
        fireballGrad.addColorStop(0.3, "#ffea00");
        fireballGrad.addColorStop(0.7, "#ff5722");
        fireballGrad.addColorStop(1, "rgba(255,61,0,0)");
        
        ctx.fillStyle = fireballGrad;
        ctx.beginPath();
        ctx.arc(rx, ry, proj.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Glowing Bandit Energy Bullets
        ctx.shadowBlur = 8;
        ctx.shadowColor = proj.color;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(rx, ry, proj.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = proj.color;
        ctx.beginPath();
        ctx.arc(rx, ry, proj.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // 5. Draw Enemies
    enemies.current.forEach((enemy) => {
      const rx = enemy.worldX - camX;
      const ry = enemy.worldY - camY;

      // Draw local HP bar for regular enemies
      if (enemy.type !== "boss" && enemy.hp < enemy.maxHp) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(rx - 15, ry - 25, 30, 4);
        ctx.fillStyle = "#ff1744";
        ctx.fillRect(rx - 15, ry - 25, (enemy.hp / enemy.maxHp) * 30, 4);
      }

      drawBandit(ctx, rx, ry, enemy.angle, enemy.type);
    });

    // 6. Draw Player (Madara)
    const px = player.current.worldX - camX;
    const py = player.current.worldY - camY;

    // Draw active katana slash swing arc
    if (player.current.isAttacking) {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(player.current.angle);

      const slashRange = player.current.isUltimateActive ? 145 : 85;
      const slashGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, slashRange);
      slashGrad.addColorStop(0, "rgba(0,0,0,0)");
      slashGrad.addColorStop(0.7, player.current.isUltimateActive ? "rgba(224, 64, 251, 0.3)" : "rgba(0, 229, 255, 0.25)");
      slashGrad.addColorStop(0.95, player.current.isUltimateActive ? "rgba(255,255,255,0.9)" : "rgba(0, 229, 255, 0.85)");
      slashGrad.addColorStop(1.0, "rgba(0,0,0,0)");

      ctx.fillStyle = slashGrad;
      ctx.beginPath();
      ctx.arc(0, 0, slashRange, -1.3, 1.3);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    drawMadara(
      ctx,
      px,
      py,
      player.current.angle,
      frameCount.current,
      player.current.isAttacking,
      player.current.isUltimateActive
    );

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

  // Draw Madara Uchiha with distinct face and long signature spiky hair
  const drawMadara = (
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
    ctx.rotate(angle);

    // 1. Draw Trademark flowing long spiky hair (Madara's long locks flowing behind)
    ctx.fillStyle = "#090412"; // Charcoal black
    ctx.beginPath();
    // Center-top of head anchor
    ctx.moveTo(3, -9);
    // Spiky mane structure (top, back, bottom spikes matching the reference)
    ctx.lineTo(-2, -14); // Left side top spike
    ctx.lineTo(-8, -12);
    ctx.lineTo(-12, -22); // Outer left spike
    ctx.lineTo(-15, -14);
    ctx.lineTo(-26, -24); // Back-left flowing spike
    ctx.lineTo(-22, -10);
    ctx.lineTo(-44, -18); // Long back-left trail
    ctx.lineTo(-32, -4);
    ctx.lineTo(-50, -6);  // Long center-back trail (longest)
    ctx.lineTo(-34, 2);
    ctx.lineTo(-44, 12);  // Long back-right trail
    ctx.lineTo(-22, 8);
    ctx.lineTo(-28, 20);  // Back-right flowing spike
    ctx.lineTo(-14, 12);
    ctx.lineTo(-14, 20);  // Outer right spike
    ctx.lineTo(-8, 10);
    ctx.lineTo(-3, 13);   // Right side top spike
    ctx.lineTo(2, 7);
    ctx.closePath();
    ctx.fill();

    // 2. Undergarments (Dark purple collar & sleeves)
    ctx.fillStyle = "#1e1136"; // Deep purple
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    // 3. Segmented Red Samurai Armor (Reference: Red chestplate, shoulder sode, waist kusazuri)
    ctx.fillStyle = "#8a1010"; // Crimson red armor
    
    // Main Chestplate (with horizontal divisions/lines)
    ctx.beginPath();
    ctx.arc(0, 0, 11, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
    // Draw horizontal panel lines on chestplate
    ctx.strokeStyle = "#3a0303";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(0, 11);
    ctx.moveTo(4, -9.5);
    ctx.lineTo(4, 9.5);
    ctx.moveTo(-4, -9.5);
    ctx.lineTo(-4, 9.5);
    ctx.stroke();

    // Sode (Shoulder Guards) - Segmented plates on left/right shoulders
    // Left Shoulder Sode
    ctx.fillStyle = "#8a1010";
    ctx.fillRect(-7, -16, 6, 5);
    ctx.fillStyle = "#700a0a";
    ctx.fillRect(-5, -16, 2, 5);
    ctx.strokeStyle = "#3a0303";
    ctx.strokeRect(-7, -16, 6, 5);
    
    // Right Shoulder Sode
    ctx.fillStyle = "#8a1010";
    ctx.fillRect(-7, 11, 6, 5);
    ctx.fillStyle = "#700a0a";
    ctx.fillRect(-5, 11, 2, 5);
    ctx.strokeStyle = "#3a0303";
    ctx.strokeRect(-7, 11, 6, 5);

    // Kusazuri (Waist armor hanging down)
    // Front hanging plate
    ctx.fillStyle = "#8a1010";
    ctx.fillRect(-15, -4, 4, 8);
    ctx.strokeStyle = "#3a0303";
    ctx.strokeRect(-15, -4, 4, 8);
    // Panel lines on tassets
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.lineTo(-11, 0);
    ctx.stroke();

    // Side hanging tassets
    ctx.fillStyle = "#700a0a";
    ctx.fillRect(-14, -9, 3, 4);
    ctx.fillRect(-14, 5, 3, 4);
    ctx.strokeStyle = "#3a0303";
    ctx.strokeRect(-14, -9, 3, 4);
    ctx.strokeRect(-14, 5, 3, 4);

    // 4. Visible Pale Skin Face
    ctx.fillStyle = "#fce4ec";
    ctx.beginPath();
    ctx.arc(5, 0, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // 5. Signature bangs covering right eye (y negative side)
    ctx.fillStyle = "#090412";
    ctx.beginPath();
    ctx.moveTo(3, -7);
    ctx.quadraticCurveTo(9, -7, 11.5, -2); // Hangs down over the face
    ctx.quadraticCurveTo(8, -2, 5, -5);
    ctx.closePath();
    ctx.fill();

    // Extra lock draping down the middle/side
    ctx.beginPath();
    ctx.moveTo(4, -8);
    ctx.quadraticCurveTo(9, -2, 12, 1.5);
    ctx.quadraticCurveTo(6, 1, 3, -4);
    ctx.closePath();
    ctx.fill();

    // 6. Left eye (y positive side) is a red Sharingan (red iris, black pupil)
    ctx.fillStyle = "#ff1744"; // Sharingan Red
    ctx.beginPath();
    ctx.arc(8.5, 2.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000000"; // Pupil
    ctx.beginPath();
    ctx.arc(8.5, 2.5, 0.6, 0, Math.PI * 2);
    ctx.fill();

    // 7. Draw Katana weapon
    ctx.strokeStyle = "#eceff1";
    ctx.lineWidth = 2;
    if (isAttacking) {
      ctx.save();
      const swingProgress = (frame % 8) / 8;
      const swordAngle = -Math.PI / 3 + swingProgress * (Math.PI * 0.85);

      ctx.beginPath();
      ctx.moveTo(8, 4);
      ctx.lineTo(8 + Math.cos(swordAngle) * 35, 4 + Math.sin(swordAngle) * 35);
      ctx.stroke();

      ctx.strokeStyle = "#ffd54f"; // gold hilt
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(8, 4);
      ctx.lineTo(8 + Math.cos(swordAngle) * 6, 4 + Math.sin(swordAngle) * 6);
      ctx.stroke();
      ctx.restore();
    } else {
      // Sheathed katana
      ctx.strokeStyle = "#90a4ae";
      ctx.beginPath();
      ctx.moveTo(-9, 8);
      ctx.lineTo(-24, 19);
      ctx.stroke();
      ctx.strokeStyle = "#212121";
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-8, 7);
      ctx.lineTo(-21, 16);
      ctx.stroke();
    }

    // 8. Susanoo Aura Frame (Ribcage wraps around him in ultimate mode)
    if (isUltimate) {
      ctx.save();
      ctx.strokeStyle = "rgba(186, 104, 200, 0.75)";
      ctx.fillStyle = "rgba(186, 104, 200, 0.05)";
      ctx.lineWidth = 2.5;

      ctx.shadowBlur = 12;
      ctx.shadowColor = "#e040fb";

      // Susanoo Outer Ribcage
      ctx.beginPath();
      ctx.arc(0, 0, 24, -Math.PI/2, Math.PI/2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(-6, 0, 20, -Math.PI/3, Math.PI/3);
      ctx.stroke();

      // Skeletal shoulder points
      ctx.strokeRect(-16, -24, 6, 6);
      ctx.strokeRect(-16, 18, 6, 6);

      ctx.restore();
    }

    ctx.restore();
  };

  // Draw Bandits
  const drawBandit = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    type: "normal" | "fast" | "heavy" | "boss"
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const radius = type === "boss" ? 30 : type === "heavy" ? 20 : type === "fast" ? 11 : 14;

    // Red Boss flame aura
    if (type === "boss") {
      ctx.strokeStyle = "rgba(255, 61, 0, 0.45)";
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#ff3d00";
      ctx.beginPath();
      ctx.arc(0, 0, radius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Bandit Robe base
    ctx.fillStyle = type === "boss" ? "#0a0012" : type === "heavy" ? "#141414" : "#282828";
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Darkened shadow head hood
    ctx.fillStyle = "#121212";
    ctx.beginPath();
    ctx.arc(radius * 0.2, 0, radius * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // Red scarf/sash belt details
    if (type === "fast") {
      ctx.fillStyle = "#b71c1c";
      ctx.beginPath();
      ctx.moveTo(-radius * 0.4, radius * 0.4);
      ctx.lineTo(-radius * 1.3, radius * 0.8);
      ctx.lineTo(-radius * 0.7, 0);
      ctx.closePath();
      ctx.fill();
    } else if (type === "heavy") {
      ctx.fillStyle = "#3c0a54"; // purple plate belt
      ctx.fillRect(-3, -radius, 6, radius * 2);
    } else if (type === "boss") {
      // Golden Crown Spikes for Boss
      ctx.fillStyle = "#ffd54f";
      ctx.beginPath();
      ctx.moveTo(-radius * 0.8, -radius * 0.8);
      ctx.lineTo(-radius * 0.4, -radius * 1.2);
      ctx.lineTo(0, -radius * 0.8);
      ctx.lineTo(radius * 0.4, -radius * 1.2);
      ctx.lineTo(radius * 0.8, -radius * 0.8);
      ctx.closePath();
      ctx.fill();
    }

    // Glowing eyes (Red for heavy/boss, Cyan for fast, White for normal)
    ctx.fillStyle = (type === "boss" || type === "heavy") ? "#ff1744" : type === "fast" ? "#00e5ff" : "#ffffff";
    ctx.beginPath();
    ctx.arc(radius * 0.4, -radius * 0.2, 1.6, 0, Math.PI * 2);
    ctx.arc(radius * 0.4, radius * 0.2, 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Weapon
    ctx.strokeStyle = type === "boss" ? "#ffb300" : "#90a4ae";
    ctx.lineWidth = type === "boss" ? 4.0 : type === "heavy" ? 3.0 : 1.8;
    ctx.beginPath();
    ctx.moveTo(radius * 0.4, radius * 0.4);
    ctx.lineTo(radius * 1.25, radius * 0.55);
    ctx.stroke();

    ctx.restore();
  };

  return (
    <div className="relative flex flex-col w-full overflow-hidden border rounded-2xl glass-panel aspect-video h-[500px] md:h-[600px] border-cyan-950/20 select-none">
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
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[70%] max-w-md z-30 pointer-events-none flex flex-col gap-1 items-center p-2 rounded-xl bg-black/75 border border-red-500/25 shadow-red-950/20 shadow-lg">
          <div className="flex justify-between w-full text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono">
            <span>👹 {bossHUD.name}</span>
            <span>{bossHUD.hp} / {bossHUD.maxHp} HP</span>
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
          <div className="flex justify-between items-start">
            {/* Health and Chakra Bars */}
            <div className="flex flex-col gap-2.5 w-44 md:w-56 p-3 rounded-xl glass-panel pointer-events-auto">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 font-mono">Madara Uchiha</span>
              </div>
              
              {/* HP Bar */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-bold text-red-400 font-mono">
                  <span>HP</span>
                  <span>{player.current.hp} / {player.current.maxHp}</span>
                </div>
                <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-red-950/25">
                  <div
                    className="h-full bg-gradient-to-r from-red-800 to-red-500 transition-all duration-150"
                    style={{ width: `${(player.current.hp / player.current.maxHp) * 100}%` }}
                  />
                </div>
              </div>

              {/* Chakra Bar */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-bold text-purple-400 font-mono">
                  <span>CHAKRA</span>
                  <span>{player.current.chakra}%</span>
                </div>
                <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-purple-950/25">
                  <div
                    className="h-full bg-gradient-to-r from-purple-800 to-purple-400 transition-all duration-150"
                    style={{ width: `${player.current.chakra}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Score & Stats */}
            <div className="flex flex-col items-center gap-1 bg-black/45 px-5 py-2.5 rounded-2xl glass-panel border-cyan-950/20">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-mono">Defeated</span>
              <span className="text-3xl font-extrabold text-cyan-100 glow-text-cyan font-mono leading-none">{score}</span>
              <span className="text-[9px] font-semibold text-zinc-500 font-mono">Kills: {killCount}</span>
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
              <div className="relative w-20 h-20 rounded-full bg-black/40 border border-cyan-500/15 flex items-center justify-center">
                {/* Joystick knob */}
                <div
                  className="absolute w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 shadow-lg border border-cyan-300 transition-transform duration-75 ease-out"
                  style={{
                    transform: `translate(${joystickUIOffset.x}px, ${joystickUIOffset.y}px)`,
                  }}
                />
              </div>
            </div>

            <div className="hidden sm:block text-[9px] font-bold text-zinc-400 glass-panel px-4 py-2 font-mono max-w-xs leading-normal">
              🚀 MOVE: Mouse to aim/fly<br />
              🛡️ DODGE: Avoid purple enemy energy bullets<br />
              ⚔️ AUTO-ATTACK: Approach space bandits<br />
              🔮 SUSANOO: Spacebar (100% Chakra) heals 20% & throws fireballs!
            </div>

            {/* Ultimate Skill Button */}
            <button
              onClick={triggerUltimate}
              disabled={player.current.chakra < player.current.maxChakra || player.current.isUltimateActive}
              className={`p-3.5 rounded-full font-mono text-xs font-extrabold tracking-wider pointer-events-auto transition-all duration-300 border flex flex-col items-center gap-1 shadow-lg
                ${
                  player.current.chakra >= player.current.maxChakra && !player.current.isUltimateActive
                    ? "bg-purple-700 hover:bg-purple-600 border-purple-500 text-white animate-pulse-glow hover:scale-105"
                    : "bg-black/60 border-zinc-800 text-zinc-650 cursor-not-allowed"
                }
              `}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.996 7.996 0 0120 13a7.997 7.997 0 01-2.343 5.657z" />
              </svg>
              <span className="text-[9px] uppercase">Susanoo</span>
            </button>
          </div>
        </div>
      )}

      {/* Menu Overlay */}
      {gameState === "menu" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/75 p-6 text-center select-none">
          <div className="max-w-md p-6 rounded-2xl glass-panel-glow border-purple-900/30 flex flex-col items-center gap-6">
            <div>
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-mono">Cosmic Warpath</span>
              <h2 className="text-3xl font-extrabold text-purple-400 leading-tight tracking-wider mt-1 uppercase glow-text-magenta">
                Madara's Cosmic Stand
              </h2>
              <div className="h-0.5 w-24 bg-gradient-to-r from-transparent via-cyan-500 to-transparent mx-auto mt-2" />
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed font-sans max-w-sm">
              Guide Uchiha Madara through the infinite deep space. Avoid glowing projectile bullets. Defeat bandits to charge your energy and unleash the healing Susanoo Shield & fireball projectiles!
            </p>

            {highScore > 0 && (
              <div className="bg-black/35 py-1.5 px-4 rounded-lg border border-purple-950/20 text-xs font-bold text-cyan-400 font-mono">
                🌌 SPACE RECORD: {highScore} DEFEATED
              </div>
            )}

            <button
              onClick={startGame}
              className="w-full sm:w-auto px-10 py-3.5 bg-gradient-to-r from-purple-800 to-cyan-600 hover:from-purple-700 hover:to-cyan-500 text-cyan-100 font-extrabold text-sm uppercase tracking-widest rounded-full transition-all duration-300 hover:scale-105 active:scale-95 shadow-md shadow-purple-950/40 border border-cyan-500/25"
            >
              Enter the Void
            </button>
            
            <div className="text-[9px] text-zinc-500 font-mono select-none">
              Desktop: Move Mouse to fly. Auto-slash. Spacebar for Susanoo.<br />
              Mobile: Use Joystick and special skill touch button.
            </div>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameState === "gameover" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 p-6 text-center select-none animate-fade-in">
          <div className="max-w-md p-6 rounded-2xl glass-panel border-purple-950/40 flex flex-col items-center gap-5">
            <div>
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono">Lost to the Void</span>
              <h2 className="text-4xl font-extrabold text-red-500 leading-tight tracking-wider mt-1 uppercase glow-text-red">
                Overwhelmed
              </h2>
            </div>

            <div className="flex flex-col gap-1 w-full bg-black/40 p-4 rounded-xl border border-cyan-950/10 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Defeated Bandits:</span>
                <span className="text-cyan-400 font-extrabold">{score}</span>
              </div>
              <div className="flex justify-between border-t border-cyan-950/15 pt-2 mt-2">
                <span className="text-zinc-500">Record:</span>
                <span className="text-purple-400 font-extrabold">{highScore}</span>
              </div>
            </div>

            <button
              onClick={startGame}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-purple-800 to-cyan-600 hover:from-purple-700 hover:to-cyan-500 text-cyan-100 font-extrabold text-xs uppercase tracking-widest rounded-full transition-all duration-300 hover:scale-105 active:scale-95 border border-cyan-500/25"
            >
              Fight Again
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
