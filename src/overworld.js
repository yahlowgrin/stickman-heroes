import { isDown, wasPressed } from "./input.js";
import { drawStickman } from "./draw.js";
import { groundSegments, encounters, goalX, LEVEL_WIDTH, GROUND_Y, isOverGround } from "./levels.js";

const GRAVITY = 1400;
const MOVE_SPEED = 220;
const JUMP_VELOCITY = -520;
const PIT_RESPAWN_Y = -80;

export class Overworld {
  constructor(canvas) {
    this.canvas = canvas;
    this.player = {
      x: 60,
      y: GROUND_Y,
      vy: 0,
      onGround: true,
      facing: 1,
      pose: "idle",
      spawnX: 60,
    };
    this.camera = 0;
    this.t = 0;
    this.message = null;
    this.messageTimer = 0;
  }

  triggerBattleForNearestEncounter() {
    for (const enc of encounters) {
      if (enc.defeated) continue;
      if (Math.abs(enc.x - this.player.x) < 40) {
        return enc;
      }
    }
    return null;
  }

  update(dt, onEncounter) {
    this.t += dt;
    const p = this.player;

    let moving = false;
    if (isDown("ArrowLeft") || isDown("KeyA")) {
      p.x -= MOVE_SPEED * dt;
      p.facing = -1;
      moving = true;
    }
    if (isDown("ArrowRight") || isDown("KeyD")) {
      p.x += MOVE_SPEED * dt;
      p.facing = 1;
      moving = true;
    }
    p.x = Math.max(0, Math.min(LEVEL_WIDTH, p.x));

    if ((wasPressed("Space") || wasPressed("ArrowUp") || wasPressed("KeyW")) && p.onGround) {
      p.vy = JUMP_VELOCITY;
      p.onGround = false;
    }

    p.vy += GRAVITY * dt;
    p.y += p.vy * dt;

    const groundHere = isOverGround(p.x) ? GROUND_Y : null;
    if (groundHere !== null && p.y >= groundHere) {
      p.y = groundHere;
      p.vy = 0;
      p.onGround = true;
    } else {
      p.onGround = false;
    }

    if (p.y > GROUND_Y + 250) {
      // Fell into a pit: respawn at the last safe spot.
      p.x = Math.max(p.spawnX - 80, 40);
      p.y = GROUND_Y;
      p.vy = 0;
      this.flashMessage("You fell! Watch out for pits.");
    }

    if (p.onGround && groundHere !== null) {
      p.spawnX = p.x;
    }

    p.pose = !p.onGround ? "jump" : moving ? "walk" : "idle";

    this.camera = Math.max(0, Math.min(LEVEL_WIDTH - this.canvas.width, p.x - this.canvas.width / 2));

    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) this.message = null;
    }

    const enc = this.triggerBattleForNearestEncounter();
    if (enc) {
      onEncounter(enc);
      return;
    }

    if (p.x >= goalX && encounters.every((e) => e.defeated)) {
      onEncounter({ victory: true });
    } else if (p.x >= goalX) {
      this.flashMessage("Defeat all enemies before reaching the end!");
      p.x = goalX - 20;
    }
  }

  flashMessage(text) {
    this.message = text;
    this.messageTimer = 2.5;
  }

  render(ctx) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#87ceeb");
    grad.addColorStop(1, "#c9f0ff");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(-this.camera, 0);

    // Ground segments
    for (const seg of groundSegments) {
      ctx.fillStyle = "#3d8b40";
      ctx.fillRect(seg.x1, GROUND_Y + 40, seg.x2 - seg.x1, h - GROUND_Y - 40);
      ctx.fillStyle = "#5fb85f";
      ctx.fillRect(seg.x1, GROUND_Y + 40, seg.x2 - seg.x1, 10);
    }

    // Goal flag
    ctx.fillStyle = "#f1c40f";
    ctx.fillRect(goalX, GROUND_Y - 80, 6, 80);
    ctx.beginPath();
    ctx.moveTo(goalX + 6, GROUND_Y - 80);
    ctx.lineTo(goalX + 40, GROUND_Y - 65);
    ctx.lineTo(goalX + 6, GROUND_Y - 50);
    ctx.closePath();
    ctx.fill();

    // Encounter markers
    for (const enc of encounters) {
      if (enc.defeated) continue;
      drawStickman(ctx, { x: enc.x, y: GROUND_Y, scale: 1.1, color: "#c0392b", pose: "idle", t: this.t });
    }

    // Player
    drawStickman(ctx, {
      x: this.player.x,
      y: this.player.y,
      scale: 1.2,
      color: "#222",
      facing: this.player.facing,
      pose: this.player.pose,
      t: this.t,
    });

    ctx.restore();

    if (this.message) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(w / 2 - 220, 20, 440, 36);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(this.message, w / 2, 44);
      ctx.textAlign = "left";
    }
  }
}
