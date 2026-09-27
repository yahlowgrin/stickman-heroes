import { drawStickman, drawHpBar } from "./draw.js";
import { wasPressed } from "./input.js";

const HERO_X = [150, 260, 370];
const HERO_Y = 380;
const ENEMY_BASE_X = 620;
// Enemies are laid out within this vertical band so they never overlap the
// bottom log/menu panel, regardless of how many are in the group.
const ENEMY_TOP_Y = 220;
const ENEMY_BOTTOM_Y = 420;

function enemyYPositions(count) {
  if (count <= 1) return [(ENEMY_TOP_Y + ENEMY_BOTTOM_Y) / 2];
  const step = (ENEMY_BOTTOM_Y - ENEMY_TOP_Y) / (count - 1);
  return Array.from({ length: count }, (_, i) => ENEMY_TOP_Y + step * i);
}

export class Battle {
  constructor(canvas, heroes, enemies, onEnd) {
    this.canvas = canvas;
    this.heroes = heroes;
    this.enemies = enemies;
    this.onEnd = onEnd;

    this.t = 0;
    this.log = ["A wild encounter begins!"];
    this.phase = "MENU"; // MENU, TARGET, ANIMATING, DONE
    this.menuOptions = [];
    this.targetOptions = [];
    this.pendingAction = null;
    this.animTimer = 0;
    this.result = null; // "victory" | "defeat"
    this.expGained = 0;
    this.levelResults = []; // [{ hero, levels }]
    this.pendingUnlocks = []; // [{ hero, skill }]

    this.queue = [];
    this.currentActor = null;

    this._clickHandler = (e) => this.handleClick(e);
    canvas.addEventListener("click", this._clickHandler);

    this.startRound();
  }

  destroy() {
    this.canvas.removeEventListener("click", this._clickHandler);
  }

  addLog(text) {
    this.log.unshift(text);
    if (this.log.length > 4) this.log.length = 4;
  }

  startRound() {
    const all = [...this.heroes, ...this.enemies].filter((u) => u.alive);
    this.queue = all.sort((a, b) => b.spd - a.spd + (Math.random() - 0.5));
    this.nextTurn();
  }

  nextTurn() {
    if (this.checkEnd()) return;

    while (this.queue.length && !this.queue[0].alive) this.queue.shift();
    if (!this.queue.length) {
      this.startRound();
      return;
    }

    const actor = this.queue.shift();
    if (!actor.alive) {
      this.nextTurn();
      return;
    }
    actor.defending = false;
    this.currentActor = actor;

    if (this.heroes.includes(actor)) {
      this.openMenu(actor);
    } else {
      this.enemyAct(actor);
    }
  }

  checkEnd() {
    if (this.heroes.every((h) => !h.alive)) {
      this.phase = "DONE";
      this.result = "defeat";
      this.addLog("Your squad has fallen...");
      return true;
    }
    if (this.enemies.every((e) => !e.alive)) {
      this.phase = "DONE";
      this.result = "victory";
      this.expGained = this.enemies.reduce((s, e) => s + e.expReward, 0);
      this.levelResults = [];
      this.pendingUnlocks = [];
      const share = Math.ceil(this.expGained / this.heroes.filter((h) => h.alive).length);
      for (const h of this.heroes) {
        if (!h.alive) continue;
        const levels = h.gainExp(share);
        if (levels.length) {
          this.levelResults.push({ hero: h, levels });
          for (const unlock of h.getUnlocksForLevels(levels)) {
            this.pendingUnlocks.push({ hero: h, skill: unlock.skill });
          }
        }
      }
      this.addLog("Victory! Gained " + this.expGained + " EXP.");
      return true;
    }
    return false;
  }

  openMenu(hero) {
    this.phase = "MENU";
    const options = [{ label: "Attack", type: "attack" }];
    for (const skill of hero.skills) {
      let tag = "";
      if (skill.hitAll) tag = " [All]";
      else if (skill.healAll) tag = " [All]";
      else if (skill.hitCount) tag = ` [x${skill.hitCount}]`;
      options.push({
        label: `${skill.name}${tag} (${skill.mpCost} MP)`,
        type: "skill",
        skill,
        disabled: hero.mp < skill.mpCost,
      });
    }
    options.push({ label: "Defend", type: "defend" });
    this.menuOptions = options;
  }

