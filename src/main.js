import { Overworld } from "./overworld.js";
import { Battle } from "./battle.js";
import { createStartingSquad, createEnemyGroup } from "./entities.js";
import { clearPresses } from "./input.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const hud = document.getElementById("hud");

const squad = createStartingSquad();
let scene = "overworld";
let overworld = new Overworld(canvas);
let battle = null;
let gameOverMessage = null;

function startBattle(encounter) {
  const enemies = createEnemyGroup(encounter.kind);
  battle = new Battle(canvas, squad, enemies, (result) => onBattleEnd(result, encounter));
  scene = "battle";
}

function onBattleEnd(result, encounter) {
  battle = null;
  if (result === "victory") {
    encounter.defeated = true;
    scene = "overworld";
  } else {
    gameOverMessage = "Your squad was defeated. Refresh to try again.";
    scene = "gameover";
  }
}

function handleEncounter(encounter) {
  if (encounter.victory) {
    gameOverMessage = "You defeated the Warlord and cleared the level!";
    scene = "win";
    return;
  }
  startBattle(encounter);
}

function updateHud() {
  if (scene === "overworld") {
    hud.innerHTML = squad
      .map(
        (h) =>
          `<div><strong>${h.name}</strong> Lv${h.level} — HP ${h.hp}/${h.maxHp} MP ${h.mp}/${h.maxMp}</div>`
      )
      .join("");
  } else {
    hud.innerHTML = "";
  }
}

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (scene === "overworld") {
    overworld.update(dt, handleEncounter);
    overworld.render(ctx);
  } else if (scene === "battle" && battle) {
    const activeBattle = battle;
    activeBattle.update(dt);
    activeBattle.render(ctx);
  } else if (scene === "gameover" || scene === "win") {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(gameOverMessage, canvas.width / 2, canvas.height / 2);
    ctx.textAlign = "left";
  }

  updateHud();
  clearPresses();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
