import { drawStickman } from "./draw.js";
import { wasPressed } from "./input.js";

const SLIDES = [
  {
    text: "The land has fallen under the shadow of the Warlord and his raiders.",
    actors: [{ x: 480, color: "#3a0ca3", scale: 1.6, facing: -1 }],
  },
  {
    text: "Three unlikely heroes answer the call: Rook the stalwart, Sable the swift, and Wisp the arcane.",
    actors: [
      { x: 380, color: "#e94560", scale: 1.4, facing: 1 },
      { x: 460, color: "#4ecca3", scale: 1.4, facing: 1 },
      { x: 540, color: "#7f5af0", scale: 1.4, facing: 1 },
    ],
  },
  {
    text: "Their journey will take them across the wilds, through packs of goblins and bandits, to the Warlord's stronghold.",
    actors: [
      { x: 380, color: "#e94560", scale: 1.4, facing: 1 },
      { x: 460, color: "#4ecca3", scale: 1.4, facing: 1 },
      { x: 540, color: "#7f5af0", scale: 1.4, facing: 1 },
    ],
  },
  {
    text: "Every enemy in your path will force a battle. Fight wisely, level up, and defeat the Warlord to save the land.",
    actors: [
      { x: 380, color: "#e94560", scale: 1.4, facing: 1 },
      { x: 620, color: "#3a0ca3", scale: 1.6, facing: -1 },
    ],
  },
];

export class Cutscene {
  constructor(canvas, onDone) {
    this.canvas = canvas;
    this.onDone = onDone;
    this.index = 0;
    this.t = 0;

    this._clickHandler = () => this.advance();
    canvas.addEventListener("click", this._clickHandler);
  }

  destroy() {
    this.canvas.removeEventListener("click", this._clickHandler);
  }

  advance() {
    this.index += 1;
    if (this.index >= SLIDES.length) {
      this.destroy();
      this.onDone();
    }
  }

  update(dt) {
    this.t += dt;
    if (wasPressed("Enter") || wasPressed("Space")) this.advance();
    if (wasPressed("Escape")) {
      this.destroy();
      this.onDone();
    }
  }

  render(ctx) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#0f0f1a");
    grad.addColorStop(1, "#2b1055");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const slide = SLIDES[this.index];
    if (!slide) return;

    for (const actor of slide.actors) {
      drawStickman(ctx, {
        x: actor.x,
        y: 320,
        scale: actor.scale,
        color: actor.color,
        facing: actor.facing,
        pose: "idle",
        t: this.t,
      });
    }

    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(60, h - 150, w - 120, 110);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.strokeRect(60, h - 150, w - 120, 110);

    ctx.fillStyle = "#fff";
    ctx.font = "18px sans-serif";
    ctx.textAlign = "center";
    wrapText(ctx, slide.text, w / 2, h - 120, w - 180, 24);

    ctx.font = "13px sans-serif";
    ctx.fillStyle = "#ccc";
    ctx.fillText(
      `Click or press Enter to continue (${this.index + 1}/${SLIDES.length}) — Esc to skip`,
      w / 2,
      h - 30
    );
    ctx.textAlign = "left";
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let lineY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, lineY);
}