  chooseAction(option) {
    if (option.disabled) return;
    if (option.type === "defend") {
      this.currentActor.defending = true;
      this.addLog(`${this.currentActor.name} braces for impact.`);
      this.phase = "ANIMATING";
      this.animTimer = 0.5;
      this.pendingAction = null;
      return;
    }

    if (option.type === "skill" && (option.skill.hitAll || option.skill.hitCount || option.skill.healAll)) {
      this.resolveAreaSkill(option.skill);
      return;
    }

    this.pendingAction = option;
    this.phase = "TARGET";
    this.targetOptions = option.skill?.heal
      ? this.heroes.filter((h) => h.alive)
      : this.enemies.filter((e) => e.alive);
  }

  resolveAreaSkill(skill) {
    const actor = this.currentActor;
    actor.mp -= skill.mpCost;

    if (skill.healAll) {
      for (const t of this.heroes.filter((h) => h.alive)) t.heal(skill.healAll);
      this.addLog(`${actor.name} casts ${skill.name}, healing the whole squad!`);
    } else if (skill.hitAll) {
      for (const t of this.enemies.filter((e) => e.alive)) {
        const dmg = t.takeDamage(Math.round(actor.atk * skill.power));
        this.addLog(`${actor.name}'s ${skill.name} hits ${t.name} for ${dmg}.`);
      }
    } else if (skill.hitCount) {
      const alive = this.enemies.filter((e) => e.alive);
      for (let i = 0; i < skill.hitCount && alive.length; i++) {
        const t = alive[Math.floor(Math.random() * alive.length)];
        const dmg = t.takeDamage(Math.round(actor.atk * skill.power));
        this.addLog(`${actor.name}'s ${skill.name} hits ${t.name} for ${dmg}.`);
        if (!t.alive) alive.splice(alive.indexOf(t), 1);
      }
    }

    this.phase = "ANIMATING";
    this.animTimer = 0.6;
    this.pendingAction = null;
  }

  chooseTarget(target) {
    const actor = this.currentActor;
    const action = this.pendingAction;

    if (action.type === "attack") {
      const dmg = target.takeDamage(actor.atk);
      this.addLog(`${actor.name} hits ${target.name} for ${dmg}.`);
    } else if (action.type === "skill") {
      const skill = action.skill;
      actor.mp -= skill.mpCost;
      if (skill.heal) {
        target.heal(skill.heal);
        this.addLog(`${actor.name} casts ${skill.name}, healing ${target.name} for ${skill.heal}.`);
      } else {
        const dmg = target.takeDamage(Math.round(actor.atk * skill.power));
        this.addLog(`${actor.name} casts ${skill.name} on ${target.name} for ${dmg}!`);
      }
    }

    this.phase = "ANIMATING";
    this.animTimer = 0.6;
    this.pendingAction = null;
  }

