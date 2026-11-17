// DUSKPORT HUD: cash, mission tracker, wanted stars, health, weapon, speed, and a
// circular minimap rendered on a canvas (city blocks, roads, beach, markers).
import { WORLD } from './city.js';

const $ = (id) => document.getElementById(id);

export class Hud {
  constructor() {
    this.mm = $('minimap').getContext('2d');
    this.bannerTimer = null;
    this.toastTimer = null;
  }
  setCash(v) { $('cash-value').textContent = v; }
  setHealth(v) {
    $('health-fill').style.width = Math.max(0, Math.min(100, v)) + '%';
    $('health-fill').style.background = v > 50
      ? 'linear-gradient(90deg,#37e08b,#a8ff6a)'
      : v > 25 ? 'linear-gradient(90deg,#e0a837,#ffd166)' : 'linear-gradient(90deg,#e03737,#ff6a6a)';
    $('health-num').textContent = Math.round(v);
  }
  setWeapon(name, icon, ammo) {
    $('weapon-name').textContent = name;
    $('weapon-icon').textContent = icon;
    $('ammo').textContent = ammo !== null && ammo !== undefined ? ammo + ' RDS' : '';
  }
  setStars(n) {
    const el = $('stars');
    el.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const s = document.createElement('span');
      s.textContent = '★';
      s.className = i < n ? 'star-on' : 'star-off';
      el.appendChild(s);
    }
  }
  setHeat(label) { $('heat-label').textContent = label || ''; }
  setMission(title, text) {
    $('mission-title').textContent = title;
    $('mission-text').textContent = text;
  }
  banner(title, sub) {
    const b = $('banner');
    b.innerHTML = title + (sub ? '<small>' + sub + '</small>' : '');
    b.classList.remove('hidden');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => b.classList.add('hidden'), 3400);
  }
  toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
  }
  prompt(text) {
    const p = $('prompt');
    if (text) { p.textContent = text; p.classList.remove('hidden'); }
    else p.classList.add('hidden');
  }
  showCrosshair(show) { $('crosshair').classList.toggle('hidden', !show); }
  setSpeed(kmh, show) {
    $('speedo').classList.toggle('hidden', !show);
    if (show) $('speed-num').textContent = Math.round(Math.abs(kmh));
  }
  hitFlash() {
    const f = $('health-fill');
    f.style.filter = 'brightness(1.8)';
    setTimeout(() => { f.style.filter = ''; }, 120);
  }
  // Circular minimap: player-centred, ~95 world units across, north up.
  drawMinimap(state) {
    const g = this.mm, S = 360, C = S / 2;
    g.clearRect(0, 0, S, S);
    g.save();
    g.beginPath(); g.arc(C, C, C - 2, 0, Math.PI * 2); g.clip();
    // Background: city dark.
    g.fillStyle = '#12152a'; g.fillRect(0, 0, S, S);
    const scale = S / 190; // 190 world units across the disc
    const toX = (x) => C + (x - state.player.x) * scale;
    const toZ = (z) => C + (z - state.player.z) * scale;
    // Sea + beach (south).
    g.fillStyle = '#0e3a5c';
    g.fillRect(0, toZ(112), S, S);
    g.fillStyle = '#c9a86a';
    g.fillRect(0, toZ(96), S, toZ(112) - toZ(96));
    // Roads.
    g.strokeStyle = '#3d4258'; g.lineWidth = 7;
    for (const r of [-88, -66, -44, -22, 0, 22, 44, 66, 88]) {
      g.beginPath(); g.moveTo(toX(r), 0); g.lineTo(toX(r), S); g.stroke();
      g.beginPath(); g.moveTo(0, toZ(r)); g.lineTo(S, toZ(r)); g.stroke();
    }
    // Buildings.
    g.fillStyle = '#4a5068';
    for (const b of state.buildings) {
      g.fillRect(toX(b.x - b.w / 2), toZ(b.z - b.d / 2), b.w * scale, b.d * scale);
    }
    // Mission target (gold diamond, pulsing).
    if (state.target) {
      const pulse = 7 + Math.sin(performance.now() * 0.006) * 2;
      g.fillStyle = '#ffd166';
      g.beginPath();
      g.moveTo(toX(state.target.x), toZ(state.target.z) - pulse);
      g.lineTo(toX(state.target.x) + pulse, toZ(state.target.z));
      g.lineTo(toX(state.target.x), toZ(state.target.z) + pulse);
      g.lineTo(toX(state.target.x) - pulse, toZ(state.target.z));
      g.closePath(); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
    }
    // Traffic (white), police (red/blue), enemies (red), ally (green).
    const dot = (x, z, color, r) => {
      g.fillStyle = color;
      g.beginPath(); g.arc(toX(x), toZ(z), r, 0, Math.PI * 2); g.fill();
    };
    for (const c of state.traffic || []) dot(c.pos.x, c.pos.z, '#dfe4ff', 3);
    for (const e of state.enemies || []) dot(e.pos.x, e.pos.z, '#ff4040', 4);
    if (state.ally) dot(state.ally.pos.x, state.ally.pos.z, '#37e08b', 4);
    for (const p of state.police || []) dot(p.pos.x, p.pos.z, '#ff2020', 4.5);
    // Player arrow (centre, rotated by heading).
    g.save();
    g.translate(C, C);
    g.rotate(state.heading);
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#000'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 9); g.lineTo(0, 4); g.lineTo(-8, 9); g.closePath();
    g.fill(); g.stroke();
    g.restore();
    // North marker.
    g.fillStyle = '#fff'; g.font = 'bold 15px Arial'; g.textAlign = 'center';
    g.fillText('N', C, 18);
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 3;
    g.beginPath(); g.arc(C, C, C - 2, 0, Math.PI * 2); g.stroke();
  }
}
