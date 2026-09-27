import { Overworld } from "./overworld.js";
import { Battle } from "./battle.js";
import { Cutscene } from "./cutscene.js";
import { LevelUpFlow } from "./levelup.js";
import { renderSquadSummary } from "./summary.js";
import { WorldMap } from "./worldmap.js";
import { Shop } from "./shop.js";
import { createStartingSquad, createEnemyGroup } from "./entities.js";
import { LEVELS, instantiateLevel } from "./levels.js";
import { clearPresses, wasPressed } from "./input.js";
import { playMusic, stopMusic, toggleMuted } from "./audio.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const hud = document.getElementById("hud");
const summaryBtn = document.getElementById("summary-btn");
const mapBtn = document.getElementById("map-btn");
const muteBtn = document.getElementById("mute-btn");

const squad = createStartingSquad();
let coins = 0;
const wallet = {
  getCoins: () => coins,
  spendCoins: (amount) => {
    coins = Math.max(0, coins - amount);
  },
};

const levelCleared = LEVELS.map(() => false);

let scene = "cutscene";
let previousScene = "overworld";
let levelIndex = 0;
let overworld = new Overworld(canvas, instantiateLevel(levelIndex));
let battle = null;
let levelUpFlow = null;
let worldMap = null;
let shop = null;
let endMessage = null;

let cutscene = new Cutscene(canvas, () => {
  cutscene = null;
  scene = "overworld";
});

function startBattle(encounter) {
  const enemies = createEnemyGroup(encounter.kind);
  battle = new Battle(canvas, squad, enemies, (result, pendingUnlocks, coinsGained) =>
    onBattleEnd(result, pendingUnlocks, coinsGained, encounter)
  );
  scene = "battle";
}

function onBattleEnd(result, pendingUnlocks, coinsGained, encounter) {
  battle = null;
  if (result === "victory") {
    encounter.defeated = true;
    coins += coinsGained ?? 0;
    if (pendingUnlocks && pendingUnlocks.length) {
      levelUpFlow = new LevelUpFlow(canvas, pendingUnlocks, () => {
        levelUpFlow = null;
        scene = "overworld";
      });
      scene = "levelup";
    } else {
      scene = "overworld";
    }
  } else {
    endMessage = "Your squad was defeated. Refresh to try again.";
    scene = "gameover";
  }
}

function handleEncounter(encounter) {
  if (encounter.victory) {
    levelCleared[levelIndex] = true;
    if (levelIndex === LEVELS.length - 1) {
      endMessage = "You defeated the Shadow Lord and saved the land! Press Enter to continue.";
      scene = "win";
    } else {
      openWorldMap(LEVELS[levelIndex].name);
    }
    return;
  }
  startBattle(encounter);
}

function openWorldMap(justCleared = null) {
  worldMap = new WorldMap(canvas, { levelCleared, getCoins: wallet.getCoins, justCleared }, (choice) => {
    worldMap = null;
    if (choice.action === "shop") {
      openShop();
    } else if (choice.action === "level") {
      if (choice.levelIndex === levelIndex) {
        // Already playing this level — resume it as-is instead of
        // restarting it and losing which enemies are already defeated.
        scene = "overworld";
      } else {
        travelToLevel(choice.levelIndex);
      }
    } else {
      scene = "overworld";
    }
  });
  scene = "worldmap";
}

function openShop() {
  shop = new Shop(canvas, squad, wallet, () => {
    shop = null;
    openWorldMap();
  });
  scene = "shop";
}

function travelToLevel(index) {
  levelIndex = index;
  overworld = new Overworld(canvas, instantiateLevel(index));
  scene = "overworld";
}

function toggleSummary() {
  if (scene === "summary") {
    scene = previousScene;
  } else if (scene === "overworld") {
    previousScene = scene;
    scene = "summary";
  }
}

function toggleMap() {
  if (scene === "worldmap") {
    worldMap?.destroy();
    worldMap = null;
    scene = "overworld";
  } else if (scene === "overworld") {
    openWorldMap();
  }
}

