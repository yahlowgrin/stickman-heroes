// Level layouts: ground segments (gaps between them are pits) and encounter markers.
// Encounters patrol back and forth (+-range at speed px/s) and start a battle
// the moment they touch the player, so the further you explore the more
// dangerous the enemies you'll cross paths with.
export const GROUND_Y = 440;

export const LEVELS = [
  {
    name: "The Wilds",
    width: 4800,
    background: "afternoon",
    groundSegments: [
      { x1: 0, x2: 900 },
      { x1: 960, x2: 1700 },
      { x1: 1780, x2: 2600 },
      { x1: 2680, x2: 3400 },
      { x1: 3460, x2: 4200 },
      { x1: 4260, x2: 4800 },
    ],
    encounters: [
      { x: 500, kind: "pack1", range: 60, speed: 35 },
      { x: 1300, kind: "pack2", range: 70, speed: 40 },
      { x: 2100, kind: "pack3", range: 80, speed: 45 },
      { x: 2950, kind: "pack4", range: 90, speed: 55 },
      { x: 3700, kind: "ogre", range: 50, speed: 25 },
      { x: 4500, kind: "boss", range: 40, speed: 20 },
    ],
    goalOffset: 100,
  },
  {
    name: "Sunfield Pass",
    width: 5200,
    background: "sunny",
    groundSegments: [
      { x1: 0, x2: 800 },
      { x1: 880, x2: 1600 },
      { x1: 1660, x2: 2500 },
      { x1: 2560, x2: 3300 },
      { x1: 3380, x2: 4000 },
      { x1: 4060, x2: 4700 },
      { x1: 4760, x2: 5200 },
    ],
    encounters: [
      { x: 450, kind: "pack2", range: 60, speed: 40 },
      { x: 1200, kind: "pack3", range: 70, speed: 45 },
      { x: 2000, kind: "pack4", range: 80, speed: 55 },
      { x: 2800, kind: "pack5", range: 90, speed: 60 },
      { x: 3600, kind: "elite", range: 70, speed: 50 },
      { x: 4400, kind: "ogre", range: 50, speed: 30 },
      { x: 5000, kind: "sunboss", range: 40, speed: 20 },
    ],
    goalOffset: 100,
  },
];

export function instantiateLevel(index) {
  const def = LEVELS[index];
  return {
    ...def,
    encounters: def.encounters.map((e) => ({ ...e, defeated: false, currentX: e.x, dir: 1 })),
    goalX: def.width - def.goalOffset,
  };
}

export function isOverGround(level, x) {
  return level.groundSegments.some((s) => x >= s.x1 && x <= s.x2);
}
