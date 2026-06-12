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
  type: "normal" | "fast" | "heavy";
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  scoreValue: number;
  angle: number;
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
  type: "blood" | "sand" | "dust" | "fire" | "chakra";
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

  // Entities and game loop state (stored in refs for 60fps performance)
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
  const particles = useRef<Particle[]>([]);
  const floatingTexts = useRef<FloatingText[]>([]);
  const camera = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const frameCount = useRef<number>(0);
  const nextEnemyId = useRef<number>(1);
  const nextTextId = useRef<number>(1);

  // Local storage high score loading
  useEffect(() => {
    const saved = localStorage.getItem("ninja_highscore");
    if (saved) {
      setHighScore(parseInt(saved, 10));
    }
    // Check if browser supports vibration API
    setHasVibrated(typeof navigator !== "undefined" && !!navigator.vibrate);
  }, []);

  // Set up resize handler
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
    handleResize(); // Initial call

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [gameState]);

  // Start the game loop
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
    particles.current = [];
    floatingTexts.current = [];
    camera.current = { x: -300, y: -250 };
    setScore(0);
    setKillCount(0);
    setGameState("playing");

    // Spawn initial sand particles
    for (let i = 0; i < 40; i++) {
      spawnInitialSandParticle();
    }
  };

  // Trigger Ultimate Ability (Majestic Destroyer Flame)
  const triggerUltimate = () => {
    if (player.current.chakra >= player.current.maxChakra && !player.current.isUltimateActive) {
      player.current.isUltimateActive = true;
      player.current.ultimateDuration = 120; // 2 seconds at 60fps
      player.current.chakra = 0;

      // Visual screen shake and fire effect
      createScreenFlash("#ff3d00", 15);
      
      // Floating text
      addFloatingText(
        player.current.worldX,
        player.current.worldY - 40,
        "KATON: GŌKA MEKKYAKU!",
        "#ff3d00",
        22
      );

      if (hasVibrated) {
        navigator.vibrate([100, 50, 100]);
      }

      // Damage all enemies currently on screen and blast them away
      enemies.current.forEach((enemy) => {
        enemy.hp -= 5;
        // Spawn fire particles on them
        for (let i = 0; i < 8; i++) {
          particles.current.push({
            worldX: enemy.worldX,
            worldY: enemy.worldY,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            color: ["#ff3d00", "#ff9100", "#ffea00"][Math.floor(Math.random() * 3)],
            size: Math.random() * 6 + 4,
            alpha: 1,
            decay: Math.random() * 0.02 + 0.015,
            type: "fire",
          });
        }
      });
    }
  };

  // Touch handlers for Virtual Joystick
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
    const maxRadius = 45; // Max visual displacement in px

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

  // Keyboard spaces for Ultimate
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

  // Update Game Logic
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
      // Joystick movement (Mobile)
      moveX = joystickVector.current.x * p.speed;
      moveY = joystickVector.current.y * p.speed;
      if (Math.abs(moveX) > 0.1 || Math.abs(moveY) > 0.1) {
        p.angle = Math.atan2(moveY, moveX);
      }
    } else if (isMouseInCanvas.current) {
      // Mouse movement (Desktop)
      // Player center in screen coords is worldPos - cameraPos
      const screenPX = p.worldX - camera.current.x;
      const screenPY = p.worldY - camera.current.y;
      
      const dx = mousePos.current.x - screenPX;
      const dy = mousePos.current.y - screenPY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 15) { // Deadzone to prevent jitter
        const angle = Math.atan2(dy, dx);
        p.angle = angle;
        // Speed scaling so the player slows down close to the mouse
        const factor = Math.min(dist / 80, 1);
        moveX = Math.cos(angle) * p.speed * factor;
        moveY = Math.sin(angle) * p.speed * factor;
      }
    }

    p.worldX += moveX;
    p.worldY += moveY;

    // Camera follow (Smooth lerping)
    const targetCamX = p.worldX - canvasWidth / 2;
    const targetCamY = p.worldY - canvasHeight / 2;
    camera.current.x += (targetCamX - camera.current.x) * 0.1;
    camera.current.y += (targetCamY - camera.current.y) * 0.1;

    // Ultimate Ability handling
    if (p.isUltimateActive) {
      p.ultimateDuration--;
      if (p.ultimateDuration <= 0) {
        p.isUltimateActive = false;
      }
      
      // Emit fire trailing particles from Madara
      if (frameCount.current % 2 === 0) {
        particles.current.push({
          worldX: p.worldX + (Math.random() - 0.5) * 20,
          worldY: p.worldY + (Math.random() - 0.5) * 20,
          vx: -moveX * 0.5 + (Math.random() - 0.5) * 2,
          vy: -moveY * 0.5 + (Math.random() - 0.5) * 2,
          color: ["#e53935", "#ffb300", "#ff3d00"][Math.floor(Math.random() * 3)],
          size: Math.random() * 5 + 3,
          alpha: 1,
          decay: 0.03,
          type: "fire",
        });
      }
    }

    // 2. Auto-combat Blade Swing logic
    if (p.attackCooldown > 0) {
      p.attackCooldown--;
      if (p.attackCooldown < 15) {
        p.isAttacking = false;
      }
    }

    // Vicinity check for auto swing
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

      // Attack radius triggers swing
      const attackRange = p.isUltimateActive ? 160 : 90;
      if (closestEnemy && minDist < attackRange) {
        p.isAttacking = true;
        // Cooldown: Ultimate makes attacks extremely rapid
        p.attackCooldown = p.isUltimateActive ? 12 : 26; 

        // Set direction towards closest enemy
        const enemy = closestEnemy as Enemy;
        const attackAngle = Math.atan2(enemy.worldY - p.worldY, enemy.worldX - p.worldX);
        p.angle = attackAngle;

        // Perform attack hitting checks
        swingBlade(attackAngle, attackRange);
      }
    }

    // 3. Spawning Enemies (Endless scaling)
    // Spawn rate increases with score
    const baseSpawnRate = Math.max(10, 80 - Math.floor(score / 5)); 
    if (frameCount.current % baseSpawnRate === 0 && enemies.current.length < 50) {
      spawnEnemy(canvasWidth, canvasHeight);
    }

    // 4. Update Enemies
    enemies.current.forEach((enemy) => {
      const dx = p.worldX - enemy.worldX;
      const dy = p.worldY - enemy.worldY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Move toward player
      const angle = Math.atan2(dy, dx);
      enemy.angle = angle;
      
      enemy.worldX += Math.cos(angle) * enemy.speed;
      enemy.worldY += Math.sin(angle) * enemy.speed;

      // Deal damage on touching player (collision check)
      const hitRadius = enemy.type === "heavy" ? 24 : 16;
      if (dist < hitRadius + 12) {
        // Bounce enemy back a bit
        enemy.worldX -= Math.cos(angle) * 20;
        enemy.worldY -= Math.sin(angle) * 20;

        // Damage Player
        p.hp -= enemy.damage;
        addFloatingText(p.worldX, p.worldY - 20, `-${enemy.damage}`, "#e53935", 16);
        
        // Spawn damage blood particles
        for (let i = 0; i < 6; i++) {
          particles.current.push({
            worldX: p.worldX,
            worldY: p.worldY,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            color: "#d32f2f",
            size: Math.random() * 4 + 2,
            alpha: 1,
            decay: 0.03,
            type: "blood",
          });
        }

        if (hasVibrated) {
          navigator.vibrate(80);
        }

        // Check for Game Over
        if (p.hp <= 0) {
          p.hp = 0;
          setGameState("gameover");
          
          // Save high score
          if (score > highScore) {
            setHighScore(score);
            localStorage.setItem("ninja_highscore", score.toString());
          }
        }
      }
    });

    // 5. Update Particles
    particles.current.forEach((part) => {
      part.worldX += part.vx;
      part.worldY += part.vy;
      part.alpha -= part.decay;
      
      // Wind drift for sand particles
      if (part.type === "sand") {
        part.vx = -3.5 - Math.random() * 1;
        part.vy = 0.5 + Math.random() * 0.5;
        
        // Loop sand particles if they go out of screen
        const relX = part.worldX - camera.current.x;
        const relY = part.worldY - camera.current.y;
        if (relX < -50 || relY > canvasHeight + 50) {
          part.worldX = camera.current.x + canvasWidth + Math.random() * 200;
          part.worldY = camera.current.y + Math.random() * canvasHeight - 200;
        }
      }
    });

    // Clean up expired particles
    particles.current = particles.current.filter((part) => part.alpha > 0);

    // 6. Update Floating Text
    floatingTexts.current.forEach((text) => {
      text.worldY += text.vy;
      text.alpha -= 0.02;
    });
    floatingTexts.current = floatingTexts.current.filter((text) => text.alpha > 0);

    // Wind sand spawning to keep background active
    if (frameCount.current % 3 === 0 && particles.current.filter(p => p.type === "sand").length < 60) {
      spawnWindSandParticle(canvasWidth, canvasHeight);
    }
  };

  // Perform physical swing and hit detection
  const swingBlade = (angle: number, range: number) => {
    const p = player.current;

    // Check hit against all enemies
    enemies.current.forEach((enemy) => {
      const dx = enemy.worldX - p.worldX;
      const dy = enemy.worldY - p.worldY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= range) {
        // Angle check to see if enemy is in the front semi-circle swing (approx 150 deg arc)
        const enemyAngle = Math.atan2(dy, dx);
        let angleDiff = enemyAngle - angle;
        
        // Normalize angle difference to -PI to PI
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        if (Math.abs(angleDiff) <= 1.3) { // ~150 degrees
          // Deal damage
          const baseDamage = p.isUltimateActive ? 3 : 1;
          enemy.hp -= baseDamage;

          // Push enemy back (knockback)
          enemy.worldX += Math.cos(enemyAngle) * 35;
          enemy.worldY += Math.sin(enemyAngle) * 35;

          // Spawn hit impact dust/sparks
          for (let i = 0; i < 5; i++) {
            particles.current.push({
              worldX: enemy.worldX,
              worldY: enemy.worldY,
              vx: Math.cos(enemyAngle) * 5 + (Math.random() - 0.5) * 4,
              vy: Math.sin(enemyAngle) * 5 + (Math.random() - 0.5) * 4,
              color: p.isUltimateActive ? "#ff5722" : "#cfd8dc",
              size: Math.random() * 4 + 1.5,
              alpha: 1,
              decay: 0.04,
              type: "dust",
            });
          }

          // Check if enemy is dead
          if (enemy.hp <= 0) {
            defeatEnemy(enemy);
          }
        }
      }
    });
  };

  // Enemy Defeated logic
  const defeatEnemy = (enemy: Enemy) => {
    // Filter out of active array
    enemies.current = enemies.current.filter((e) => e.id !== enemy.id);

    // Update state
    setScore((prev) => prev + enemy.scoreValue);
    setKillCount((prev) => prev + 1);

    // Charge Chakra
    const chakraGain = enemy.type === "heavy" ? 25 : enemy.type === "fast" ? 15 : 8;
    const p = player.current;
    p.chakra = Math.min(p.maxChakra, p.chakra + chakraGain);

    // Score float text
    addFloatingText(
      enemy.worldX,
      enemy.worldY - 15,
      `+${enemy.scoreValue}`,
      p.isUltimateActive ? "#ffd700" : "#ffffff",
      16
    );

    // Spawn chakra particle float towards player
    particles.current.push({
      worldX: enemy.worldX,
      worldY: enemy.worldY,
      vx: (p.worldX - enemy.worldX) * 0.05,
      vy: (p.worldY - enemy.worldY) * 0.05,
      color: "#00e5ff",
      size: 4,
      alpha: 1.0,
      decay: 0.01,
      type: "chakra",
    });

    // Dark smoke clouds for bandit death
    for (let i = 0; i < 8; i++) {
      particles.current.push({
        worldX: enemy.worldX,
        worldY: enemy.worldY,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        color: ["#121212", "#212121", "#37474f"][Math.floor(Math.random() * 3)],
        size: Math.random() * 7 + 4,
        alpha: 0.8,
        decay: 0.025,
        type: "dust",
      });
    }
  };

  // Spawn dynamic enemies
  const spawnEnemy = (canvasWidth: number, canvasHeight: number) => {
    const p = player.current;
    
    // Choose a random angle off-screen
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = Math.max(canvasWidth, canvasHeight) * 0.7 + 100; // Just off screen

    const worldX = p.worldX + Math.cos(spawnAngle) * spawnDist;
    const worldY = p.worldY + Math.sin(spawnAngle) * spawnDist;

    // Enemy type random weights (based on score)
    const roll = Math.random() * 100;
    let type: "normal" | "fast" | "heavy" = "normal";
    let hp = 1;
    let speed = 2.0;
    let damage = 10;
    let scoreValue = 1;

    // Scaling difficulty
    const speedBonus = Math.min(score * 0.005, 1.2); 

    if (roll > 80 && score > 10) {
      type = "heavy";
      hp = 3;
      speed = 1.3 + speedBonus * 0.5;
      damage = 25;
      scoreValue = 3;
    } else if (roll > 55 && score > 5) {
      type = "fast";
      hp = 1;
      speed = 3.2 + speedBonus;
      damage = 8;
      scoreValue = 2;
    } else {
      type = "normal";
      hp = 1;
      speed = 2.0 + speedBonus;
      damage = 12;
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
    });
  };

  // Background wind sand particle helper
  const spawnWindSandParticle = (canvasWidth: number, canvasHeight: number) => {
    particles.current.push({
      worldX: camera.current.x + canvasWidth + Math.random() * 100,
      worldY: camera.current.y + Math.random() * canvasHeight,
      vx: -4 - Math.random() * 2,
      vy: 0.5 + Math.random() * 0.5,
      color: "#e2a76f",
      size: Math.random() * 3 + 1,
      alpha: Math.random() * 0.4 + 0.1,
      decay: 0.001,
      type: "sand",
    });
  };

  const spawnInitialSandParticle = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    particles.current.push({
      worldX: camera.current.x + Math.random() * w,
      worldY: camera.current.y + Math.random() * h,
      vx: -4 - Math.random() * 2,
      vy: 0.5 + Math.random() * 0.5,
      color: "#e2a76f",
      size: Math.random() * 3 + 1,
      alpha: Math.random() * 0.4 + 0.1,
      decay: 0.001,
      type: "sand",
    });
  };

  // Floating text creator
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

  // Screen flashes / alerts
  const [flashAlpha, setFlashAlpha] = useState<number>(0);
  const [flashColor, setFlashColor] = useState<string>("#ff3d00");
  const createScreenFlash = (color: string, duration: number) => {
    setFlashColor(color);
    setFlashAlpha(0.6);
    
    let currentAlpha = 0.6;
    const fadeRate = 0.6 / duration;

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

  // Drawing Canvas Elements
  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const canvasWidth = canvas.width / dpr;
    const canvasHeight = canvas.height / dpr;

    // Clear Screen
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 1. Draw Desert Sky Gradient (Stationary)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    skyGrad.addColorStop(0, "#140d24"); // Deep twilight purple
    skyGrad.addColorStop(0.5, "#261536");
    skyGrad.addColorStop(1, "#3c2242"); // Warm twilight glow
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw static glowing blood sun / desert moon in the background
    ctx.fillStyle = "rgba(183, 28, 28, 0.15)";
    ctx.beginPath();
    ctx.arc(canvasWidth * 0.75, canvasHeight * 0.25, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 61, 0, 0.05)";
    ctx.beginPath();
    ctx.arc(canvasWidth * 0.75, canvasHeight * 0.25, 120, 0, Math.PI * 2);
    ctx.fill();

    // 2. Draw Parallax Desert Dunes
    const camX = camera.current.x;
    const camY = camera.current.y;

    // Back layer (slowest, dark sand-purple)
    ctx.fillStyle = "#3a203f";
    drawDuneLayer(ctx, canvasWidth, canvasHeight, camX * 0.15, camY * 0.1, 0.005, canvasHeight * 0.62, 45);

    // Mid layer (medium, warm reddish-brown)
    ctx.fillStyle = "#613346";
    drawDuneLayer(ctx, canvasWidth, canvasHeight, camX * 0.35, camY * 0.2, 0.008, canvasHeight * 0.72, 35);

    // Front layer (fastest, warm desert gold)
    ctx.fillStyle = "#8a4f3e";
    drawDuneLayer(ctx, canvasWidth, canvasHeight, camX * 0.55, camY * 0.35, 0.012, canvasHeight * 0.82, 25);

    // Draw custom ground texture (grid/texture details relative to camera)
    ctx.fillStyle = "#a8644e";
    ctx.fillRect(0, canvasHeight * 0.82, canvasWidth, canvasHeight * 0.2);

    // 3. Draw Game entities relative to CAMERA
    
    // Draw sand particles (desert wind)
    particles.current.forEach((part) => {
      ctx.save();
      ctx.globalAlpha = part.alpha;
      ctx.fillStyle = part.color;

      if (part.type === "sand") {
        // Draw sand dashes
        ctx.beginPath();
        const rx = part.worldX - camX;
        const ry = part.worldY - camY;
        ctx.fillRect(rx, ry, part.size * 5, part.size * 0.8);
      } else {
        // Draw round particles (dust, sparks, blood)
        ctx.beginPath();
        const rx = part.worldX - camX;
        const ry = part.worldY - camY;
        ctx.arc(rx, ry, part.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // Draw Enemies
    enemies.current.forEach((enemy) => {
      const rx = enemy.worldX - camX;
      const ry = enemy.worldY - camY;
      
      // HP Bar above enemies
      if (enemy.hp < enemy.maxHp) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(rx - 15, ry - 28, 30, 4);
        ctx.fillStyle = "#ff3d00";
        ctx.fillRect(rx - 15, ry - 28, (enemy.hp / enemy.maxHp) * 30, 4);
      }

      drawBandit(ctx, rx, ry, enemy.angle, enemy.type);
    });

    // Draw Player (Madara)
    const px = player.current.worldX - camX;
    const py = player.current.worldY - camY;
    
    // Auto-swing visual slash crescent overlay
    if (player.current.isAttacking) {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(player.current.angle);

      // Slash arc settings
      const slashRadius = player.current.isUltimateActive ? 130 : 75;
      const gradient = ctx.createRadialGradient(0, 0, 10, 0, 0, slashRadius);
      gradient.addColorStop(0, "rgba(255,255,255,0.0)");
      gradient.addColorStop(0.7, player.current.isUltimateActive ? "rgba(255, 61, 0, 0.4)" : "rgba(0, 229, 255, 0.3)");
      gradient.addColorStop(0.95, player.current.isUltimateActive ? "rgba(255, 145, 0, 0.9)" : "rgba(255, 255, 255, 0.95)");
      gradient.addColorStop(1.0, "rgba(255, 0, 0, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      // Draw a front semi-circle arc
      ctx.arc(0, 0, slashRadius, -1.2, 1.2);
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

    // Draw Floating Text
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

    // Draw ultimate screen border tint (if ultimate is active)
    if (player.current.isUltimateActive) {
      const gradient = ctx.createRadialGradient(
        canvasWidth / 2,
        canvasHeight / 2,
        canvasWidth * 0.3,
        canvasWidth / 2,
        canvasHeight / 2,
        canvasWidth * 0.7
      );
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, "rgba(183, 28, 28, 0.3)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
  };

  // Helper function to draw procedural sinewave dunes
  const drawDuneLayer = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    offsetX: number,
    offsetY: number,
    frequency: number,
    baseY: number,
    amplitude: number
  ) => {
    ctx.beginPath();
    // Start drawing offscreen left
    ctx.moveTo(0, h);
    
    for (let x = 0; x <= w + 10; x += 10) {
      // Procedural terrain: math function based on global scroll position
      const waveX = x + offsetX;
      const y = baseY - offsetY + Math.sin(waveX * frequency) * amplitude + Math.cos(waveX * frequency * 0.4) * (amplitude * 0.5);
      ctx.lineTo(x, y);
    }
    
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  };

  // Core Vector Drawing for Madara Uchiha
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

    // 1. Draw spiky hair (facing backward relative to movement angle)
    ctx.fillStyle = "#0c0614";
    ctx.beginPath();
    ctx.moveTo(-10, -15);
    ctx.lineTo(-24, -22);
    ctx.lineTo(-14, -6);
    ctx.lineTo(-26, -6);
    ctx.lineTo(-14, 5);
    ctx.lineTo(-24, 12);
    ctx.lineTo(-11, 14);
    ctx.lineTo(-18, 20);
    ctx.lineTo(-4, 16);
    ctx.closePath();
    ctx.fill();

    // 2. Draw Navy Blue Kimono base
    ctx.fillStyle = "#151b30";
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    // 3. Draw Sengoku Red Plate Armor
    ctx.fillStyle = "#8f1414"; // Crimson armor plates
    // Breastplate
    ctx.beginPath();
    ctx.arc(0, 0, 11, -Math.PI / 2, Math.PI / 2);
    ctx.fill();

    // Shoulder plates (Sode)
    ctx.fillRect(-7, -15, 5, 5);
    ctx.fillRect(-7, 10, 5, 5);
    // Waist guards (Kusazuri)
    ctx.fillRect(-13, -7, 4, 14);

    // 4. Pale Skin Face
    ctx.fillStyle = "#fce4ec";
    ctx.beginPath();
    ctx.arc(4, 0, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // 5. Sharingan Eyes (glowing red)
    ctx.fillStyle = "#ff1744";
    ctx.beginPath();
    ctx.arc(7, -2.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(7, -2.5, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // 6. Draw Katana
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 2;
    if (isAttacking) {
      ctx.save();
      // Animate rotation of katana sword
      const swingProgress = (frame % 8) / 8;
      const swordAngle = -Math.PI / 3 + swingProgress * (Math.PI * 0.8);
      
      // Blade
      ctx.beginPath();
      ctx.moveTo(8, 4);
      ctx.lineTo(8 + Math.cos(swordAngle) * 35, 4 + Math.sin(swordAngle) * 35);
      ctx.stroke();

      // Golden Hilt
      ctx.strokeStyle = "#ffb300";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(8, 4);
      ctx.lineTo(8 + Math.cos(swordAngle) * 6, 4 + Math.sin(swordAngle) * 6);
      ctx.stroke();
      ctx.restore();
    } else {
      // Sheathed Katana on Back
      ctx.strokeStyle = "#757575";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-9, 8);
      ctx.lineTo(-24, 18);
      ctx.stroke();
      
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-8, 7);
      ctx.lineTo(-21, 15);
      ctx.stroke();
    }

    // 7. Susanoo Ribcage Aura (glow effect if ultimate is active)
    if (isUltimate) {
      ctx.strokeStyle = "rgba(124, 58, 237, 0.75)";
      ctx.lineWidth = 2.5;
      
      // Drawing neon ribs wrapping player
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#7c3aed";
      
      ctx.beginPath();
      ctx.arc(0, 0, 22, -Math.PI/2, Math.PI/2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(-5, 0, 19, -Math.PI/3, Math.PI/3);
      ctx.stroke();
      
      ctx.shadowBlur = 0; // reset
    }

    ctx.restore();
  };

  // Draw Bandits Vector graphics
  const drawBandit = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    type: "normal" | "fast" | "heavy"
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const radius = type === "heavy" ? 20 : type === "fast" ? 11 : 15;

    // Dark Ninja Robe Body
    ctx.fillStyle = type === "heavy" ? "#0f0f0f" : "#242424";
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Darkened hood outline
    ctx.fillStyle = "#181818";
    ctx.beginPath();
    ctx.arc(radius * 0.25, 0, radius * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // Bandit eye glow contrast
    // Fast gets red sash/scarf tail
    if (type === "fast") {
      ctx.fillStyle = "#a11111"; // scarf fabric
      ctx.beginPath();
      ctx.moveTo(-radius * 0.4, radius * 0.4);
      ctx.lineTo(-radius * 1.3, radius * 0.8);
      ctx.lineTo(-radius * 0.8, 0);
      ctx.closePath();
      ctx.fill();
    } else if (type === "heavy") {
      // Heavy purple chest sash
      ctx.fillStyle = "#3c095c";
      ctx.fillRect(-3, -radius, 6, radius * 2);
    }

    // Glowing Eyes
    ctx.fillStyle = type === "heavy" ? "#ff1744" : "#e0e0e0";
    ctx.beginPath();
    ctx.arc(radius * 0.4, -radius * 0.2, 1.5, 0, Math.PI * 2);
    ctx.arc(radius * 0.4, radius * 0.2, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Bandit Sword/Dagger
    ctx.strokeStyle = "#828282";
    ctx.lineWidth = type === "heavy" ? 3 : 1.8;
    ctx.beginPath();
    ctx.moveTo(radius * 0.4, radius * 0.4);
    ctx.lineTo(radius * 1.1, radius * 0.55);
    ctx.stroke();

    ctx.restore();
  };

  return (
    <div className="relative flex flex-col w-full overflow-hidden border rounded-2xl glass-panel aspect-video h-[500px] md:h-[600px] border-amber-950/20 select-none">
      {/* Screen flash effect overlay */}
      {flashAlpha > 0 && (
        <div
          className="absolute inset-0 z-50 pointer-events-none transition-opacity duration-75"
          style={{ backgroundColor: flashColor, opacity: flashAlpha }}
        />
      )}

      {/* Main Canvas */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full bg-slate-900">
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

      {/* Scanline CRT overlay filter */}
      <div className="absolute inset-0 z-20 pointer-events-none scanlines opacity-40" />

      {/* Close Button Top Right */}
      <button
        onClick={onCloseGame}
        className="absolute top-4 right-4 z-40 p-2.5 rounded-full glass-panel hover:bg-red-950/40 text-amber-500 hover:text-red-400 hover:border-red-500/30 transition-all duration-300 pointer-events-auto flex items-center gap-1 text-sm font-semibold tracking-wide"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        <span className="hidden sm:inline">Close Arena</span>
      </button>

      {/* HUD Overlay (Playing state) */}
      {gameState === "playing" && (
        <div className="absolute inset-0 z-30 pointer-events-none p-4 flex flex-col justify-between">
          {/* Top Info HUD */}
          <div className="flex justify-between items-start">
            {/* Health and Chakra Bars */}
            <div className="flex flex-col gap-2.5 w-44 md:w-56 p-3 rounded-xl glass-panel pointer-events-auto">
              {/* Profile Name */}
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400 font-mono">Madara Uchiha</span>
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
                <div className="flex justify-between text-[10px] font-bold text-cyan-400 font-mono">
                  <span>CHAKRA</span>
                  <span>{player.current.chakra}%</span>
                </div>
                <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-cyan-950/25">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-800 to-cyan-400 transition-all duration-150"
                    style={{ width: `${player.current.chakra}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Score & Stats */}
            <div className="flex flex-col items-center gap-1 bg-black/45 px-5 py-2.5 rounded-2xl glass-panel border-amber-950/30">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest font-mono">Defeated</span>
              <span className="text-3xl font-extrabold text-amber-100 glow-text-red font-mono leading-none">{score}</span>
              <span className="text-[9px] font-semibold text-zinc-500 font-mono">Kills: {killCount}</span>
            </div>
          </div>

          {/* Bottom Controls UI */}
          <div className="flex justify-between items-end">
            {/* Joystick overlay for touch/mobile devices */}
            <div
              className="w-28 h-28 flex items-center justify-center rounded-full glass-panel pointer-events-auto touch-none border-dashed border-amber-500/20 active:scale-95 active:border-cyan-500/30 transition-transform sm:hidden"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="relative w-20 h-20 rounded-full bg-black/40 border border-amber-500/15 flex items-center justify-center">
                {/* Joystick knob */}
                <div
                  className="absolute w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 shadow-lg border border-amber-200 transition-transform duration-75 ease-out"
                  style={{
                    transform: `translate(${joystickUIOffset.x}px, ${joystickUIOffset.y}px)`,
                  }}
                />
              </div>
            </div>

            <div className="hidden sm:block text-[10px] font-bold text-zinc-400 glass-panel px-4 py-2 font-mono max-w-xs">
              🎮 MOVE: Mouse to aim/walk<br />
              ⚔️ AUTO-ATTACK: Approach bandits<br />
              🔥 ULTIMATE: Spacebar (at 100% Chakra)
            </div>

            {/* Ultimate Skill Button */}
            <button
              onClick={triggerUltimate}
              disabled={player.current.chakra < player.current.maxChakra || player.current.isUltimateActive}
              className={`p-3.5 rounded-full font-mono text-xs font-extrabold tracking-wider pointer-events-auto transition-all duration-300 border flex flex-col items-center gap-1 shadow-lg
                ${
                  player.current.chakra >= player.current.maxChakra && !player.current.isUltimateActive
                    ? "bg-red-700 hover:bg-red-600 border-red-500 text-white animate-pulse-glow hover:scale-105"
                    : "bg-black/60 border-zinc-800 text-zinc-600 cursor-not-allowed"
                }
              `}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.996 7.996 0 0120 13a7.997 7.997 0 01-2.343 5.657z" />
              </svg>
              <span className="text-[9px] uppercase">Fire Style</span>
            </button>
          </div>
        </div>
      )}

      {/* Menu Overlay (Start / Welcome screen) */}
      {gameState === "menu" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/75 p-6 text-center select-none">
          <div className="max-w-md p-6 rounded-2xl glass-panel-glow border-red-900/30 flex flex-col items-center gap-6">
            <div>
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono">Uchiha Clan Trial</span>
              <h2 className="text-3xl font-extrabold text-amber-500 leading-tight tracking-wider mt-1 uppercase glow-text-red">
                Madara's Stand
              </h2>
              <div className="h-0.5 w-24 bg-gradient-to-r from-transparent via-red-600 to-transparent mx-auto mt-2" />
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed font-sans max-w-sm">
              Take command of Uchiha Madara. Repel waves of desert bandits who seek to breach your boundaries. Defeat them to charge your fire chakra.
            </p>

            {highScore > 0 && (
              <div className="bg-black/35 py-1.5 px-4 rounded-lg border border-amber-950/20 text-xs font-bold text-amber-400 font-mono">
                🔥 ARENA RECORD: {highScore} DEFEATED
              </div>
            )}

            <button
              onClick={startGame}
              className="w-full sm:w-auto px-10 py-3.5 bg-gradient-to-r from-red-800 to-red-600 hover:from-red-700 hover:to-red-500 text-amber-100 font-extrabold text-sm uppercase tracking-widest rounded-full transition-all duration-300 hover:scale-105 active:scale-95 shadow-md shadow-red-950/40 border border-red-500/25"
            >
              Enter the Arena
            </button>
            
            <div className="text-[9px] text-zinc-500 font-mono select-none">
              Desktop: Move Mouse to guide. Auto-slash. Spacebar for Ultimate.<br />
              Mobile: Use Joystick and special skill touch button.
            </div>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameState === "gameover" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 p-6 text-center select-none animate-fade-in">
          <div className="max-w-md p-6 rounded-2xl glass-panel border-red-950/50 flex flex-col items-center gap-5">
            <div>
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono">Defeated in Battle</span>
              <h2 className="text-4xl font-extrabold text-red-600 leading-tight tracking-wider mt-1 uppercase glow-text-red">
                Overwhelmed
              </h2>
            </div>

            <div className="flex flex-col gap-1 w-full bg-black/40 p-4 rounded-xl border border-amber-950/10 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Defeated Bandits:</span>
                <span className="text-amber-400 font-extrabold">{score}</span>
              </div>
              <div className="flex justify-between border-t border-amber-950/15 pt-2 mt-2">
                <span className="text-zinc-500">Record:</span>
                <span className="text-amber-500 font-extrabold">{highScore}</span>
              </div>
            </div>

            <button
              onClick={startGame}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-red-800 to-red-600 hover:from-red-700 hover:to-red-500 text-amber-100 font-extrabold text-xs uppercase tracking-widest rounded-full transition-all duration-300 hover:scale-105 active:scale-95 border border-red-500/25"
            >
              Fight Again
            </button>

            <button
              onClick={onCloseGame}
              className="text-xs text-zinc-500 hover:text-amber-500 transition-colors uppercase tracking-wider font-semibold font-mono"
            >
              Exit Arena
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
