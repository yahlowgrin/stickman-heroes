import { isDown, wasPressed } from "./input.js";
import { drawStickman } from "./draw.js";
import { GROUND_Y, isOverGround } from "./levels.js";
import { sfx } from "./audio.js";

const GRAVITY = 1400;
const MOVE_SPEED = 220;
const JUMP_VELOCITY = -520;
const FLYER_HEIGHT = 130;
const SPIKE_SPEED = 260;
const SPIKE_TRAVEL_Y = 30; // how far above ground the spike flies, roughly torso height
const DODGE_HEIGHT = 60; // jump at least this high above the ground to dodge a spike

export class Overworld {
  constructor(canvas, level) {
    this.canvas = canvas;
    this.level = level;
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
    this.projectiles = [];

    // Fixed star field for the "dusk" background, generated once so it
    // doesn't reshuffle every frame.
    this.stars = [];
    if (level.background === "dusk") {
      let seed = 1337;
      const rand = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
      for (let i = 0; i < 60; i++) {
        this.stars.push({ x: rand() * level.width, y: rand() * 260, r: rand() * 1.5 + 0.5 });
      }
    }
  }

  triggerBattleForNearestEncounter() {
    for (const enc of this.level.encounters) {
      if (enc.defeated) continue;
      if (Math.abs(enc.currentX - this.player.x) < 40) {
        return enc;
      }
    }
    return null;
  }

  updateEncounters(dt) {
    for (const enc of this.level.encounters) {
      if (enc.defeated || !enc.range) continue;
      enc.currentX += enc.dir * enc.speed * dt;
      if (enc.currentX >= enc.x + enc.range) {
        enc.currentX = enc.x + enc.range;
        enc.dir = -1;
      } else if (enc.currentX <= enc.x - enc.range) {
        enc.currentX = enc.x - enc.range;
        enc.dir = 1;
      }
    }
  }

  collectCoins(onCoinCollected) {
    for (const coin of this.level.coins) {
      if (coin.collected) continue;
      if (Math.abs(coin.x - this.player.x) < 30) {
        coin.collected = true;
        sfx.coin();
        onCoinCollected(coin.value);
      }
    }
  }

  // Flying enemies periodically hurl a spike toward the player if they're
  // within range, dealing chip damage before you ever reach them in a
  // battle. Jumping high enough dodges the hit.
  updateFlyers(dt) {
    for (const enc of this.level.encounters) {
      if (enc.defeated || !enc.flying) continue;
      enc.spikeTimer -= dt;
      if (enc.spikeTimer <= 0) {
        enc.spikeTimer = enc.spikeCooldown ?? 2.5;
        const dist = Math.abs(enc.currentX - this.player.x);
        if (dist < (enc.spikeRange ?? 350)) {
          const dir = this.player.x >= enc.currentX ? 1 : -1;
          this.projectiles.push({ x: enc.currentX, dir, damage: enc.spikeDamage ?? 5, traveled: 0 });
        }
      }
    }
  }

  updateProjectiles(dt, onSpikeHit) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      const step = SPIKE_SPEED * dt;
      proj.x += proj.dir * step;
      proj.traveled += step;

      const hitPlayer = Math.abs(proj.x - this.player.x) < 22 && this.player.y > GROUND_Y - DODGE_HEIGHT;
      if (hitPlayer) {
        sfx.spike();
        onSpikeHit(proj.damage);
        this.flashMessage(`A spike hit for ${proj.damage} damage!`);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (proj.traveled > 600) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  update(dt, onEncounter, onCoinCollected, onSpikeHit) {
    this.t += dt;
    const p = this.player;
    const level = this.level;

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
    p.x = Math.max(0, Math.min(level.width, p.x));

    if ((wasPressed("Space") || wasPressed("ArrowUp") || wasPressed("KeyW")) && p.onGround) {
      p.vy = JUMP_VELOCITY;
      p.onGround = false;
      sfx.jump();
    }

    p.vy += GRAVITY * dt;
    p.y += p.vy * dt;

    const groundHere = isOverGround(level, p.x) ? GROUND_Y : null;
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

    this.updateEncounters(dt);
    if (onCoinCollected) this.collectCoins(onCoinCollected);
    if (onSpikeHit) {
      this.updateFlyers(dt);
      this.updateProjectiles(dt, onSpikeHit);
    }

    this.camera = Math.max(0, Math.min(level.width - this.canvas.width, p.x - this.canvas.width / 2));

    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) this.message = null;
    }

    const enc = this.triggerBattleForNearestEncounter();
    if (enc) {
      onEncounter(enc);
      return;
    }

