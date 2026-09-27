// Tiny keyboard input tracker.
const keys = new Set();
const pressedOnce = new Set();

window.addEventListener("keydown", (e) => {
  if (!keys.has(e.code)) pressedOnce.add(e.code);
  keys.add(e.code);
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
});

export function isDown(code) {
  return keys.has(code);
}

// Returns true once per physical key press, then clears the flag.
export function wasPressed(code) {
  if (pressedOnce.has(code)) {
    pressedOnce.delete(code);
    return true;
  }
  return false;
}

export function clearPresses() {
  pressedOnce.clear();
}
