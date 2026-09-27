import { wasPressed } from "./input.js";
import { MAX_SKILLS } from "./entities.js";

const SHOP_ITEMS = [
  { id: "tonic", name: "Health Tonic", cost: 15, needsTarget: false, desc: "Fully heal & restore MP for the whole squad" },
  { id: "vitality", name: "Vitality Charm", cost: 25, needsTarget: true, desc: "+6 Max HP for one hero (and a full heal)" },
  { id: "mana", name: "Mana Charm", cost: 20, needsTarget: true, desc: "+4 Max MP for one hero (and a full refill)" },
  { id: "manual", name: "Skill Manual", cost: 40, needsTarget: true, desc: "Teach one hero their next move early" },
];

const KEYS = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5"];

function targetLabel(item, hero) {
  if (item.id === "vitality") return `${hero.name} (HP ${hero.hp}/${hero.maxHp})`;
  if (item.id === "mana") return `${hero.name} (MP ${hero.mp}/${hero.maxMp})`;
  if (item.id === "manual") {
    const unlock = hero.getNextUnlearnedSkill();
    return unlock ? `${hero.name} — learn ${unlock.skill.name}` : `${hero.name} (all moves known)`;
  }
  return hero.name;
}

// wallet = { getCoins(), spendCoins(amount) }
export class Shop {
  constructor(canvas, squad, wallet, onDone) {
    this.canvas = canvas;
    this.squad = squad;
    this.wallet = wallet;
    this.onDone = onDone;
    this.t = 0;
    this.message = null;
    this.messageTimer = 0;
    this.selectedItem = null;
    this.selectedHero = null;
    this._rects = [];

    this._clickHandler = (e) => this.handleClick(e);
    canvas.addEventListener("click", this._clickHandler);
    this.buildMenu();
  }

  destroy() {
    this.canvas.removeEventListener("click", this._clickHandler);
  }

  flashMessage(text) {
    this.message = text;
    this.messageTimer = 2.5;
  }

  buildMenu() {
    this.stage = "menu";
    this.options = SHOP_ITEMS.map((item) => ({ label: `${item.name} — ${item.cost}g`, item }));
    this.options.push({ label: "Leave Shop", action: "leave" });
  }

  buildTargetOptions() {
    this.stage = "target";
    this.options = this.squad.map((hero) => ({ label: targetLabel(this.selectedItem, hero), hero }));
    this.options.push({ label: "Cancel", action: "cancel" });
  }

  buildReplaceOptions(hero, skill) {
    this.stage = "replace";
    this.pendingSkill = skill;
    this.options = hero.skills.map((s, i) => ({ label: `Replace ${s.name}`, action: "replace", index: i }));
    this.options.push({ label: "Don't learn it (no charge)", action: "cancel" });
  }

  choose(option) {
    if (option.action === "leave") {
      this.destroy();
      this.onDone();
      return;
    }
    if (option.action === "cancel") {
      this.buildMenu();
      return;
    }
    if (option.action === "replace") {
      this.selectedHero.learnSkill(this.pendingSkill, option.index);
      this.finalizePurchase();
      return;
    }
    if (option.hero) {
      this.selectedHero = option.hero;
      this.applyItem();
      return;
    }
    if (option.item) {
      if (this.wallet.getCoins() < option.item.cost) {
        this.flashMessage("Not enough coins!");
        return;
      }
      this.selectedItem = option.item;
      if (option.item.needsTarget) {
        this.buildTargetOptions();
      } else {
        this.selectedHero = null;
        this.applyItem();
      }
    }
  }

  applyItem() {
    const item = this.selectedItem;
    const hero = this.selectedHero;

    if (item.id === "tonic") {
      for (const h of this.squad) {
        h.hp = h.maxHp;
        h.mp = h.maxMp;
      }
      this.finalizePurchase();
    } else if (item.id === "vitality") {
      hero.maxHp += 6;
      hero.hp = hero.maxHp;
      this.finalizePurchase();
    } else if (item.id === "mana") {
      hero.maxMp += 4;
      hero.mp = hero.maxMp;
      this.finalizePurchase();
    } else if (item.id === "manual") {
      const unlock = hero.getNextUnlearnedSkill();
      if (!unlock) {
        this.flashMessage(`${hero.name} already knows all their available moves.`);
        this.buildMenu();
        return;
      }
      if (hero.skills.length < MAX_SKILLS) {
        hero.learnSkill(unlock.skill);
        this.finalizePurchase();
      } else {
        this.buildReplaceOptions(hero, unlock.skill);
      }
    }
  }

  finalizePurchase() {
    this.wallet.spendCoins(this.selectedItem.cost);
    this.flashMessage(`Purchased ${this.selectedItem.name}!`);
    this.buildMenu();
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
    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) this.message = null;
    }
    const idx = KEYS.findIndex((code) => wasPressed(code));
    if (idx >= 0 && this.options[idx]) this.choose(this.options[idx]);
    if (wasPressed("Escape") && this.stage === "menu") {
      this.destroy();
      this.onDone();
    }
  }

  render(ctx) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#2a1a3d");
    grad.addColorStop(1, "#4a2f5c");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "24px sans-serif";
    ctx.fillText("Traveling Shop", w / 2, 44);
    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#ffe066";
    ctx.fillText(`Coins: ${this.wallet.getCoins()}`, w / 2, 68);

    ctx.fillStyle = "#fff";
    ctx.font = "13px sans-serif";
    if (this.stage === "menu") {
      let dy = 100;
      for (const item of SHOP_ITEMS) {
        ctx.fillText(item.desc, w / 2, dy);
        dy += 18;
      }
    }

    this._rects = [];
    const startY = this.stage === "menu" ? 200 : 140;
    this.options.forEach((opt, i) => {
      const bw = 380;
      const x = w / 2 - bw / 2;
      const y = startY + i * 34;
      const rect = { x, y, w: bw, h: 28, option: opt };
      this._rects.push(rect);
      const disabled = opt.item && this.wallet.getCoins() < opt.item.cost;
      ctx.fillStyle = disabled ? "#333" : "rgba(0,0,0,0.5)";
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = disabled ? "#666" : "#fff";
      ctx.lineWidth = 1;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = disabled ? "#888" : "#fff";
      ctx.font = "14px sans-serif";
      ctx.fillText(`${i + 1}. ${opt.label}`, w / 2, rect.y + 19);
    });

    if (this.message) {
      const my = startY + this.options.length * 34 + 20;
      ctx.fillStyle = "#ffe066";
      ctx.font = "14px sans-serif";
      ctx.fillText(this.message, w / 2, my);
    }

    ctx.textAlign = "left";
  }
}
