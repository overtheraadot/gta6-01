// DUSKPORT — Neon Getaway: missions and story.
// Vex Marlowe, the best getaway driver in Duskport, owes the Meridian crew
// one last job. Six missions take her from her first stolen car to the Vault
// job and the final five-star run to the Hideout — plus eight neon cash
// caches hidden around the city for players who explore.

'use strict';

const CACHE_SPOTS = [
  { x: 480, y: 480 }, { x: 2720, y: 480 }, { x: 480, y: 2080 }, { x: 1440, y: 800 },
  { x: 3040, y: 1440 }, { x: 800, y: 1120 }, { x: 2400, y: 1760 }, { x: 1760, y: 2080 },
];

const MISSION_DEFS = [
  {
    name: 'First Wheels', brief: 'The crew needs wheels. Steal any car on the street — walk up and press E.',
    reward: 300,
  },
  {
    name: 'Neon Run', brief: 'A buyer waits on Neon Row. Drive there before the 60-second window closes.',
    reward: 600,
  },
  {
    name: 'Midnight Pickup', brief: 'Three packages wait at the Docks. Collect them all — on foot or by car.',
    reward: 900,
  },
  {
    name: 'Heat Rising', brief: 'The crew wants the DPD scared. Raise 3 stars, survive the chase, then vanish.',
    reward: 1200,
  },
  {
    name: 'The Vault Job', brief: 'Meridian Vault. Get inside the marker, grab the cash, then lose yourself at the garage.',
    reward: 2500,
  },
  {
    name: 'Duskport King', brief: 'Five stars. The whole DPD is coming. Reach the Hideout and the city is yours.',
    reward: 5000,
  },
];

