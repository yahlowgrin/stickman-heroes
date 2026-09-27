// Level layout: ground segments (gaps between them are pits) and encounter markers.
export const LEVEL_WIDTH = 4200;
export const GROUND_Y = 440;

export const groundSegments = [
  { x1: 0, x2: 900 },
  { x1: 960, x2: 1700 },
  { x1: 1780, x2: 2600 },
  { x1: 2680, x2: 3400 },
  { x1: 3460, x2: LEVEL_WIDTH },
];

export const encounters = [
  { x: 500, kind: "pack1", defeated: false },
  { x: 1300, kind: "pack2", defeated: false },
  { x: 2100, kind: "pack3", defeated: false },
  { x: 2950, kind: "ogre", defeated: false },
  { x: 3900, kind: "boss", defeated: false },
];

export const goalX = LEVEL_WIDTH - 100;

export function isOverGround(x) {
  return groundSegments.some((s) => x >= s.x1 && x <= s.x2);
}

export function groundAt(x) {
  return isOverGround(x) ? GROUND_Y : null;
}
