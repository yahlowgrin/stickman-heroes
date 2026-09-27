// Shared stick-figure drawing helpers, used by both the overworld and battle screens.

export function drawStickman(ctx, { x, y, scale = 1, color = "#222", facing = 1, pose = "idle", t = 0 }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * facing, scale);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";

  const bob = pose === "walk" ? Math.sin(t * 10) * 3 : pose === "hurt" ? -2 : 0;
  const headY = -34 + bob;

  // Head
  ctx.beginPath();
  ctx.arc(0, headY, 7, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.beginPath();
  ctx.moveTo(0, headY + 7);
  ctx.lineTo(0, headY + 26);
  ctx.stroke();

  const legSwing = pose === "walk" ? Math.sin(t * 10) * 12 : pose === "attack" ? 4 : 0;
  ctx.beginPath();
  ctx.moveTo(0, headY + 26);
  ctx.lineTo(-8 + legSwing, headY + 44);
  ctx.moveTo(0, headY + 26);
  ctx.lineTo(8 - legSwing, headY + 44);
  ctx.stroke();

  if (pose === "attack") {
    ctx.beginPath();
    ctx.moveTo(0, headY + 12);
    ctx.lineTo(16, headY + 8);
    ctx.moveTo(0, headY + 12);
    ctx.lineTo(-8, headY + 20);
    ctx.stroke();
  } else if (pose === "defend") {
    ctx.beginPath();
    ctx.moveTo(0, headY + 12);
    ctx.lineTo(6, headY + 6);
    ctx.moveTo(0, headY + 12);
    ctx.lineTo(-6, headY + 6);
    ctx.stroke();
  } else {
    const armSwing = pose === "walk" ? Math.sin(t * 10 + Math.PI) * 8 : 0;
    ctx.beginPath();
    ctx.moveTo(0, headY + 12);
    ctx.lineTo(10 + armSwing, headY + 22);
    ctx.moveTo(0, headY + 12);
    ctx.lineTo(-10 - armSwing, headY + 22);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawHpBar(ctx, x, y, w, h, ratio, color = "#2ecc71") {
  ctx.fillStyle = "#222";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = ratio > 0.3 ? color : "#e74c3c";
  ctx.fillRect(x, y, Math.max(0, w * ratio), h);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}