    if (p.x >= level.goalX && level.encounters.every((e) => e.defeated)) {
      onEncounter({ victory: true });
    } else if (p.x >= level.goalX) {
      this.flashMessage("Defeat all enemies before reaching the end!");
      p.x = level.goalX - 20;
    }
  }

  flashMessage(text) {
    this.message = text;
    this.messageTimer = 2.5;
  }

  renderBackground(ctx, w, h) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    if (this.level.background === "sunny") {
      grad.addColorStop(0, "#4fb1e8");
      grad.addColorStop(0.6, "#aee6ff");
      grad.addColorStop(1, "#fff3cf");
    } else if (this.level.background === "dusk") {
      grad.addColorStop(0, "#0d0b2b");
      grad.addColorStop(0.6, "#2c1f4a");
      grad.addColorStop(1, "#5b3a5e");
    } else {
      grad.addColorStop(0, "#87ceeb");
      grad.addColorStop(1, "#c9f0ff");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    if (this.level.background === "sunny") {
      // Sun sits fixed in screen space, unaffected by the camera scroll.
      const sunX = w * 0.78;
      const sunY = 90;
      const rays = 12;
      ctx.save();
      ctx.strokeStyle = "rgba(255, 221, 120, 0.7)";
      ctx.lineWidth = 4;
      for (let i = 0; i < rays; i++) {
        const angle = (i / rays) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(sunX + Math.cos(angle) * 45, sunY + Math.sin(angle) * 45);
        ctx.lineTo(sunX + Math.cos(angle) * 70, sunY + Math.sin(angle) * 70);
        ctx.stroke();
      }
      ctx.fillStyle = "#ffe066";
      ctx.beginPath();
      ctx.arc(sunX, sunY, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (this.level.background === "dusk") {
      // Moon sits fixed in screen space, unaffected by the camera scroll.
      ctx.save();
      ctx.fillStyle = "#f5f3ce";
      ctx.beginPath();
      ctx.arc(w * 0.78, 90, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2c1f4a";
      ctx.beginPath();
      ctx.arc(w * 0.78 + 14, 80, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  renderStars(ctx) {
    ctx.fillStyle = "#fff";
    for (const star of this.stars) {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  render(ctx) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const level = this.level;

    this.renderBackground(ctx, w, h);

    ctx.save();
    ctx.translate(-this.camera, 0);

    if (this.stars.length) this.renderStars(ctx);

    // Coins
    for (const coin of level.coins) {
      if (coin.collected) continue;
      const bob = Math.sin(this.t * 3 + coin.x) * 4;
      ctx.fillStyle = "#ffd700";
      ctx.strokeStyle = "#a67c00";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(coin.x, GROUND_Y - 40 + bob, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#7a5c00";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("$", coin.x, GROUND_Y - 36 + bob);
      ctx.textAlign = "left";
    }

    // Ground segments
    for (const seg of level.groundSegments) {
      ctx.fillStyle = "#3d8b40";
      ctx.fillRect(seg.x1, GROUND_Y, seg.x2 - seg.x1, h - GROUND_Y);
      ctx.fillStyle = "#5fb85f";
      ctx.fillRect(seg.x1, GROUND_Y, seg.x2 - seg.x1, 10);
    }

    // Goal flag
    ctx.fillStyle = "#f1c40f";
    ctx.fillRect(level.goalX, GROUND_Y - 80, 6, 80);
    ctx.beginPath();
    ctx.moveTo(level.goalX + 6, GROUND_Y - 80);
    ctx.lineTo(level.goalX + 40, GROUND_Y - 65);
    ctx.lineTo(level.goalX + 6, GROUND_Y - 50);
    ctx.closePath();
    ctx.fill();

    // Encounter markers, patrolling back and forth
    for (const enc of level.encounters) {
      if (enc.defeated) continue;
      const pose = enc.range ? "walk" : "idle";
      drawStickman(ctx, {
        x: enc.currentX,
        y: enc.flying ? GROUND_Y - FLYER_HEIGHT : GROUND_Y,
        scale: 1.1,
        color: enc.flying ? "#78909c" : "#c0392b",
        facing: enc.dir >= 0 ? 1 : -1,
        pose,
        t: this.t,
      });
    }

    // Spikes thrown by flying enemies
    for (const proj of this.projectiles) {
      const y = GROUND_Y - SPIKE_TRAVEL_Y;
      ctx.save();
      ctx.translate(proj.x, y);
      ctx.rotate((proj.dir * Math.PI) / 2);
      ctx.fillStyle = "#cfd8dc";
      ctx.strokeStyle = "#37474f";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(10, -5);
      ctx.lineTo(10, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
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

    ctx.fillStyle = "#fff";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(level.name, w - 12, 24);
    ctx.textAlign = "left";

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
