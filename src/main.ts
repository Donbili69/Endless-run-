// 1. Structural Constants & Game States
const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;
type GameState = "MENU" | "PLAYING" | "GAMEOVER";

let gameState: GameState = "MENU";
let score = 0;
let coins = 0;

// Game Loop Multipliers & Positions
let playerX = 400;
let targetX = 400;
let currentLane = 1;
const lanes = [250, 400, 550];
let gameSpeed = 6;
let spawnTimer = 0;
let lastTime = 0;

// 2. Base Entity Framework Classes
abstract class SpawnableEntity {
  constructor(public x: number, public y: number, protected speed: number, public size: number = 40) {}
  
  update(deltaTime: number) {
    this.y += this.speed * deltaTime * 60;
  }
  abstract draw(ctx: CanvasRenderingContext2D): void;
}

class Obstacle extends SpawnableEntity {
  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#991b1b"; // Deep Maroon
    ctx.strokeStyle = "#eab308"; // Warning Border
    ctx.lineWidth = 2;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.strokeRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
  }
}

class Coin extends SpawnableEntity {
  constructor(x: number, y: number, speed: number) {
    super(x, y, speed, 24);
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#eab308"; // Arcade Gold
    ctx.fill();
    ctx.strokeStyle = "#fef08a";
    ctx.stroke();
  }
}

let entities: SpawnableEntity[] = [];

