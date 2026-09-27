// Hero and Enemy data models shared by the overworld and battle screens.

export class Unit {
  constructor({ name, maxHp, maxMp = 0, atk, def, spd, color, skills = [] }) {
    this.name = name;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.maxMp = maxMp;
    this.mp = maxMp;
    this.atk = atk;
    this.def = def;
    this.spd = spd;
    this.color = color;
    this.skills = skills;
    this.defending = false;
  }

  get alive() {
    return this.hp > 0;
  }

  takeDamage(amount) {
    const reduced = this.defending ? Math.floor(amount / 2) : amount;
    const dmg = Math.max(1, reduced - Math.floor(this.def / 2));
    this.hp = Math.max(0, this.hp - dmg);
    return dmg;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }
}

export class Hero extends Unit {
  constructor(opts) {
    super(opts);
    this.level = 1;
    this.exp = 0;
    this.expToNext = 20;
  }

  gainExp(amount) {
    this.exp += amount;
    let leveledUp = false;
    while (this.exp >= this.expToNext) {
      this.exp -= this.expToNext;
      this.levelUp();
      leveledUp = true;
    }
    return leveledUp;
  }

  levelUp() {
    this.level += 1;
    this.maxHp += 8;
    this.maxMp += 2;
    this.atk += 2;
    this.def += 1;
    this.spd += 1;
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    this.expToNext = Math.floor(this.expToNext * 1.4);
  }
}

export class Enemy extends Unit {
  constructor(opts) {
    super(opts);
    this.expReward = opts.expReward ?? 8;
  }
}

export function createStartingSquad() {
  return [
    new Hero({
      name: "Rook",
      maxHp: 40,
      maxMp: 6,
      atk: 9,
      def: 5,
      spd: 6,
      color: "#e94560",
      skills: [{ name: "Power Slash", mpCost: 3, power: 1.8 }],
    }),
    new Hero({
      name: "Sable",
      maxHp: 28,
      maxMp: 12,
      atk: 11,
      def: 2,
      spd: 9,
      color: "#4ecca3",
      skills: [{ name: "Piercing Shot", mpCost: 4, power: 2.0 }],
    }),
    new Hero({
      name: "Wisp",
      maxHp: 24,
      maxMp: 16,
      atk: 6,
      def: 2,
      spd: 7,
      color: "#7f5af0",
      skills: [
        { name: "Fire Bolt", mpCost: 5, power: 2.2 },
        { name: "Mend", mpCost: 6, heal: 16 },
      ],
    }),
  ];
}

export function createEnemyGroup(kind) {
  const templates = {
    goblin: () => new Enemy({ name: "Goblin", maxHp: 18, atk: 6, def: 1, spd: 5, color: "#4d7c2a", expReward: 6 }),
    bandit: () => new Enemy({ name: "Bandit", maxHp: 26, atk: 8, def: 2, spd: 6, color: "#8d6e63", expReward: 9 }),
    ogre: () => new Enemy({ name: "Ogre", maxHp: 55, atk: 12, def: 4, spd: 3, color: "#5c3d2e", expReward: 20 }),
    boss: () => new Enemy({ name: "Warlord", maxHp: 90, atk: 14, def: 6, spd: 5, color: "#3a0ca3", expReward: 60 }),
  };
  const groups = {
    pack1: ["goblin", "goblin"],
    pack2: ["goblin", "bandit"],
    pack3: ["bandit", "bandit", "goblin"],
    ogre: ["ogre"],
    boss: ["boss"],
  };
  return groups[kind].map((t) => templates[t]());
}