// Buttons keep keyboard focus after a click, and Space/Enter both activate a
// focused button — so without this, clicking a button once meant every later
// Space press (jump) or Enter press also re-fired it. Stop them from ever
// taking focus in the first place.
function wireButton(btn, handler) {
  btn.addEventListener("mousedown", (e) => e.preventDefault());
  btn.addEventListener("click", () => {
    handler();
    btn.blur();
  });
}

wireButton(summaryBtn, toggleSummary);
wireButton(mapBtn, toggleMap);
wireButton(muteBtn, () => {
  const muted = toggleMuted();
  muteBtn.textContent = muted ? "🔇" : "🔊";
});

function updateMusic() {
  if (scene === "overworld" || scene === "summary") {
    const bg = overworld.level.background;
    playMusic(bg === "sunny" ? "sunny" : bg === "dusk" ? "dusk" : "overworld");
  } else if (scene === "battle") {
    playMusic("battle");
  } else if (scene === "cutscene" || scene === "worldmap" || scene === "shop" || scene === "levelup") {
    playMusic("hub");
  } else {
    stopMusic();
  }
}

function updateHud() {
  if (scene === "overworld") {
    hud.innerHTML =
      squad
        .map(
          (h) =>
            `<div><strong>${h.name}</strong> Lv${h.level} — HP ${h.hp}/${h.maxHp} MP ${h.mp}/${h.maxMp}</div>`
        )
        .join("") + `<div>Coins: ${coins}</div>`;
  } else {
    hud.innerHTML = "";
  }
}

function renderMessageScreen() {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = "28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(endMessage, canvas.width / 2, canvas.height / 2);
  ctx.textAlign = "left";
}

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if ((scene === "overworld" || scene === "summary") && wasPressed("KeyS")) {
    toggleSummary();
  } else if (scene === "summary" && wasPressed("Escape")) {
    toggleSummary();
  } else if (scene === "overworld" && wasPressed("KeyM")) {
    toggleMap();
  }

  if (scene === "cutscene" && cutscene) {
    const activeCutscene = cutscene;
    activeCutscene.update(dt);
    activeCutscene.render(ctx);
  } else if (scene === "overworld") {
    overworld.update(
      dt,
      handleEncounter,
      (amount) => {
        coins += amount;
      },
      (damage) => {
        const aliveHeroes = squad.filter((h) => h.alive);
        if (!aliveHeroes.length) return;
        const target = aliveHeroes[Math.floor(Math.random() * aliveHeroes.length)];
        target.takeDamage(damage);
      }
    );
    overworld.render(ctx);
  } else if (scene === "summary") {
    overworld.render(ctx);
    renderSquadSummary(ctx, canvas, squad);
  } else if (scene === "battle" && battle) {
    const activeBattle = battle;
    activeBattle.update(dt);
    activeBattle.render(ctx);
  } else if (scene === "levelup" && levelUpFlow) {
    const activeFlow = levelUpFlow;
    activeFlow.update(dt);
    activeFlow.render(ctx);
  } else if (scene === "worldmap" && worldMap) {
    const activeMap = worldMap;
    activeMap.update(dt);
    activeMap.render(ctx);
  } else if (scene === "shop" && shop) {
    const activeShop = shop;
    activeShop.update(dt);
    activeShop.render(ctx);
  } else if (scene === "gameover") {
    renderMessageScreen();
  } else if (scene === "win") {
    renderMessageScreen();
    if (wasPressed("Enter")) openWorldMap();
  }

  updateHud();
  updateMusic();
  // Hidden outside scenes where they're usable, so they can never sit on top
  // of (and steal clicks from) the battle menu, shop, or other canvas UI.
  const showHubButtons = scene === "overworld" || scene === "summary" || scene === "worldmap";
  summaryBtn.style.display = scene === "overworld" || scene === "summary" ? "block" : "none";
  mapBtn.style.display = showHubButtons ? "block" : "none";
  clearPresses();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