function initApp() {
  const appContainer = document.querySelector("#app");
  if (!appContainer) {
    setTimeout(initApp, 10);
    return;
  }

  appContainer.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background-color: #09090b; font-family: sans-serif; color: #f4f4f5; user-select: none;">
      <div style="width: 800px; background-color: #18181b; border: 1px solid #27272a; border-top-left-radius: 12px; border-top-right-radius: 12px; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box;">
        <div style="display: flex; gap: 24px;">
          <div>
            <span style="font-size: 11px; font-weight: 600; color: #71717a; text-transform: uppercase; tracking: 0.05em; display: block;">Score</span>
            <span id="hud-score" style="font-size: 24px; font-weight: bold; font-family: monospace;">0</span>
          </div>
          <div>
            <span style="font-size: 11px; font-weight: 600; color: #71717a; text-transform: uppercase; tracking: 0.05em; display: block;">Looted Wallet</span>
            <span id="hud-coins" style="font-size: 24px; font-weight: bold; font-family: monospace; color: #fbbf24;">🪙 0</span>
          </div>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 11px; font-weight: 600; color: #71717a; text-transform: uppercase; tracking: 0.05em; display: block;">Personal Best</span>
          <span id="hud-highscore" style="font-size: 18px; font-weight: bold; font-family: monospace; color: #a1a1aa;">0</span>
        </div>
      </div>

      <div style="width: 800px; height: 600px; border-left: 1px solid #27272a; border-right: 1px solid #27272a; border-bottom: 1px solid #27272a; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; overflow: hidden; position: relative;">
        <canvas id="gameCanvas" width="800" height="600" style="display: block;"></canvas>

        <div id="menuOverlay" style="position: absolute; inset: 0; background-color: rgba(9, 9, 11, 0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px;">
          <div style="text-align: center;">
            <h1 style="font-size: 36px; font-weight: 800; background: linear-gradient(to right, #38bdf8, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0 0 8px 0;">TAURI ENGINE RUNNER</h1>
            <p style="color: #52525b; margin: 0; font-size: 14px;">Native Webview Canvas Implementation</p>
          </div>
          <button id="startBtn" style="padding: 12px 32px; background-color: #0284c7; color: white; border: none; font-weight: 500; border-radius: 8px; cursor: pointer; font-size: 15px; transition: background 0.2s;">LAUNCH ENGINE</button>
        </div>
      </div>
    </div>
  `;

  setupGameEngine();
}

initApp();

// 4. Core Pipeline Loops
function setupGameEngine() {
  const canvas = document.querySelector("#gameCanvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  
  const menuOverlay = document.querySelector("#menuOverlay") as HTMLElement;
  const startBtn = document.querySelector("#startBtn") as HTMLButtonElement;
  
  const scoreLabel = document.querySelector("#hud-score")!;
  const coinsLabel = document.querySelector("#hud-coins")!;
  startBtn.addEventListener("click", () => {
    gameState = "PLAYING";
    menuOverlay.style.display = "none";
    score = 0;
    coins = 0;
    entities = [];
    gameSpeed = 6;
    spawnTimer = 0;
    lastTime = performance.now();
    requestAnimationFrame(gameTick);
  });

  // Handle clean lane transition switches
  window.addEventListener("keydown", (e) => {
    if (gameState !== "PLAYING") return;
    if (e.key === "ArrowLeft" && currentLane > 0) currentLane--;
    if (e.key === "ArrowRight" && currentLane < 2) currentLane++;
    targetX = lanes[currentLane];
  });

  function gameTick(time: number) {
    if (gameState !== "PLAYING") return;

    const deltaTime = (time - lastTime) / 1000;
    lastTime = time;

    // Background Canvas Pass
    ctx.fillStyle = "#18181b";
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Track Guides Line Renderers
    lanes.forEach(x => {
      ctx.strokeStyle = "#27272a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, SCREEN_HEIGHT);
      ctx.stroke();
    });

    // Linear interpolator engine tracking for smooth transitions
    playerX += (targetX - playerX) * 0.2;

    // Draw Player Character Object Frame
    ctx.beginPath();
    ctx.arc(playerX, 500, 24, 0, Math.PI * 2);
    ctx.fillStyle = "#0284c7";
    ctx.fill();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Spawn Sequence Tick
    spawnTimer += deltaTime;
    if (spawnTimer >= 1.2) {
      spawnTimer = 0;
      const targetLane = Math.floor(Math.random() * 3);
      const spawnX = lanes[targetLane];
      if (Math.random() < 0.7) {
        entities.push(new Obstacle(spawnX, -50, gameSpeed));
      } else {
        entities.push(new Coin(spawnX, -50, gameSpeed));
      }
    }

    // Process Entities Array Matrix
    for (let i = entities.length - 1; i >= 0; i--) {
      const entity = entities[i];
      entity.update(deltaTime);
      entity.draw(ctx);

      // Collision Matrix Evaluations
      const dx = Math.abs(playerX - entity.x);
      const dy = Math.abs(500 - entity.y);

      if (dx < 24 + entity.size / 2 && dy < 24 + entity.size / 2) {
        if (entity instanceof Obstacle) {
          gameState = "GAMEOVER";
          menuOverlay.style.display = "flex";
          menuOverlay.innerHTML = `
            <h2 style="color: #ef4444; font-size: 32px; font-weight: bold; margin: 0;">SYSTEM CRASH</h2>
            <p style="color: #a1a1aa; margin: 0;">Final Score: ${Math.floor(score / 10)}</p>
            <button id="retryBtn" style="padding: 12px 32px; background-color: #27272a; color: white; border: 1px solid #3f3f46; font-weight: 500; border-radius: 8px; cursor: pointer; transition: background 0.2s;">REBOOT RUNNER</button>
          `;
          document.querySelector("#retryBtn")!.addEventListener("click", () => {
            location.reload(); // Quick reboot trigger state reset
          });
          return;
        } else if (entity instanceof Coin) {
          coins++;
          coinsLabel.innerHTML = `🪙 ${coins}`;
          score += 200;
          entities.splice(i, 1);
          continue;
        }
      }

      // Cleanup
      if (entity.y > SCREEN_HEIGHT + 50) {
        entities.splice(i, 1);
      }
    }

    score++;
    gameSpeed += deltaTime * 0.05;
    scoreLabel.innerHTML = `${Math.floor(score / 10)}`;

    requestAnimationFrame(gameTick);
  }
}