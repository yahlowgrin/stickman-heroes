# Stickman Heroes

A browser game combining a side-scrolling brawler overworld with turn-based
squad battles. Guide a squad of three stickman heroes across a level,
fighting enemy encounters in classic RPG-style turns, leveling up along the
way, and defeating the boss at the end.

No build step or dependencies — pure HTML5 Canvas and vanilla JavaScript
(ES modules).

## Running the game

Serve the folder with any static file server and open it in a browser
(ES modules require `http://`, not `file://`):

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/`.

## Controls

**Overworld**
- `Left` / `A`, `Right` / `D` — move
- `Space` / `Up` / `W` — jump (watch out for pits!)
- Touching an enemy marker starts a battle

**Battle**
- Click a menu option, or press `1`-`4` to choose an action/target
- `Attack` — basic physical hit
- Hero skills cost MP and can deal bonus damage or heal
- `Defend` — halves incoming damage next hit
- `Enter` — continue after victory or defeat

## Structure

- `index.html` — page shell and canvas
- `src/main.js` — game state machine (overworld ↔ battle ↔ end screens)
- `src/overworld.js` — side-scrolling movement, camera, pits, encounters
- `src/battle.js` — turn-based combat: turn order, actions, AI, EXP/leveling
- `src/entities.js` — hero/enemy stats and squad/enemy-group definitions
- `src/levels.js` — level layout: ground segments and encounter placement
- `src/draw.js` — shared stick-figure and HP bar rendering
- `src/input.js` — keyboard input helper
