// Level layouts: ground segments (gaps between them are pits) and encounter markers.
export const GROUND_Y = 440;

export const LEVELS = [
  {
    name: "The Wilds",
    width: 4200,
    background: "afternoon",
    groundSegments: [
      { x1: 0, x2: 900 },
      { x1: 960, x2: 1700 },
      { x1: 1780, x2: 2600 },
      { x1: 2680, x2: 3400 },
      { x1: 3460, x2: 4200 },
    ],
    encounters: [
      { x: 500, kind: "pack1" },
      { x: 1300, kind: "pack2" },
      { x: 2100, kind: "pack3" },
      { x: 2950, kind: "ogre" },
      { x: 3900, kind: "boss" },
    ],
    goalOffset: 100,
  },
  {
    name: "Sunfield Pass",
    width: 4600,
    background: "sunny",
    groundSegments: [
      { x1: 0, x2: 800 },
      { x1: 880, x2: 1600 },
      { x1: 1660, x2: 2500 },
      { x1: 2560, x2: 3300 },
      { x1: 3380, x2: 4000 },
      { x1: 4060, x2: 4600 },
    ],
    encounters: [
      { x: 450, kind: "pack2" },
      { x: 1200, kind: "pack3" },
      { x: 2000, kind: "ogre" },
      { x: 2800, kind: "pack3" },
      { x: 3600, kind: "ogre" },
      { x: 4300, kind: "boss" },
    ],
    goalOffset: 100,
  },
];

export function instantiateLevel(index) {
  const def = LEVELS[index];
  return {
    ...def,
    encounters: def.encounters.map((e) => ({ ...e, defeated: false })),
    goalX: def.width - def.goalOffset,
  };
}

export function isOverGround(level, x) {
  return level.groundSegments.some((s) => x >= s.x1 && x <= s.x2);
}
