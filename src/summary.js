// Read-only squad overlay: stats, EXP, and current moves for each hero.
function describeSkill(skill) {
  if (skill.heal) return `heals ${skill.heal}`;
  if (skill.healAll) return `heals squad ${skill.healAll}`;
  if (skill.hitAll) return "hits all enemies";
  if (skill.hitCount) return `hits ${skill.hitCount} enemies`;
  return `power x${skill.power}`;
}

export function renderSquadSummary(ctx, canvas, squad) {
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = "rgba(8, 8, 20, 0.92)";
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "24px sans-serif";
  ctx.fillText("Squad Summary", w / 2, 40);
  ctx.font = "13px sans-serif";
  ctx.fillStyle = "#ccc";
  ctx.fillText("Press S or Esc to close", w / 2, 62);
  ctx.textAlign = "left";

  const colW = w / squad.length;
  squad.forEach((hero, i) => {
    const x = colW * i + 30;
    let y = 100;

    ctx.fillStyle = hero.color;
    ctx.font = "bold 19px sans-serif";
    ctx.fillText(hero.name, x, y);
    y += 24;

    ctx.fillStyle = "#fff";
    ctx.font = "13px sans-serif";
    ctx.fillText(`Level ${hero.level}`, x, y);
    y += 18;
    ctx.fillText(`EXP: ${hero.exp}/${hero.expToNext}`, x, y);
    y += 22;

    ctx.fillText(`HP: ${hero.hp}/${hero.maxHp}`, x, y);
    y += 18;
    ctx.fillText(`MP: ${hero.mp}/${hero.maxMp}`, x, y);
    y += 22;

    ctx.fillText(`ATK ${hero.atk}   DEF ${hero.def}   SPD ${hero.spd}`, x, y);
    y += 28;

    ctx.fillStyle = "#ffe066";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("Moves", x, y);
    y += 18;

    ctx.fillStyle = "#fff";
    ctx.font = "12px sans-serif";
    for (const skill of hero.skills) {
      ctx.fillText(`- ${skill.name} (${describeSkill(skill)}, ${skill.mpCost} MP)`, x, y);
      y += 16;
    }

    const nextUnlock = hero.movePool.find((u) => !hero.skills.some((s) => s.name === u.skill.name));
    if (nextUnlock) {
      y += 6;
      ctx.fillStyle = "#aaa";
      ctx.fillText(`Next move at Lv${nextUnlock.level}: ${nextUnlock.skill.name}`, x, y);
    }
  });
}
