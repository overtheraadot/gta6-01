// DUSKPORT — Neon Getaway: HUD, minimap and menus.
// Everything the player reads while playing: health, armour, cash, ammo,
// the five-star wanted display, the minimap, the mission banner, toasts and
// speed — plus the start screen, pause, busted/wasted and the win screen.
// All of it is drawn on the same canvas as the game, so a screenshot shows
// exactly what the player sees.

'use strict';

const Hud = {
  menuButtons: [], // {x,y,w,h,action} rebuilt every menu draw for click tests

  bar(ctx, x, y, w, h, frac, color, bg) {
    ctx.fillStyle = bg || 'rgba(0,0,0,0.55)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * clamp(frac, 0, 1), h);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  },

  drawPlaying(ctx, t) {
    const stars = Wanted.stars();
    // Top-left: cash, health, armour, ammo.
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(10,8,20,0.62)';
    ctx.fillRect(14, 12, 252, 108);
    ctx.strokeStyle = '#ff2e88'; ctx.lineWidth = 2; ctx.strokeRect(14, 12, 252, 108);
    ctx.fillStyle = '#39ff88'; ctx.font = 'bold 26px Arial';
    ctx.fillText('$' + Player.cash.toLocaleString('en-US'), 26, 44);
    ctx.fillStyle = '#e8e6f0'; ctx.font = 'bold 12px Arial';
    ctx.fillText('HEALTH', 26, 66);
    this.bar(ctx, 96, 56, 150, 12, Player.health / 100, Player.health > 30 ? '#39ff88' : '#ff2e4d');
    ctx.fillText('ARMOUR', 26, 88);
    this.bar(ctx, 96, 78, 150, 12, Player.armor / 100, '#00e5ff');
    if (Player.onFoot) {
      ctx.fillStyle = '#ffe14d'; ctx.font = 'bold 13px Arial';
      ctx.fillText('PISTOL  ' + Player.ammo + ' / ' + Player.magSize + (Player.reloadTimer > 0 ? '  — reloading…' : ''), 26, 110);
    } else {
      ctx.fillStyle = '#ffe14d'; ctx.font = 'bold 13px Arial';
      const hp = Player.car && Player.car.hp !== undefined ? Player.car.hp : 100;
      ctx.fillText('CAR', 26, 110);
      this.bar(ctx, 96, 100, 150, 10, hp / 100, hp > 30 ? '#ff9d00' : '#ff2e4d');
    }
    // Top-centre: wanted stars.
    const sx = 640 - (5 * 34) / 2;
    for (let i = 0; i < 5; i++) {
      const lit = i < stars;
      const flash = stars >= 5 && Math.floor(t * 6) % 2 === 0;
      ctx.font = '30px Arial'; ctx.textAlign = 'center';
      ctx.fillStyle = lit ? (flash ? '#ff2e4d' : '#ffe14d') : 'rgba(255,255,255,0.22)';
      ctx.shadowColor = lit ? '#ffe14d' : 'transparent'; ctx.shadowBlur = lit ? 12 : 0;
      ctx.fillText('★', sx + i * 34 + 17, 46);
    }
    ctx.shadowBlur = 0;
    // Top-right: minimap.
    this.drawMinimap(ctx, 1036, 12, 230, 168);
    // Bottom-centre: mission banner.
    const obj = Missions.objective();
    ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center';
    const w = ctx.measureText(obj).width + 36;
    ctx.fillStyle = 'rgba(10,8,20,0.66)';
    ctx.fillRect(640 - w / 2, 742, w, 34);
    ctx.strokeStyle = '#ffea00'; ctx.lineWidth = 1.5; ctx.strokeRect(640 - w / 2, 742, w, 34);
    ctx.fillStyle = '#ffea00';
    ctx.fillText(obj, 640, 765);
    // Bottom-left: controls.
    ctx.textAlign = 'left'; ctx.font = '12px Arial'; ctx.fillStyle = 'rgba(232,230,240,0.75)';
    ctx.fillText(Player.car ? 'WASD drive · E exit car · Shift handbrake · P pause · M mute' : 'WASD move · Shift sprint · E steal car · Click shoot · F punch · R reload · P pause', 16, 786);
    // Bottom-right: speed.
    if (Player.car) {
      ctx.textAlign = 'right'; ctx.font = 'bold 30px Arial'; ctx.fillStyle = '#fff';
      ctx.fillText(Math.round(Math.abs(Player.car.speed) * 0.18) + ' mph', 1264, 786);
    }
    // Toasts under the stars.
    ctx.textAlign = 'center'; ctx.font = 'bold 14px Arial';
    Toasts.list.forEach((toast, i) => {
      const a = clamp(1 - toast.t / toast.ms, 0, 1) * clamp(toast.t / 200, 0, 1);
      ctx.globalAlpha = a;
      const tw = ctx.measureText(toast.text).width + 28;
      ctx.fillStyle = 'rgba(10,8,20,0.75)';
      ctx.fillRect(640 - tw / 2, 58 + i * 30, tw, 24);
      ctx.fillStyle = '#fff';
      ctx.fillText(toast.text, 640, 75 + i * 30);
      ctx.globalAlpha = 1;
    });
    // Hurt vignette.
    if (Player.hurtFlash > 0) {
      ctx.fillStyle = 'rgba(255, 46, 77, ' + (Player.hurtFlash * 0.55) + ')';
      ctx.fillRect(0, 0, 1280, 800);
    }
    if (Player.health <= 30 && Player.health > 0) {
      const pulse = 0.05 + 0.05 * Math.sin(t * 5);
      ctx.fillStyle = 'rgba(255, 46, 77, ' + pulse + ')';
      ctx.fillRect(0, 0, 1280, 800);
    }
  },

  drawMinimap(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(10,8,20,0.78)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#ff2e88'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
    const sx = w / WORLD_W, sy = h / WORLD_H;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    // Roads.
    ctx.strokeStyle = '#5a5478'; ctx.lineWidth = 2;
    for (const rx of ROADS_X) { ctx.beginPath(); ctx.moveTo(x + rx * sx, y); ctx.lineTo(x + rx * sx, y + h); ctx.stroke(); }
    for (const ry of ROADS_Y) { ctx.beginPath(); ctx.moveTo(x, y + ry * sy); ctx.lineTo(x + w, y + ry * sy); ctx.stroke(); }
    // Docks water.
    ctx.fillStyle = '#1b3a52'; ctx.fillRect(x, y + 2140 * sy, w, h - 2140 * sy);
    // Caches.
    ctx.fillStyle = '#39ff88';
    for (let i = 0; i < CACHE_SPOTS.length; i++) {
      if (Missions.cachesTaken[i]) continue;
      ctx.fillRect(x + CACHE_SPOTS[i].x * sx - 2, y + CACHE_SPOTS[i].y * sy - 2, 4, 4);
    }
    // Mission marker.
    const m = Missions.marker();
    if (m) {
      const pulse = 4 + 2 * Math.sin(Game.time * 6);
      ctx.fillStyle = '#ffea00';
      ctx.beginPath(); ctx.arc(x + m.x * sx, y + m.y * sy, pulse, 0, Math.PI * 2); ctx.fill();
    }
    // Police.
    ctx.fillStyle = '#ff2e4d';
    for (const c of Police.cruisers) ctx.fillRect(x + c.x * sx - 2, y + c.y * sy - 2, 5, 5);
    for (const c of Police.cops) ctx.fillRect(x + c.x * sx - 2, y + c.y * sy - 2, 4, 4);
    // Player arrow.
    const p = Player.pos();
    ctx.save();
    ctx.translate(x + p.x * sx, y + p.y * sy);
    ctx.rotate(Player.car ? Player.car.angle : Player.angle);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();
    ctx.fillStyle = '#e8e6f0'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'left';
    ctx.fillText('DUSKPORT', x + 6, y + h - 6);
  },

  button(ctx, x, y, w, h, label, action) {
    ctx.fillStyle = 'rgba(255, 46, 136, 0.9)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#ffd9ec'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2 + 7);
    this.menuButtons.push({ x, y, w, h, action });
  },

  drawMenu(ctx, hasSave) {
    this.menuButtons = [];
    // Dusk backdrop with the city skyline silhouette.
    const g = ctx.createLinearGradient(0, 0, 0, 800);
    g.addColorStop(0, '#1b1035'); g.addColorStop(0.55, '#3d1c54'); g.addColorStop(1, '#7a2d5e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 800);
    ctx.fillStyle = '#171224';
    for (let k = 0; k < 22; k++) {
      const bw = 40 + ((k * 37) % 50), bh = 120 + ((k * 89) % 260), bx = k * 60 - 10;
      ctx.fillRect(bx, 800 - bh, bw, bh);
      ctx.fillStyle = 'rgba(255, 209, 102, 0.7)';
      for (let wy = 0; wy < 5; wy++) for (let wx = 0; wx < 3; wx++) {
        if ((k + wx + wy) % 3 === 0) ctx.fillRect(bx + 8 + wx * 14, 800 - bh + 14 + wy * 22, 7, 9);
      }
      ctx.fillStyle = '#171224';
    }
    ctx.fillStyle = '#ff2e88';
    ctx.font = 'bold 34px Arial'; ctx.textAlign = 'center';
    ctx.shadowColor = '#ff2e88'; ctx.shadowBlur = 24;
    ctx.fillText('— A NEON GETAWAY —', 640, 150);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 120px Arial';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 34;
    ctx.fillText('DUSKPORT', 640, 270);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 26px Arial'; ctx.fillStyle = '#ffe14d';
    ctx.fillText('VEX MARLOWE · THE MERIDIAN CREW · ONE LAST JOB', 640, 316);
    ctx.font = '16px Arial'; ctx.fillStyle = '#e8e6f0';
    ctx.fillText('Steal cars. Outrun the DPD. Pull the Vault job. Own the city at dusk.', 640, 352);
    ctx.fillText('An open-world crime game — on foot and by car, with traffic, pedestrians,', 640, 380);
    ctx.fillText('a five-star wanted system, missions, combat and a living neon city.', 640, 404);
    this.button(ctx, 490, 440, 300, 52, 'NEW GAME', 'new');
    if (hasSave) this.button(ctx, 490, 504, 300, 52, 'CONTINUE', 'continue');
    this.button(ctx, 490, hasSave ? 568 : 504, 300, 52, 'HOW TO PLAY', 'howto');
    ctx.font = '13px Arial'; ctx.fillStyle = 'rgba(232,230,240,0.8)';
    ctx.fillText('WASD move / drive · E steal & exit car · Mouse aim, click to shoot · F punch · R reload', 640, hasSave ? 648 : 584);
    ctx.fillText('Shift sprint / handbrake · P pause · M mute · Progress saves automatically', 640, hasSave ? 670 : 606);
    ctx.fillText('An original game for make.fun — no part of it comes from any commercial game.', 640, 760);
  },

  drawHowTo(ctx) {
    this.menuButtons = [];
    ctx.fillStyle = 'rgba(10,8,20,0.92)'; ctx.fillRect(0, 0, 1280, 800);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 44px Arial'; ctx.textAlign = 'center';
    ctx.fillText('HOW TO PLAY', 640, 110);
    const lines = [
      ['ON FOOT', 'WASD or arrows to move, Shift to sprint. Walk up to any car and press E to steal it.'],
      ['DRIVING', 'WASD to drive, Shift is the handbrake. Ram police cars to shake them — but watch your car health.'],
      ['COMBAT', 'Aim with the mouse, click to shoot the pistol. R reloads. F throws a punch up close.'],
      ['WANTED', 'Crimes raise heat — 5 stars brings the whole DPD. Hide out of sight and the heat bleeds off.'],
      ['MISSIONS', 'Follow the yellow marker. Six story missions, from your first stolen car to the Vault job.'],
      ['CASH', 'Mission payouts, plus 8 hidden neon caches ($500 each) around the city. Cash is your score.'],
      ['SAVE', 'Progress saves automatically. CONTINUE on the title screen picks up where you left off.'],
    ];
    ctx.textAlign = 'left';
    let y = 180;
    for (const [head, body] of lines) {
      ctx.fillStyle = '#ff2e88'; ctx.font = 'bold 19px Arial';
      ctx.fillText(head, 220, y);
      ctx.fillStyle = '#e8e6f0'; ctx.font = '16px Arial';
      ctx.fillText(body, 220, y + 26);
      y += 72;
    }
    this.button(ctx, 490, 680, 300, 52, 'BACK', 'menu');
  },

  drawPaused(ctx) {
    this.menuButtons = [];
    ctx.fillStyle = 'rgba(10,8,20,0.72)'; ctx.fillRect(0, 0, 1280, 800);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 54px Arial'; ctx.textAlign = 'center';
    ctx.fillText('PAUSED', 640, 300);
    ctx.font = '18px Arial'; ctx.fillStyle = '#e8e6f0';
    ctx.fillText('Cash $' + Player.cash.toLocaleString('en-US') + ' · Mission: ' + (Missions.done ? 'complete' : MISSION_DEFS[Missions.index].name), 640, 340);
    this.button(ctx, 490, 390, 300, 52, 'RESUME', 'resume');
    this.button(ctx, 490, 454, 300, 52, 'QUIT TO TITLE', 'menu');
  },

  drawGameOver(ctx, kind) {
    this.menuButtons = [];
    ctx.fillStyle = 'rgba(10,8,20,0.78)'; ctx.fillRect(0, 0, 1280, 800);
    ctx.fillStyle = kind === 'busted' ? '#2e7bff' : '#ff2e4d';
    ctx.font = 'bold 72px Arial'; ctx.textAlign = 'center';
    ctx.fillText(kind === 'busted' ? 'BUSTED!' : 'WASTED', 640, 320);
    ctx.fillStyle = '#e8e6f0'; ctx.font = '18px Arial';
    ctx.fillText(kind === 'busted'
      ? 'The DPD caught Vex. Bail costs 10% of your cash — the crew still needs you.'
      : 'Vex went down in the streets of Duskport. The crew pulls her back for one more run.', 640, 364);
    ctx.fillText('Cash $' + Player.cash.toLocaleString('en-US') + ' · Mission: ' + (Missions.done ? 'complete' : MISSION_DEFS[Missions.index].name), 640, 396);
    this.button(ctx, 490, 440, 300, 52, 'BACK ON THE STREET', 'respawn');
    this.button(ctx, 490, 504, 300, 52, 'QUIT TO TITLE', 'menu');
  },

  drawWin(ctx) {
    this.menuButtons = [];
    const g = ctx.createLinearGradient(0, 0, 0, 800);
    g.addColorStop(0, '#1b1035'); g.addColorStop(0.6, '#3d1c54'); g.addColorStop(1, '#7a2d5e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 800);
    ctx.fillStyle = '#ffe14d'; ctx.font = 'bold 84px Arial'; ctx.textAlign = 'center';
    ctx.shadowColor = '#ffe14d'; ctx.shadowBlur = 30;
    ctx.fillText('KING OF DUSKPORT', 640, 300);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.font = '22px Arial';
    ctx.fillText('Vex Marlowe beat the five-star chase and vanished into the neon.', 640, 356);
    ctx.fillText('Final cash: $' + Player.cash.toLocaleString('en-US') + ' · Caches ' + Object.keys(Missions.cachesTaken).length + '/8', 640, 392);
    ctx.font = '16px Arial'; ctx.fillStyle = '#e8e6f0';
    ctx.fillText('The city is yours. Keep playing in free roam — or start a new run.', 640, 428);
    this.button(ctx, 490, 470, 300, 52, 'FREE ROAM', 'freeroam');
    this.button(ctx, 490, 534, 300, 52, 'NEW GAME', 'new');
  },
};
