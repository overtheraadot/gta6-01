// DUSKPORT — Neon Getaway: the city of Duskport.
// A dusk-lit grid city the player explores on foot and by car: neon-signed
// avenues, a dockside strip to the south, a plaza, parks, the Meridian Vault
// and Vex's garage. The layout is generated once from a fixed seed, so the
// map a screenshot shows is the map the player drives.

'use strict';

const WORLD_W = 3200;
const WORLD_H = 2400;
const ROAD_W = 64;
const ROADS_X = [160, 480, 800, 1120, 1440, 1760, 2080, 2400, 2720, 3040];
const ROADS_Y = [160, 480, 800, 1120, 1440, 1760, 2080];

const DUSK = {
  skyTop: '#1b1035', skyMid: '#3d1c54', skyLow: '#7a2d5e',
  asphalt: '#23202e', asphaltLine: '#3a3550', sidewalk: '#2e2a3d',
  curb: '#453f5e', buildingEdge: '#171224',
};

// Landmark spots, fixed so missions and screenshots can find them.
const Landmarks = {
  garage: { x: 640, y: 1600, name: "Vex's Garage" },
  vault: { x: 2240, y: 960, name: 'Meridian Vault' },
  neonRow: { x: 1440, y: 480, name: 'Neon Row' },
  plaza: { x: 1120, y: 1120, name: 'Halcyon Plaza' },
  docks: { x: 2400, y: 2120, name: 'Duskport Docks' },
  hideout: { x: 2760, y: 2120, name: 'The Hideout' },
  diner: { x: 800, y: 1760, name: 'Pink Flamingo Diner' },
};