const Missions = {
  index: 0, stage: 0, timer: 0, stageTimer: 0, holdTimer: 0,
  packages: [], cachesTaken: {}, done: false, won: false,
  packageSpots: [
    { x: 2200, y: 2120 }, { x: 2480, y: 2120 }, { x: 2760, y: 2120 },
  ],

  reset() {
    this.index = 0; this.stage = 0; this.timer = 0; this.stageTimer = 0; this.holdTimer = 0;
    this.packages = []; this.cachesTaken = {}; this.done = false; this.won = false;
    this.startMission(0);
  },

  startMission(i) {
    this.index = i; this.stage = 0; this.timer = 0; this.stageTimer = 0; this.holdTimer = 0;
    const def = MISSION_DEFS[i];
    if (!def) { this.done = true; return; }
    if (i === 1) this.timer = 60;
    if (i === 2) this.packages = this.packageSpots.map(p => ({ x: p.x, y: p.y, taken: false }));
    if (i === 3) this.stageTimer = 45;
    if (i === 5) Wanted.addHeat(100);
    Toasts.push('Mission: ' + def.name + ' — ' + def.brief, 5200);
    AudioSys.cash();
  },

  objective() {
    if (this.done) return 'Duskport is yours. Free roam — caches, chaos, whatever you like.';
    const def = MISSION_DEFS[this.index];
    switch (this.index) {
      case 0: return 'MISSION: First Wheels — steal a car (walk up, press E)';
      case 1: return 'MISSION: Neon Run — reach Neon Row in ' + Math.ceil(this.timer) + 's';
      case 2: {
        const left = this.packages.filter(p => !p.taken).length;
        return 'MISSION: Midnight Pickup — collect the packages (' + (3 - left) + '/3)';
      }
      case 3:
        if (this.stage === 0) return 'MISSION: Heat Rising — raise your wanted level to 3 stars';
        if (this.stage === 1) return 'MISSION: Heat Rising — survive the chase (' + Math.ceil(this.stageTimer) + 's left)';
        return 'MISSION: Heat Rising — lose the cops (wanted back to 0)';
      case 4:
        if (this.stage === 0) return 'MISSION: The Vault Job — get to the Meridian Vault';
        if (this.stage === 1) return 'MISSION: The Vault Job — hold the vault marker to grab the cash';
        return 'MISSION: The Vault Job — escape to the garage!';
      case 5: return 'MISSION: Duskport King — reach the Hideout with 5 stars on you';
      default: return def.brief;
    }
  },

  marker() {
    if (this.done) return null;
    switch (this.index) {
      case 0: return null;
      case 1: return Landmarks.neonRow;
      case 2: {
        const p = this.packages.find(pk => !pk.taken);
        return p ? { x: p.x, y: p.y } : null;
      }
      case 3: return null;
      case 4:
        if (this.stage === 0 || this.stage === 1) return Landmarks.vault;
        return Landmarks.garage;
      case 5: return Landmarks.hideout;
      default: return null;
    }
  },

  completeMission() {
    const def = MISSION_DEFS[this.index];
    Player.cash += def.reward;
    AudioSys.cash();
    Toasts.push('Mission complete: ' + def.name + ' — +$' + def.reward, 4200);
    if (this.index >= MISSION_DEFS.length - 1) {
      this.done = true; this.won = true;
      Game.state = 'won';
      return;
    }
    this.startMission(this.index + 1);
  },

  restartCurrent() { this.startMission(this.index); },

  update(dt) {
    if (this.done || Game.state !== 'playing') return;
    const p = Player.pos();
    // Neon caches: free money for explorers.
    for (let i = 0; i < CACHE_SPOTS.length; i++) {
      if (this.cachesTaken[i]) continue;
      const c = CACHE_SPOTS[i];
      if (dist(p.x, p.y, c.x, c.y) < 48) {
        this.cachesTaken[i] = true;
        Player.cash += 500;
        AudioSys.pickup();
        Toasts.push('Neon cache found! +$500 (' + Object.keys(this.cachesTaken).length + '/8)');
      }
    }
    switch (this.index) {
      case 0:
        if (Player.car) this.completeMission();
        break;
      case 1: {
        this.timer -= dt;
        if (dist(p.x, p.y, Landmarks.neonRow.x, Landmarks.neonRow.y) < 90) this.completeMission();
        else if (this.timer <= 0) {
          Toasts.push('Too slow — the buyer left. Try the run again.');
          this.startMission(1);
        }
        break;
      }
      case 2: {
        for (const pk of this.packages) {
          if (!pk.taken && dist(p.x, p.y, pk.x, pk.y) < 54) {
            pk.taken = true; AudioSys.pickup();
            Toasts.push('Package secured (' + this.packages.filter(q => q.taken).length + '/3)');
          }
        }
        if (this.packages.every(pk => pk.taken)) this.completeMission();
        break;
      }
      case 3: {
        if (this.stage === 0 && Wanted.stars() >= 3) { this.stage = 1; Toasts.push('3 stars! Now survive the chase.'); }
        else if (this.stage === 1) {
          if (Wanted.stars() >= 3) {
            this.stageTimer -= dt;
            if (this.stageTimer <= 0) { this.stage = 2; Toasts.push('You outlasted them. Now vanish — wanted back to 0.'); }
          }
        } else if (this.stage === 2 && Wanted.stars() === 0) this.completeMission();
        break;
      }
      case 4: {
        if (this.stage === 0 && dist(p.x, p.y, Landmarks.vault.x, Landmarks.vault.y) < 150) {
          this.stage = 1; this.holdTimer = 0;
          Toasts.push('Inside! Hold the marker to crack the vault.');
        } else if (this.stage === 1) {
          if (dist(p.x, p.y, Landmarks.vault.x, Landmarks.vault.y) < 150) {
            this.holdTimer += dt;
            if (this.holdTimer >= 3) {
              this.stage = 2;
              Wanted.addHeat(50);
              Toasts.push('Cash grabbed! The alarms are screaming — get to the garage!');
            }
          } else this.holdTimer = Math.max(0, this.holdTimer - dt);
        } else if (this.stage === 2 && dist(p.x, p.y, Landmarks.garage.x, Landmarks.garage.y) < 150) {
          this.completeMission();
        }
        break;
      }
      case 5: {
        if (dist(p.x, p.y, Landmarks.hideout.x, Landmarks.hideout.y) < 90) this.completeMission();
        break;
      }
    }
  },

  draw(ctx, cam, t) {
    // Mission marker beacon.
    const m = this.marker();
    if (m) {
      const mx = m.x - cam.x, my = m.y - cam.y;
      const pulse = 1 + 0.18 * Math.sin(t * 5);
      ctx.save();
      ctx.translate(mx, my);
      ctx.scale(pulse, pulse);
      ctx.strokeStyle = '#ffea00'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ffea00';
      ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(10, -12); ctx.lineTo(-10, -12); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#ffea00';
      ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
      const d = Math.round(dist(Player.pos().x, Player.pos().y, m.x, m.y));
      ctx.fillText(m.name ? m.name + ' — ' + d + 'm' : d + 'm', mx, my - 44);
    }
    // Packages.
    if (this.index === 2) {
      for (const pk of this.packages) {
        if (pk.taken || !cam.visible(pk.x - 30, pk.y - 30, 60, 60)) continue;
        const px = pk.x - cam.x, py = pk.y - cam.y;
        ctx.save(); ctx.translate(px, py);
        ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 14;
        ctx.fillStyle = '#00e5ff'; ctx.fillRect(-12, -9, 24, 18);
        ctx.fillStyle = '#062a33'; ctx.fillRect(-12, -2, 24, 4);
        ctx.restore();
      }
    }
    // Vault hold progress ring.
    if (this.index === 4 && this.stage === 1) {
      const p = Player.pos();
      ctx.strokeStyle = '#ffea00'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(p.x - cam.x, p.y - cam.y - 34, 18, -Math.PI / 2, -Math.PI / 2 + (this.holdTimer / 3) * Math.PI * 2); ctx.stroke();
    }
    // Neon caches.
    for (let i = 0; i < CACHE_SPOTS.length; i++) {
      if (this.cachesTaken[i]) continue;
      const c = CACHE_SPOTS[i];
      if (!cam.visible(c.x - 30, c.y - 30, 60, 60)) continue;
      const px = c.x - cam.x, py = c.y - cam.y;
      const glow = 0.6 + 0.4 * Math.sin(t * 4 + i);
      ctx.save();
      ctx.globalAlpha = glow;
      ctx.shadowColor = '#39ff88'; ctx.shadowBlur = 16;
      ctx.fillStyle = '#39ff88';
      ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center';
      ctx.fillText('$', px, py + 6);
      ctx.restore();
    }
  },
};
