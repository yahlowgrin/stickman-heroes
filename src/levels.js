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
    coins: [],
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
    coins: [
      { x: 250, value: 5 },
      { x: 900, value: 5 },
      { x: 1500, value: 10 },
      { x: 2350, value: 5 },
      { x: 2650, value: 10 },
      { x: 3200, value: 15 },
      { x: 3900, value: 10 },
      { x: 4550, value: 15 },
      { x: 5050, value: 20 },
    ],
    goalOffset: 100,
  },
  {
    name: "Shadow Keep",
    width: 5000,
    background: "dusk",
    groundSegments: [
      { x1: 0, x2: 850 },
      { x1: 920, x2: 1650 },
      { x1: 1720, x2: 2450 },
      { x1: 2520, x2: 3250 },
      { x1: 3320, x2: 4050 },
      { x1: 4120, x2: 5000 },
    ],
    encounters: [
      { x: 450, kind: "pack5", range: 70, speed: 55 },
      { x: 1200, kind: "elite", range: 80, speed: 55 },
      { x: 1950, kind: "wraiths", range: 90, speed: 65 },
      { x: 2350, kind: "skySquad", range: 100, speed: 45, flying: true, spikeDamage: 5, spikeRange: 380, spikeCooldown: 2.2 },
      { x: 2700, kind: "duoOgre", range: 60, speed: 30 },
      { x: 3450, kind: "nightmare", range: 90, speed: 60 },
      { x: 3900, kind: "skySquad", range: 100, speed: 50, flying: true, spikeDamage: 6, spikeRange: 400, spikeCooldown: 2 },
      { x: 4200, kind: "elite", range: 70, speed: 55 },
      { x: 4850, kind: "shadowlord", range: 40, speed: 25 },
    ],
    coins: [],
    goalOffset: 100,
  },
];

export function instantiateLevel(index) {
  const def = LEVELS[index];
  return {
    ...def,
    encounters: def.encounters.map((e) => ({
      ...e,
      defeated: false,
      currentX: e.x,
      dir: 1,
      spikeTimer: e.flying ? (e.spikeCooldown ?? 2.5) * (0.5 + Math.random() * 0.5) : 0,
    })),
    coins: def.coins.map((c) => ({ ...c, collected: false })),
    goalX: def.width - def.goalOffset,
  };
}

export function isOverGround(level, x) {
  return level.groundSegments.some((s) => x >= s.x1 && x <= s.x2);
}