const City = {
  buildings: [],
  signs: [],
  parks: [],
  lamps: [],
  containers: [],
  built: false,

  build() {
    if (this.built) return;
    this.built = true;
    reseed(20261117);
    const palette = ['#2c2140', '#33264a', '#241c38', '#3a2a52', '#2a2038', '#40284e'];
    const neon = ['#ff2e88', '#00e5ff', '#ffea00', '#ff6b35', '#b967ff', '#39ff88'];
    const signWords = ['NEON', 'HOTEL', 'BAR', 'RAMEN', 'CLUB', 'MOTEL', 'PIZZA', '24H', 'CASINO', 'TATTOO', 'DUSK', 'LIQUOR', 'ARCADE', 'NOODLES'];

    for (let i = 0; i < ROADS_X.length - 1; i++) {
      for (let j = 0; j < ROADS_Y.length - 1; j++) {
        const bx0 = ROADS_X[i] + ROAD_W / 2 + 10;
        const by0 = ROADS_Y[j] + ROAD_W / 2 + 10;
        const bx1 = ROADS_X[i + 1] - ROAD_W / 2 - 10;
        const by1 = ROADS_Y[j + 1] - ROAD_W / 2 - 10;
        const cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2;
        // A few blocks are parks, not buildings.
        if ((i === 3 && j === 3) || (i === 6 && j === 1) || (i === 1 && j === 5)) {
          this.parks.push({ x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0 });
          continue;
        }
        // The vault and the garage get their own big buildings, one block each.
        if (i === 6 && j === 2) {
          this.buildings.push({ x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0, color: '#4a3a22', landmark: 'vault', lit: [], sign: { text: 'MERIDIAN VAULT', color: '#ffea00' } });
          continue;
        }
        if (i === 1 && j === 4) {
          this.buildings.push({ x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0, color: '#27333f', landmark: 'garage', lit: [], sign: { text: "VEX'S GARAGE", color: '#00e5ff' } });
          continue;
        }
        const n = randInt(1, 3);
        if (n === 1) {
          this.buildings.push(this.makeBuilding(bx0, by0, bx1 - bx0, by1 - by0, palette, neon, signWords));
        } else {
          const vertical = (bx1 - bx0) > (by1 - by0);
          for (let k = 0; k < n; k++) {
            if (vertical) {
              const w = (bx1 - bx0) / n;
              this.buildings.push(this.makeBuilding(bx0 + k * w + 4, by0 + 4, w - 8, by1 - by0 - 8, palette, neon, signWords));
            } else {
              const h = (by1 - by0) / n;
              this.buildings.push(this.makeBuilding(bx0 + 4, by0 + k * h + 4, bx1 - bx0 - 8, h - 8, palette, neon, signWords));
            }
          }
        }
      }
    }
    // Neon signs along Neon Row avenue.
    for (let k = 0; k < 8; k++) {
      this.signs.push({ x: 1180 + k * 90, y: 448, text: choice(signWords), color: choice(neon) });
    }
    // Dockside: water strip, piers and stacked containers south of the last road.
    for (let k = 0; k < 14; k++) {
      this.containers.push({ x: 240 + k * 210 + rand(-20, 20), y: 2210 + rand(-30, 30), w: rand(90, 140), h: 46, color: choice(['#7a2d3a', '#2d5a7a', '#5a7a2d', '#7a5a2d']) });
    }
    // Street lamps at every intersection corner.
    for (const rx of ROADS_X) for (const ry of ROADS_Y) this.lamps.push({ x: rx + ROAD_W / 2 + 6, y: ry + ROAD_W / 2 + 6 });
  },

  makeBuilding(x, y, w, h, palette, neon, words) {
    const b = { x, y, w, h, color: choice(palette), lit: [] };
    const cols = Math.max(2, Math.floor(w / 34)), rows = Math.max(2, Math.floor(h / 34));
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      if (chance(0.45)) b.lit.push({ c, r, color: chance(0.7) ? '#ffd166' : '#9be7ff' });
    }
    if (chance(0.35)) b.sign = { text: choice(words), color: choice(neon) };
    return b;
  },

  isRoad(x, y) {
    for (const rx of ROADS_X) if (Math.abs(x - rx) < ROAD_W / 2) return true;
    for (const ry of ROADS_Y) if (Math.abs(y - ry) < ROAD_W / 2) return true;
    return false;
  },

  // Push a circle (player, car, pedestrian) out of any building it overlaps.
  collideCircle(o, r) {
    for (const b of this.buildings) {
      const nx = clamp(o.x, b.x, b.x + b.w), ny = clamp(o.y, b.y, b.y + b.h);
      const dx = o.x - nx, dy = o.y - ny, d2 = dx * dx + dy * dy;
      if (d2 < r * r && d2 > 0.01) {
        const d = Math.sqrt(d2);
        o.x = nx + (dx / d) * r; o.y = ny + (dy / d) * r;
        return b;
      } else if (d2 <= 0.01) {
        o.y = b.y - r; return b;
      }
    }
    return null;
  },

  // Nearest point on any road centreline, for spawning traffic.
  nearestRoad(x, y) {
    let best = null, bd = 1e9;
    for (const rx of ROADS_X) { const d = Math.abs(x - rx); if (d < bd) { bd = d; best = { x: rx, y, vertical: true }; } }
    for (const ry of ROADS_Y) { const d = Math.abs(y - ry); if (d < bd) { bd = d; best = { x, y: ry, vertical: false }; } }
    return best;
  },

  // Traffic-light phase at an intersection: north-south green, then east-west.
  lightGreenVertical(t, ix, iy) {
    const phase = Math.floor(t / 4 + ix * 0.7 + iy * 1.3) % 2;
    return phase === 0;
  },

  draw(ctx, cam, t) {
    // Dusk sky gradient behind everything.
    const g = ctx.createLinearGradient(0, 0, 0, 800);
    g.addColorStop(0, DUSK.skyTop); g.addColorStop(0.55, DUSK.skyMid); g.addColorStop(1, DUSK.skyLow);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 800);
    // Ground base.
    ctx.fillStyle = '#241f31';
    ctx.fillRect(-cam.x, -cam.y, WORLD_W, WORLD_H);
    // Dockside water at the south edge.
    ctx.fillStyle = '#12283a';
    ctx.fillRect(-cam.x, 2140 - cam.y, WORLD_W, WORLD_H - 2140);
    ctx.fillStyle = '#1b3a52';
    for (let k = 0; k < 24; k++) {
      const wx = 120 + k * 130, wy = 2180 + (k % 3) * 40;
      ctx.fillRect(wx - cam.x, wy - cam.y, 60 + (k % 4) * 12, 3);
    }
    // Parks.
    for (const p of this.parks) {
      if (!cam.visible(p.x, p.y, p.w, p.h)) continue;
      ctx.fillStyle = '#1d3320'; ctx.fillRect(p.x - cam.x, p.y - cam.y, p.w, p.h);
      ctx.fillStyle = '#2c4a2a';
      for (let k = 0; k < 6; k++) {
        const tx = p.x + 30 + ((k * 53) % (p.w - 50)), ty = p.y + 26 + ((k * 71) % (p.h - 50));
        ctx.beginPath(); ctx.arc(tx - cam.x, ty - cam.y, 16, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Roads.
    ctx.fillStyle = DUSK.asphalt;
    for (const rx of ROADS_X) ctx.fillRect(rx - ROAD_W / 2 - cam.x, -cam.y, ROAD_W, WORLD_H);
    for (const ry of ROADS_Y) ctx.fillRect(-cam.x, ry - ROAD_W / 2 - cam.y, WORLD_W, ROAD_W);
    // Sidewalks.
    ctx.fillStyle = DUSK.sidewalk;
    for (const rx of ROADS_X) { ctx.fillRect(rx - ROAD_W / 2 - 10 - cam.x, -cam.y, 10, WORLD_H); ctx.fillRect(rx + ROAD_W / 2 - cam.x, -cam.y, 10, WORLD_H); }
    for (const ry of ROADS_Y) { ctx.fillRect(-cam.x, ry - ROAD_W / 2 - 10 - cam.y, WORLD_W, 10); ctx.fillRect(-cam.x, ry + ROAD_W / 2 - cam.y, WORLD_W, 10); }
    // Lane dashes.
    ctx.fillStyle = DUSK.asphaltLine;
    for (const rx of ROADS_X) for (let y = 0; y < WORLD_H; y += 64) ctx.fillRect(rx - 2 - cam.x, y - cam.y, 4, 30);
    for (const ry of ROADS_Y) for (let x = 0; x < WORLD_W; x += 64) ctx.fillRect(x - cam.x, ry - 2 - cam.y, 30, 4);
    // Containers at the docks.
    for (const c of this.containers) {
      if (!cam.visible(c.x, c.y, c.w, c.h)) continue;
      ctx.fillStyle = c.color; ctx.fillRect(c.x - cam.x, c.y - cam.y, c.w, c.h);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      for (let k = 1; k < 5; k++) ctx.fillRect(c.x + (c.w / 5) * k - cam.x, c.y - cam.y, 2, c.h);
    }
    // Buildings with lit windows and neon signs.
    for (const b of this.buildings) {
      if (!cam.visible(b.x, b.y, b.w, b.h)) continue;
      ctx.fillStyle = b.color; ctx.fillRect(b.x - cam.x, b.y - cam.y, b.w, b.h);
      ctx.strokeStyle = DUSK.buildingEdge; ctx.lineWidth = 3;
      ctx.strokeRect(b.x - cam.x, b.y - cam.y, b.w, b.h);
      ctx.fillStyle = '#0e0a18';
      ctx.fillRect(b.x + 6 - cam.x, b.y + 6 - cam.y, b.w - 12, 10);
      const cols = Math.max(2, Math.floor(b.w / 34)), rows = Math.max(2, Math.floor(b.h / 34));
      for (const w of b.lit) {
        ctx.fillStyle = w.color;
        ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(t * 0.7 + w.c * 1.7 + w.r));
        ctx.fillRect(b.x + 10 + w.c * 34 - cam.x, b.y + 26 + w.r * 34 - cam.y, 16, 12);
      }
      ctx.globalAlpha = 1;
      if (b.sign) this.drawNeon(ctx, b.sign.text, b.x + b.w / 2 - cam.x, b.y + b.h / 2 - cam.y, b.sign.color, Math.min(30, b.w / (b.sign.text.length * 0.75)));
    }
    // Street signs along Neon Row.
    for (const s of this.signs) this.drawNeon(ctx, s.text, s.x - cam.x, s.y - cam.y, s.color, 20);
    // Street lamps glow.
    for (const l of this.lamps) {
      if (!cam.visible(l.x - 20, l.y - 20, 40, 40)) continue;
      const lg = ctx.createRadialGradient(l.x - cam.x, l.y - cam.y, 2, l.x - cam.x, l.y - cam.y, 46);
      lg.addColorStop(0, 'rgba(255, 209, 102, 0.30)'); lg.addColorStop(1, 'rgba(255, 209, 102, 0)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(l.x - cam.x, l.y - cam.y, 46, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd166'; ctx.fillRect(l.x - 2 - cam.x, l.y - 2 - cam.y, 4, 4);
    }
  },

  drawNeon(ctx, text, x, y, color, size) {
    ctx.save();
    ctx.font = 'bold ' + size + 'px Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = color; ctx.shadowBlur = 16;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.85;
    ctx.fillText(text, x, y);
    ctx.restore();
  },
};
