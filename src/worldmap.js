import { drawStickman } from "./draw.js";
import { wasPressed } from "./input.js";

// A small hub screen shown after clearing certain levels: spend coins in the
// shop, or press on toward the next level.
export class WorldMap {
  constructor(canvas, { clearedName, nextName, getCoins }, onChoice) {
    this.canvas = canvas;
    this.clearedName = clearedName;
    this.nextName = nextName;
    this.getCoins = getCoins;
    this.onChoice = onChoice;
    this.t = 0;
    this._rects = [];

    this.options = [{ label: "Enter the Shop", action: "shop" }];
    if (nextName) {
      this.options.push({ label: `Continue to ${nextName}`, action: "continue" });
    }

    this._clickHandler = (e) => this.handleClick(e);
    canvas.addEventListener("click", this._clickHandler);
  }

  destroy() {
    this.canvas.removeEventListener("click", this._clickHandler);
  }

  choose(option) {
    this.destroy();
    this.onChoice(option.action);
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
    const idx = ["Digit1", "Digit2", "Digit3"].findIndex((code) => wasPressed(code));
    if (idx >= 0 && this.options[idx]) this.choose(this.options[idx]);
  }

  render(ctx) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#1c2b4a");
    grad.addColorStop(1, "#3d5a80");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Two little path markers to suggest a fork in the road.
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(w / 2, 420);
    ctx.lineTo(w / 2 - 220, 260);
    ctx.moveTo(w / 2, 420);
    ctx.lineTo(w / 2 + 220, 260);
    ctx.stroke();

    drawStickman(ctx, { x: w / 2, y: 420, scale: 1.6, color: "#222", facing: 1, pose: "idle", t: this.t });

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "24px sans-serif";
    ctx.fillText(`${this.clearedName} cleared!`, w / 2, 60);
    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#ffe066";
    ctx.fillText(`Coins: ${this.getCoins()}`, w / 2, 88);

    ctx.fillStyle = "#fff";
    ctx.font = "16px sans-serif";
    ctx.fillText("Which way do you want to go?", w / 2, 130);

    this._rects = [];
    this.options.forEach((opt, i) => {
      const bw = 300;
      const x = w / 2 - bw / 2;
      const y = 460 + i * 40;
      const rect = { x, y, w: bw, h: 32, option: opt };
      this._rects.push(rect);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = "#fff";
      ctx.font = "15px sans-serif";
      ctx.fillText(`${i + 1}. ${opt.label}`, w / 2, rect.y + 21);
    });

    ctx.textAlign = "left";
  }
}
