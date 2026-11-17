// DUSKPORT — Neon Getaway: shared utilities.
// Small math helpers, a seeded random generator (so the city and every
// staged screenshot scene build the same way every run) and the input state
// every other module reads. No network, no assets, no dependencies.

'use strict';

// Seeded RNG (mulberry32). The city, traffic and pedestrians all draw from
// this one stream, so a fixed seed rebuilds the same Duskport every time.
let _seed = 20261117;
function reseed(n) { _seed = (n >>> 0) || 1; }
function rnd() {
  _seed |= 0; _seed = (_seed + 0x6D2B79F5) | 0;
  let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rand(a, b) { return a + rnd() * (b - a); }
function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
function choice(arr) { return arr[Math.floor(rnd() * arr.length)]; }
function chance(p) { return rnd() < p; }

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist(x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); }
function angleTo(x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); }
function angleDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
function angleLerp(a, b, t) { return a + angleDiff(a, b) * clamp(t, 0, 1); }

// Keyboard + mouse state. boot.js wires the DOM listeners; every module
// reads from here during update/draw, never from the DOM directly.
const Input = {
  keys: {},
  mouse: { x: 640, y: 400, down: false, clicked: false },
  pressed: {}, // edge-triggered keys, cleared at the end of each frame
  isDown(code) { return !!this.keys[code]; },
  wasPressed(code) { return !!this.pressed[code]; },
};

// A tiny on-screen toast queue lives in hud.js; this is the shared push.
const Toasts = {
  list: [],
  push(text, ms) { this.list.push({ text, t: 0, ms: ms || 3200 }); if (this.list.length > 4) this.list.shift(); },
  update(dt) { for (const t of this.list) t.t += dt * 1000; this.list = this.list.filter(t => t.t < t.ms); },
};
