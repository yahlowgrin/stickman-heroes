import { drawStickman } from "./draw.js";
import { wasPressed } from "./input.js";
import { MAX_SKILLS } from "./entities.js";

// Walks the player through a queue of { hero, skill } move unlocks after a
// victory: learn the move, skip it, or (if the hero's moves are full) pick
// which existing move to replace.
export class LevelUpFlow {
  constructor(canvas, events, onDone) {
    this.canvas = canvas;
    this.events = events;
    this.index = 0;
    this.onDone = onDone;
    this.stage = "prompt";
    this.options = [];
    this.t = 0;
    this._rects = [];

    this._clickHandler = (e) => this.handleClick(e);
    canvas.addEventListener("click", this._clickHandler);
    this.buildPromptOptions();
  }

  destroy() {
    this.canvas.removeEventListener("click", this._clickHandler);
  }

  get current() {
    return this.events[this.index];
  }

  buildPromptOptions() {
    this.stage = "prompt";
    this.options = [
      { label: "Learn it", action: "learn" },
      { label: "Not now", action: "skip" },
    ];
  }

  buildReplaceOptions() {
    this.stage = "replace";
    const hero = this.current.hero;
    this.options = hero.skills.map((s, i) => ({ label: `Replace ${s.name}`, action: "replace", index: i }));
    this.options.push({ label: "Don't learn it", action: "cancel" });
  }

  choose(option) {
    const { hero, skill } = this.current;
    if (option.action === "learn") {
      if (hero.skills.length < MAX_SKILLS) {
        hero.learnSkill(skill);
        this.advance();
      } else {
        this.buildReplaceOptions();
      }
    } else if (option.action === "replace") {
      hero.learnSkill(skill, option.index);
      this.advance();
    } else {
      this.advance();
    }
  }

  advance() {
    this.index += 1;
    if (this.index >= this.events.length) {
      this.destroy();
      this.onDone();
    } else {
      this.buildPromptOptions();
    }
  }

  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    for (const item of this._rects) {
      if (mx >= item.x && mx <= item.x + item.w && my >= item.y && my <= item.y + item.h) {
        this.choose(item.option);
        return;
      }
    }
  }

  update(dt) {
    this.t += dt;
    const idx = ["Digit1", "Digit2", "Digit3", "Digit4"].findIndex((code) => wasPressed(code));
    if (idx >= 0 && this.options[idx]) this.choose(this.options[idx]);
  }

  render(ctx) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const { hero, skill } = this.current;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#1b1030");
    grad.addColorStop(1, "#3a2060");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    drawStickman(ctx, { x: w / 2, y: 250, scale: 2, color: hero.color, facing: 1, pose: "idle", t: this.t });

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "22px sans-serif";
    ctx.fillText(`${hero.name} reached Level ${hero.level}!`, w / 2, 300);

    ctx.font = "16px sans-serif";
    if (this.stage === "prompt") {
      ctx.fillText(`New move available: ${skill.name}`, w / 2, 330);
    } else {
      ctx.fillText(`${hero.name}'s moves are full. Replace one with ${skill.name}?`, w / 2, 330);
    }

    this._rects = [];
    this.options.forEach((opt, i) => {
      const bw = 320;
      const x = w / 2 - bw / 2;
      const y = 365 + i * 34;
      const rect = { x, y, w: bw, h: 28, option: opt };
      this._rects.push(rect);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = "#fff";
      ctx.font = "14px sans-serif";
      ctx.fillText(`${i + 1}. ${opt.label}`, w / 2, rect.y + 19);
    });

    ctx.textAlign = "left";
  }
}