  enemyAct(enemy) {
    this.phase = "ANIMATING";
    this.animTimer = 0.6;
    const aliveHeroes = this.heroes.filter((h) => h.alive);
    const target = aliveHeroes[Math.floor(Math.random() * aliveHeroes.length)];
    const dmg = target.takeDamage(enemy.atk);
    this.addLog(`${enemy.name} attacks ${target.name} for ${dmg}.`);
  }

  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const list = this.phase === "MENU" ? this._menuRects : this.phase === "TARGET" ? this._targetRects : null;
    if (!list) return;
    for (const item of list) {
      if (mx >= item.x && mx <= item.x + item.w && my >= item.y && my <= item.y + item.h) {
        if (this.phase === "MENU") this.chooseAction(item.option);
        else this.chooseTarget(item.unit);
        return;
      }
    }
  }

  update(dt) {
    this.t += dt;

    if (this.phase === "ANIMATING") {
      this.animTimer -= dt;
      if (this.animTimer <= 0) {
        this.nextTurn();
      }
      return;
    }

    if (this.phase === "MENU" && this.menuOptions.length) {
      const idx = ["Digit1", "Digit2", "Digit3", "Digit4"].findIndex((code) => wasPressed(code));
      if (idx >= 0 && this.menuOptions[idx]) this.chooseAction(this.menuOptions[idx]);
    }

    if (this.phase === "TARGET" && this.targetOptions.length) {
      const idx = ["Digit1", "Digit2", "Digit3", "Digit4"].findIndex((code) => wasPressed(code));
      if (idx >= 0 && this.targetOptions[idx]) this.chooseTarget(this.targetOptions[idx]);
    }

    if (this.phase === "DONE" && wasPressed("Enter")) {
      this.destroy();
      this.onEnd(this.result, this.pendingUnlocks);
    }
  }

  render(ctx) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#2b1055");
    grad.addColorStop(1, "#7597de");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#33254d";
    ctx.fillRect(0, h - 100, w, 100);

    // Heroes
    this.heroes.forEach((hero, i) => {
      if (!hero.alive) return;
      const x = HERO_X[i];
      const pose = hero === this.currentActor && this.phase === "ANIMATING" ? "attack" : hero.defending ? "defend" : "idle";
      drawStickman(ctx, { x, y: HERO_Y, scale: 1.3, color: hero.color, facing: 1, pose, t: this.t });
      drawHpBar(ctx, x - 30, HERO_Y - 60, 60, 8, hero.hp / hero.maxHp);
      ctx.fillStyle = "#fff";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${hero.name} Lv${hero.level}`, x, HERO_Y - 66);
      ctx.fillText(`${hero.hp}/${hero.maxHp} HP  ${hero.mp}/${hero.maxMp} MP`, x, HERO_Y - 48);
    });

    // Enemies
    const enemyYs = enemyYPositions(this.enemies.length);
    this.enemies.forEach((enemy, i) => {
      if (!enemy.alive) return;
      const x = ENEMY_BASE_X;
      const y = enemyYs[i];
      const pose = enemy === this.currentActor && this.phase === "ANIMATING" ? "attack" : "idle";
      drawStickman(ctx, { x, y, scale: 1.3, color: enemy.color, facing: -1, pose, t: this.t });
      drawHpBar(ctx, x - 30, y - 60, 60, 8, enemy.hp / enemy.maxHp, "#e67e22");
      ctx.fillStyle = "#fff";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(enemy.name, x, y - 66);
    });
    ctx.textAlign = "left";

    // Log
    ctx.fillStyle = "#fff";
    ctx.font = "13px sans-serif";
    this.log.forEach((line, i) => {
      ctx.fillText(line, 16, h - 82 + i * 16);
    });

    this._menuRects = [];
    this._targetRects = [];

    if (this.phase === "MENU") {
      this.menuOptions.forEach((opt, i) => {
        const x = w - 260;
        const y = h - 96 + i * 24;
        const rect = { x, y, w: 240, h: 20, option: opt };
        this._menuRects.push(rect);
        ctx.fillStyle = opt.disabled ? "#555" : "#00000088";
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.fillStyle = opt.disabled ? "#999" : "#fff";
        ctx.fillText(`${i + 1}. ${opt.label}`, rect.x + 6, rect.y + 15);
      });
    } else if (this.phase === "TARGET") {
      this.targetOptions.forEach((unit, i) => {
        const x = w - 260;
        const y = h - 96 + i * 24;
        const rect = { x, y, w: 240, h: 20, unit };
        this._targetRects.push(rect);
        ctx.fillStyle = "#00000088";
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.fillStyle = "#fff";
        ctx.fillText(`${i + 1}. ${unit.name} (${unit.hp}/${unit.maxHp})`, rect.x + 6, rect.y + 15);
      });
    } else if (this.phase === "DONE") {
      this.renderResultPanel(ctx, w, h);
    }
  }

  renderResultPanel(ctx, w, h) {
    const survivors = this.heroes.filter((h) => h.alive);
    const panelH = this.result === "victory" ? 90 + survivors.length * 18 + 20 : 100;
    const top = h / 2 - panelH / 2;

    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(w / 2 - 240, top, 480, panelH);
    ctx.fillStyle = "#fff";
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.result === "victory" ? "VICTORY!" : "DEFEAT...", w / 2, top + 34);

    let ly = top + 58;
    ctx.font = "13px sans-serif";
    if (this.result === "victory") {
      ctx.fillText(`+${this.expGained} EXP shared across the squad`, w / 2, ly);
      ly += 20;
      for (const hero of survivors) {
        const leveled = this.levelResults.some((r) => r.hero === hero);
        const text = `${hero.name} Lv${hero.level} — ${hero.exp}/${hero.expToNext} EXP to next${leveled ? "  (Leveled up!)" : ""}`;
        ctx.fillStyle = leveled ? "#ffe066" : "#fff";
        ctx.fillText(text, w / 2, ly);
        ly += 18;
      }
      ctx.fillStyle = "#fff";
      ly += 6;
    }
    ctx.fillText("Press Enter to continue", w / 2, ly);
    ctx.textAlign = "left";
  }
}
