import { wasPressed } from "./input.js";

// A persistent hub: level nodes and a shop node connected by roads. Levels
// unlock in order as the previous one is cleared; cleared levels can be
// replayed. Reachable anytime via the World Map button/key, not just once.
const NODES = [
  { id: "level0", type: "level", levelIndex: 0, x: 150, y: 260, label: "The Wilds" },
  { id: "shop", type: "shop", x: 320, y: 400, label: "Shop" },
  { id: "level1", type: "level", levelIndex: 1, x: 490, y: 260, label: "Sunfield Pass" },
  { id: "level2", type: "level", levelIndex: 2, x: 800, y: 260, label: "Shadow Keep" },
];

const ROADS = [
  ["level0", "shop"],
  ["level0", "level1"],
  ["level1", "level2"],
];

export class WorldMap {
  // state = { levelCleared: boolean[], getCoins(), justCleared: string|null }
  constructor(canvas, state, onChoice) {
    this.canvas = canvas;
    this.state = state;
    this.onChoice = onChoice;
    this.t = 0;
    this._rects = [];

    this._clickHandler = (e) => this.handleClick(e);
    canvas.addEventListener("click", this._clickHandler);
  }

  destroy() {
    this.canvas.removeEventListener("click", this._clickHandler);
  }

  isUnlocked(node) {
    if (node.type === "shop") return true;
    if (node.levelIndex === 0) return true;
    return this.state.levelCleared[node.levelIndex - 1];
  }

  choose(node) {
    if (!this.isUnlocked(node)) return;
    this.destroy();
    if (node.type === "shop") this.onChoice({ action: "shop" });
    else this.onChoice({ action: "level", levelIndex: node.levelIndex });
  }

  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    for (const item of this._rects) {
      const dx = mx - item.x;
      const dy = my - item.y;
      if (Math.sqrt(dx * dx + dy * dy) < item.r) {
        this.choose(item.node);
        return;
      }
    }
  }

  update(dt) {
    this.t += dt;
    const keys = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5"];
    const idx = keys.findIndex((code) => wasPressed(code));
    if (idx >= 0 && NODES[idx]) this.choose(NODES[idx]);
    if (wasPressed("Escape") || wasPressed("KeyM")) {
      this.destroy();
      this.onChoice({ action: "close" });
    }
  }

  render(ctx) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#1c2b4a");
    grad.addColorStop(1, "#3d5a80");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "22px sans-serif";
    ctx.fillText("World Map", w / 2, 36);
    ctx.font = "13px sans-serif";
    ctx.fillStyle = "#ffe066";
    ctx.fillText(`Coins: ${this.state.getCoins()}`, w / 2, 58);

    if (this.state.justCleared) {
      ctx.fillStyle = "#7CFC9A";
      ctx.font = "14px sans-serif";
      ctx.fillText(`${this.state.justCleared} cleared!`, w / 2, 80);
    }

    // Roads
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 5;
    for (const [aId, bId] of ROADS) {
      const a = NODES.find((n) => n.id === aId);
      const b = NODES.find((n) => n.id === bId);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    this._rects = [];
    NODES.forEach((node, i) => {
      const unlocked = this.isUnlocked(node);
      const cleared = node.type === "level" && this.state.levelCleared[node.levelIndex];
      const r = 34;
      this._rects.push({ x: node.x, y: node.y, r, node });

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = !unlocked ? "#555" : node.type === "shop" ? "#7c4dff" : cleared ? "#2ecc71" : "#e94560";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      let icon = "▶";
      if (!unlocked) icon = "🔒";
      else if (node.type === "shop") icon = "$";
      else if (cleared) icon = "✓";
      ctx.fillText(icon, node.x, node.y + 6);

      ctx.fillStyle = unlocked ? "#fff" : "#888";
      ctx.font = "13px sans-serif";
      ctx.fillText(`${i + 1}. ${node.label}`, node.x, node.y + r + 18);
    });

    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#ccc";
    ctx.fillText("Click a location, press its number, or Esc/M to close", w / 2, h - 16);
    ctx.textAlign = "left";
  }
}
