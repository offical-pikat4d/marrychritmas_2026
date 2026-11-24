/*!
 * ASCII Christmas Tree 3D
 * Pohon Natal 3D berputar yang digambar 100% dengan karakter ASCII di <canvas>.
 * Vanilla JS, tanpa library, tanpa build step. Cocok untuk Vercel / Cloudflare Pages.
 */
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const $ = (id) => document.getElementById(id);

  /* =====================================================================
   * 1) KONFIGURASI  (edit di sini, atau override lewat URL: ?name=@kamu&theme=neon)
   * ===================================================================== */
  const CONFIG = {
    handle: '@namakamu',            // tampil di pojok kiri atas
    banner: 'MERRY CHRISTMAS 2026', // teks di bawah pohon
    theme: 'classic',               // classic | ice | neon
    fps: 30,                        // batas frame per detik
    speed: 0.55,                    // kecepatan putar (radian/detik)
    cols: 0,                        // jumlah kolom karakter, 0 = otomatis
    showCode: true,                 // panel kode di bawah
    seed: 2026,                     // ubah angka ini untuk tata letak hiasan berbeda
  };

  const qs = new URLSearchParams(location.search);
  const q = (k) => (qs.get(k) || '').trim();
  if (q('name')) CONFIG.handle = q('name').slice(0, 32);
  if (q('text')) CONFIG.banner = q('text').slice(0, 40);
  if (q('theme')) CONFIG.theme = q('theme');
  if (q('fps')) CONFIG.fps = clamp(+q('fps') || 30, 10, 60);
  if (q('speed')) CONFIG.speed = clamp(+q('speed') || 0.55, 0, 3);
  if (q('seed')) CONFIG.seed = (+q('seed') | 0) || CONFIG.seed;
  if (q('code') === '0') CONFIG.showCode = false;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    CONFIG.speed *= 0.4;
  }

  /* =====================================================================
   * 2) TEMA WARNA
   * ===================================================================== */
  const THEMES = {
    classic: {
      label: 'Classic',
      leaf: [128, 62],
      lights: ['#ff3b30', '#ffd60a', '#3d9bff', '#ffffff', '#ff5fd2'],
      orn: ['#ff3b30', '#3d9bff', '#ffd60a', '#b266ff'],
      gifts: ['#2f7dff', '#e03131', '#2fb84f', '#a855f7', '#f59f00'],
      ribbon: ['#ffd60a', '#ffffff', '#ffd60a', '#ffffff', '#ffffff'],
      garland: '#ffcf6e', star: '#ffd60a', banner: '#ff3b30',
      snow: '#e8f0ff', sky: '#8fa4d4', bg: '#05060d',
    },
    ice: {
      label: 'Ice',
      leaf: [172, 52],
      lights: ['#7fdcff', '#ffffff', '#a5b4ff', '#6ef2d6'],
      orn: ['#7fdcff', '#ffffff', '#a5b4ff'],
      gifts: ['#3b82f6', '#06b6d4', '#8b5cf6', '#e2e8f0', '#14b8a6'],
      ribbon: ['#ffffff', '#ffffff', '#ffffff', '#3b82f6', '#ffffff'],
      garland: '#d6f3ff', star: '#ffffff', banner: '#7fdcff',
      snow: '#ffffff', sky: '#9bb7e0', bg: '#040a14',
    },
    neon: {
      label: 'Neon',
      leaf: [152, 100],
      lights: ['#ff2bd6', '#00f0ff', '#b6ff00', '#ffee00'],
      orn: ['#ff2bd6', '#00f0ff', '#ffee00'],
      gifts: ['#ff2bd6', '#00f0ff', '#b6ff00', '#7c3aed', '#ff6b00'],
      ribbon: ['#ffffff', '#ff2bd6', '#7c3aed', '#ffffff', '#ffee00'],
      garland: '#ff9bf0', star: '#ffee00', banner: '#ff2bd6',
      snow: '#d9fbff', sky: '#9a8cff', bg: '#07040f',
    },
  };
  const THEME_ORDER = Object.keys(THEMES);
  if (!THEMES[CONFIG.theme]) CONFIG.theme = 'classic';

  const hsl = (h, s, l) => `hsl(${h},${s}%,${l}%)`;
  function mix(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 255) * k) | 0;
    const g = Math.min(255, ((n >> 8) & 255) * k) | 0;
    const b = Math.min(255, (n & 255) * k) | 0;
    return `rgb(${r},${g},${b})`;
  }
  const shades = (hex, n) => Array.from({ length: n }, (_, i) => mix(hex, 0.3 + (0.85 * i) / (n - 1)));

  let T = THEMES[CONFIG.theme];
  let PAL = null;
  function buildPalette() {
    PAL = {
      leaf: Array.from({ length: 11 }, (_, i) => hsl(T.leaf[0], T.leaf[1], 13 + i * 4.7)),
      trunk: Array.from({ length: 11 }, (_, i) => hsl(28, 50, 10 + i * 3.8)),
      ground: ['#222f52', '#32446f', '#4a609b'],
      lightsOn: T.lights,
      lightsDim: T.lights.map((c) => mix(c, 0.32)),
      ornShade: T.orn.map((c) => shades(c, 6)),
      giftShade: T.gifts.map((c) => shades(c, 6)),
      ribShade: T.ribbon.map((c) => shades(c, 6)),
    };
  }

  /* =====================================================================
   * 3) GLYPH RAMP (gelap -> terang)
   * ===================================================================== */
  const LEAF = ['.', ',', "'", '^', '"', '*', 'x', '%', '&', '$', '@'];
  const RIMCH = ['v', 'V', 'Y', 'w', 'u'];
  const TRUNK = ['.', ':', 'l', 'I', 'H', '#', '#', 'H', '#', '#', '#'];
  const GIFT = ['.', ':', 'x', 'X', '#', '@'];
  const RIB = ['-', '=', '+', '#', 'H', '@'];
  const ORN = ['o', '0', 'O', 'O', '@', '@'];
  const GROUND = ['.', ',', '-', ':'];
  const GARL = ['*', '+', '~'];
  const STAR_CH = ['#', '@', '*', '%', '&'];

  /* =====================================================================
   * 4) GEOMETRI 3D  (semua titik dibuat sekali, lalu diputar tiap frame)
   * ===================================================================== */
  function mulberry32(a) {
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(CONFIG.seed);

  // kind: 0 daun | 1 rumbai | 2 garland | 3 lampu | 4 bola | 5 bintang | 6 batang | 7 kado | 8 lantai
  const P = [];
  function addN(x, y, z, nx, ny, nz, kind, o) {
    const l = Math.hypot(nx, ny, nz) || 1;
    P.push(Object.assign(
      { x, y, z, nx: nx / l, ny: ny / l, nz: nz / l, kind, ci: 0, ph: 0, j: 0, ch: '', rb: false },
      o || {}
    ));
  }

  const FLOOR = -1.62;
  const TOP = 2.05;
  const TIERS = [
    { yb: -1.0, h: 1.3, r: 1.4 },
    { yb: -0.25, h: 1.2, r: 1.12 },
    { yb: 0.45, h: 1.1, r: 0.86 },
    { yb: 1.05, h: 1.0, r: 0.6 },
  ];
  function radiusAt(y) {
    let r = 0;
    for (const t of TIERS) {
      if (y >= t.yb && y <= t.yb + t.h) r = Math.max(r, t.r * (1 - (y - t.yb) / t.h));
    }
    return r;
  }

  function buildScene() {
    // --- daun + rumbai tiap tingkat ---
    const LEAF_N = [1000, 820, 620, 420];
    TIERS.forEach((t, i) => {
      for (let k = 0; k < LEAF_N[i]; k++) {
        const s = Math.sqrt(rnd());                     // 0 = ujung atas, 1 = tepi bawah
        const inner = rnd() < 0.28 ? 0.3 + 0.65 * rnd() : 1;
        const a = rnd() * TAU;
        const rad = t.r * s * inner;
        addN(rad * Math.cos(a), t.yb + t.h * (1 - s), rad * Math.sin(a),
          t.h * Math.cos(a), t.r, t.h * Math.sin(a), 0,
          { j: [-1, 0, 0, 1][(rnd() * 4) | 0] });
      }
      const RN = Math.round(60 + t.r * 40);
      for (let k = 0; k < RN; k++) {
        const a = (k / RN) * TAU + (rnd() - 0.5) * 0.05;
        const rad = t.r * (1 + 0.05 * rnd());
        addN(rad * Math.cos(a), t.yb - 0.02 + 0.05 * Math.sin(a * 8 + i), rad * Math.sin(a),
          Math.cos(a), -0.15, Math.sin(a), 1, { j: (rnd() * 5) | 0 });
      }
    });

    // --- garland spiral + lampu ---
    const GN = 460, TURNS = 6.5;
    for (let i = 0; i < GN; i++) {
      const u = i / GN;
      const y = -0.9 + u * 2.85;
      const rad = radiusAt(y) + 0.07;
      const a = u * TURNS * TAU;
      const isLight = i % 9 === 0;
      addN(rad * Math.cos(a), y, rad * Math.sin(a), Math.cos(a), 0.3, Math.sin(a),
        isLight ? 3 : 2,
        { ci: isLight ? ((i / 9) | 0) : i % 3, ph: rnd() * TAU });
    }

    // --- bola hias ---
    for (let k = 0; k < 52; k++) {
      const t = TIERS[(rnd() * 4) | 0];
      const s = 0.3 + 0.62 * rnd();
      const a = rnd() * TAU;
      const rad = t.r * s * 1.04;
      addN(rad * Math.cos(a), t.yb + t.h * (1 - s), rad * Math.sin(a),
        t.h * Math.cos(a), t.r, t.h * Math.sin(a), 4, { ci: (rnd() * 4) | 0 });
    }

    // --- bintang di puncak (2 bidang saling tegak lurus) ---
    const SY = TOP + 0.24;
    const poly = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.15 : 0.34;
      const ang = Math.PI / 2 + (i * Math.PI) / 5;
      poly.push([r * Math.cos(ang), r * Math.sin(ang)]);
    }
    const inPoly = (x, y) => {
      let c = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i], [xj, yj] = poly[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    for (const plane of [0, 1]) {
      let n = 0;
      while (n < 150) {
        const u = (rnd() * 2 - 1) * 0.34, v = (rnd() * 2 - 1) * 0.34;
        if (!inPoly(u, v)) continue;
        n++;
        addN(plane ? 0 : u, SY + v, plane ? u : 0, 0, 0, -1, 5,
          { ch: STAR_CH[(rnd() * 5) | 0], ph: rnd() * TAU });
      }
      for (let k = 1; k <= 6; k++) {
        const d = 0.38 + k * 0.05;
        const rays = [[0, d, '|'], [d, 0, '-'], [-d, 0, '-']];
        for (const [u, v, ch] of rays) {
          addN(plane ? 0 : u, SY + v, plane ? u : 0, 0, 0, -1, 5, { ch, ci: 1, ph: rnd() * TAU });
        }
      }
    }

    // --- batang ---
    for (let k = 0; k < 130; k++) {
      const a = rnd() * TAU;
      const rad = 0.2 * (0.9 + 0.2 * rnd());
      addN(rad * Math.cos(a), FLOOR + rnd() * 0.65, rad * Math.sin(a), Math.cos(a), 0, Math.sin(a), 6);
    }

    // --- kado ---
    const GIFTS = [
      { a: 3.55, d: 1.55, w: 0.6, h: 0.45, dp: 0.5, rot: 0.5, c: 0 },
      { a: 2.7, d: 1.8, w: 0.45, h: 0.4, dp: 0.45, rot: -0.4, c: 1 },
      { a: 0.2, d: 1.6, w: 0.55, h: 0.5, dp: 0.55, rot: 0.9, c: 1 },
      { a: 0.9, d: 1.9, w: 0.42, h: 0.34, dp: 0.42, rot: 0.2, c: 2 },
      { a: 4.9, d: 1.75, w: 0.5, h: 0.38, dp: 0.5, rot: -0.7, c: 3 },
      { a: 5.6, d: 1.5, w: 0.38, h: 0.3, dp: 0.38, rot: 0.1, c: 4 },
    ];
    for (const g of GIFTS) {
      const cr = Math.cos(g.rot), sr = Math.sin(g.rot);
      const bx = Math.cos(g.a) * g.d, bz = Math.sin(g.a) * g.d;
      const rw = 0.055;
      const place = (lx, ly, lz, nx, ny, nz, rb) => {
        addN(bx + lx * cr + lz * sr, FLOOR + ly, bz - lx * sr + lz * cr,
          nx * cr + nz * sr, ny, -nx * sr + nz * cr, 7, { ci: g.c, rb });
      };
      for (let k = 0; k < 150; k++) {
        const f = (rnd() * 5) | 0;
        const u = rnd() - 0.5, v = rnd();
        if (f === 0) {
          const lx = u * g.w, lz = (rnd() - 0.5) * g.dp;
          place(lx, g.h, lz, 0, 1, 0, Math.abs(lx) < rw || Math.abs(lz) < rw);
        } else if (f === 1 || f === 2) {
          const s = f === 1 ? 1 : -1, lx = u * g.w;
          place(lx, v * g.h, s * g.dp / 2, 0, 0, s, Math.abs(lx) < rw);
        } else {
          const s = f === 3 ? 1 : -1, lz = u * g.dp;
          place(s * g.w / 2, v * g.h, lz, s, 0, 0, Math.abs(lz) < rw);
        }
      }
      for (let k = 0; k < 8; k++) {
        const a = rnd() * TAU;
        place(Math.cos(a) * 0.07, g.h + 0.04 + rnd() * 0.05, Math.sin(a) * 0.07, 0, 1, 0, true);
      }
    }

    // --- lantai salju ---
    for (let k = 0; k < 320; k++) {
      const r = 2.5 * Math.sqrt(rnd()), a = rnd() * TAU;
      addN(r * Math.cos(a), FLOOR, r * Math.sin(a), 0, 1, 0, 8, { ci: (rnd() * 4) | 0, ph: r });
    }
  }
  buildScene();

  /* --- latar bintang & salju (koordinat layar, bukan 3D) --- */
  const BGSTARS = Array.from({ length: 150 }, () => ({
    x: rnd(), y: rnd() * 0.85, ph: rnd() * TAU, ch: ['.', '.', '+', '*'][(rnd() * 4) | 0],
  }));
  const FLAKES = Array.from({ length: 110 }, () => ({
    x: rnd(), y: rnd(), z: -1.8 + rnd() * 4.8,
    vy: 0.035 + rnd() * 0.07, dx: (rnd() - 0.5) * 0.01, ph: rnd() * TAU,
  }));

  /* =====================================================================
   * 5) CANVAS & BUFFER
   * ===================================================================== */
  const canvas = $('c');
  const ctx = canvas.getContext('2d', { alpha: false });
  const view = $('view');
  const FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", "Courier New", monospace';

  let W = 0, H = 0, dpr = 1;
  let cols = 0, rows = 0, cw = 0, ch = 0, fs = 0;
  let S = 100, cx = 0, cy = 0;
  let zbuf, chs, cls, kd;
  const CAM = 8;
  const TILT = 0.22, cP = Math.cos(TILT), sP = Math.sin(TILT);
  const LIGHT = (() => {
    const x = -0.5, y = 0.65, z = -0.75, l = Math.hypot(x, y, z);
    return { x: x / l, y: y / l, z: z / l };
  })();

  function resize() {
    const r = view.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.floor(r.width));
    H = Math.max(1, Math.floor(r.height));
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cols = CONFIG.cols || clamp(Math.round(W / 6.4), 54, 100);
    cw = W / cols;
    fs = cw / 0.6;
    ctx.font = `700 ${fs}px ${FONT}`;
    const m = ctx.measureText('M').width;
    if (m > 0) fs = (fs * cw) / m;
    ch = fs * 1.02;
    rows = Math.max(10, Math.floor(H / ch));

    const n = cols * rows;
    zbuf = new Float32Array(n);
    chs = new Array(n).fill('');
    cls = new Array(n).fill('');
    kd = new Uint8Array(n);

    S = Math.min(W * 0.21, H * 0.135);
    cx = W / 2;
    cy = H * 0.09 + 3.0 * S;
  }

  /* =====================================================================
   * 6) RENDER
   * ===================================================================== */
  let angle = 0;
  let t = 0;
  let paused = false;
  let dragging = false;
  let lettersCount = 0;

  function frame(dt) {
    t += dt;
    if (!paused && !dragging) angle += CONFIG.speed * dt;

    zbuf.fill(Infinity);
    chs.fill('');
    kd.fill(255);

    const put = (i, z, c, color, kind) => {
      if (z < zbuf[i]) { zbuf[i] = z; chs[i] = c; cls[i] = color; kd[i] = kind; }
    };

    const cT = Math.cos(angle), sT = Math.sin(angle);

    // latar bintang
    for (const s of BGSTARS) {
      const tw = Math.sin(t * 1.6 + s.ph);
      if (tw < -0.35) continue;
      const col = Math.floor(s.x * cols), row = Math.floor(s.y * rows);
      put(row * cols + col, 40, s.ch, tw > 0.7 ? '#ffffff' : T.sky, 10);
    }

    // titik 3D
    for (let n = 0; n < P.length; n++) {
      const p = P[n];
      const x1 = p.x * cT + p.z * sT;
      const z1 = -p.x * sT + p.z * cT;
      const y2 = p.y * cP + z1 * sP;
      const z2 = -p.y * sP + z1 * cP;
      const f = CAM / (CAM + z2);
      const col = Math.floor((cx + x1 * f * S) / cw);
      const row = Math.floor((cy - y2 * f * S) / ch);
      if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
      const idx = row * cols + col;
      if (z2 >= zbuf[idx]) continue;

      let b = 0;
      if (p.kind !== 5) {
        const nx1 = p.nx * cT + p.nz * sT;
        const nz1 = -p.nx * sT + p.nz * cT;
        const ny2 = p.ny * cP + nz1 * sP;
        const nz2 = -p.ny * sP + nz1 * cP;
        b = nx1 * LIGHT.x + ny2 * LIGHT.y + nz2 * LIGHT.z;
        if (b < 0) b = 0;
      }

      let c, color, lvl;
      switch (p.kind) {
        case 0:
          lvl = clamp(Math.floor((0.16 + 0.84 * b) * 10.99) + p.j, 0, 10);
          c = LEAF[lvl]; color = PAL.leaf[lvl];
          break;
        case 1:
          lvl = clamp(Math.floor((0.16 + 0.84 * b) * 10.99), 0, 10);
          c = RIMCH[p.j % 5]; color = PAL.leaf[Math.min(10, lvl + 2)];
          break;
        case 2:
          c = GARL[p.ci % 3];
          color = Math.sin(t * 5 + p.ph) > 0.85 ? '#ffffff' : T.garland;
          break;
        case 3: {
          const k = p.ci % PAL.lightsOn.length;
          const on = Math.sin(t * 3.2 + p.ph) > -0.25;
          c = on ? 'O' : 'o';
          color = on ? PAL.lightsOn[k] : PAL.lightsDim[k];
          if (on) {
            const g = PAL.lightsDim[k];
            if (col > 0) put(idx - 1, z2 + 0.25, '.', g, 9);
            if (col < cols - 1) put(idx + 1, z2 + 0.25, '.', g, 9);
            if (row > 0) put(idx - cols, z2 + 0.25, '.', g, 9);
            if (row < rows - 1) put(idx + cols, z2 + 0.25, '.', g, 9);
          }
          break;
        }
        case 4: {
          lvl = Math.min(5, Math.floor(b * 5.99));
          const hi = b > 0.93;
          c = hi ? '*' : ORN[lvl];
          color = hi ? '#ffffff' : PAL.ornShade[p.ci % PAL.ornShade.length][lvl];
          break;
        }
        case 5:
          if (p.ci === 1 && Math.sin(t * 4 + p.ph) < 0) continue;
          c = p.ch;
          color = Math.sin(t * 6 + p.ph) > 0.6 ? '#ffffff' : T.star;
          break;
        case 6:
          lvl = clamp(Math.floor((0.16 + 0.84 * b) * 10.99), 0, 10);
          c = TRUNK[lvl]; color = PAL.trunk[lvl];
          break;
        case 7:
          lvl = Math.min(5, Math.floor((0.22 + 0.78 * b) * 5.99));
          if (p.rb) { c = RIB[lvl]; color = PAL.ribShade[p.ci % PAL.ribShade.length][lvl]; }
          else { c = GIFT[lvl]; color = PAL.giftShade[p.ci % PAL.giftShade.length][lvl]; }
          break;
        default:
          c = GROUND[p.ci];
          color = PAL.ground[p.ph < 1.2 ? 2 : p.ph < 1.9 ? 1 : 0];
      }
      zbuf[idx] = z2; chs[idx] = c; cls[idx] = color; kd[idx] = p.kind;
    }

    // salju (punya kedalaman sendiri, jadi bisa lewat di depan / belakang pohon)
    for (const f of FLAKES) {
      f.y += f.vy * dt;
      f.x += (f.dx + Math.sin(t * 0.9 + f.ph) * 0.018) * dt;
      if (f.y >= 1) { f.y -= 1; f.x = Math.random(); }
      if (f.x < 0) f.x += 1; else if (f.x >= 1) f.x -= 1;
      const col = Math.floor(f.x * cols), row = Math.floor(f.y * rows);
      put(row * cols + col, f.z, f.z < 0 ? '*' : f.z < 1.4 ? '+' : '.', T.snow, 11);
    }

    // gambar
    ctx.fillStyle = T.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.font = `700 ${fs}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let last = '';
    for (let r = 0; r < rows; r++) {
      const base = r * cols, y = (r + 0.5) * ch;
      for (let c = 0; c < cols; c++) {
        const i = base + c;
        const g = chs[i];
        if (!g) continue;
        if (cls[i] !== last) { ctx.fillStyle = cls[i]; last = cls[i]; }
        ctx.fillText(g, (c + 0.5) * cw, y);
      }
    }

    drawBanner();
  }

  function drawBanner() {
    const txt = CONFIG.banner.toUpperCase();
    if (!txt) return;
    const row = Math.min(rows - 2, Math.floor(rows * 0.9));
    const k = Math.min(1.35, (W * 0.94) / (txt.length * cw));
    const step = cw * k;
    const startX = (W - txt.length * step) / 2 + step / 2;
    const shown = clamp(Math.floor((t - 0.6) * 10), 0, txt.length);
    const y = row * ch + ch * 0.5;

    ctx.save();
    ctx.font = `700 ${fs * k}px ${FONT}`;
    ctx.fillStyle = T.banner;
    ctx.shadowColor = T.banner;
    ctx.shadowBlur = fs * (0.9 + 0.4 * Math.sin(t * 2.2));
    for (let i = 0; i < shown; i++) {
      if (txt[i] !== ' ') ctx.fillText(txt[i], startX + i * step, y);
    }
    if (shown < txt.length && Math.floor(t * 3) % 2 === 0) ctx.fillText('_', startX + shown * step, y);
    ctx.restore();
  }

  /* =====================================================================
   * 7) HUD, TEMA, KONTROL
   * ===================================================================== */
  const elRot = $('rot'), elLetters = $('letters'), elTime = $('time'), elFps = $('fps');
  const elHandle = $('handle'), elToast = $('toast');
  const btnPause = $('btnPause');

  function updateHud() {
    const deg = (((angle * 180) / Math.PI) % 360 + 360) % 360;
    elRot.textContent = deg.toFixed(2) + '°';
    elTime.textContent = t.toFixed(1) + 's';
    let n = 0;
    for (let i = 0; i < kd.length; i++) if (kd[i] <= 7) n++;
    lettersCount = n;
    elLetters.textContent = n.toLocaleString('en-US');
  }

  let toastTimer = 0;
  function toast(msg) {
    elToast.textContent = msg;
    elToast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elToast.classList.remove('show'), 1300);
  }

  function applyTheme(name) {
    CONFIG.theme = name;
    T = THEMES[name];
    buildPalette();
    const root = document.documentElement.style;
    root.setProperty('--accent', T.banner);
    root.setProperty('--bg', T.bg);
  }
  function nextTheme() {
    const i = THEME_ORDER.indexOf(CONFIG.theme);
    const name = THEME_ORDER[(i + 1) % THEME_ORDER.length];
    applyTheme(name);
    toast('Tema: ' + THEMES[name].label);
  }
  function togglePause() {
    paused = !paused;
    btnPause.textContent = paused ? '▶' : '⏸';
    toast(paused ? 'Dijeda' : 'Berputar');
  }
  function savePng() {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ascii-christmas-tree.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast('PNG tersimpan');
    }, 'image/png');
  }

  btnPause.addEventListener('click', togglePause);
  $('btnTheme').addEventListener('click', nextTheme);
  $('btnSave').addEventListener('click', savePng);

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); togglePause(); }
    else if (k === 't') nextTheme();
    else if (k === 's') savePng();
  });

  // geser untuk memutar manual
  let lastX = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* abaikan */ }
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    angle += (e.clientX - lastX) * 0.012;
    lastX = e.clientX;
  });
  const endDrag = () => { dragging = false; canvas.style.cursor = 'grab'; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  // panel kode dekoratif
  const SNIPPET = [
    '// christmas_tree.js',
    'const TIERS = [',
    '  { yb: -1.00, h: 1.3, r: 1.40 },',
    '  { yb: -0.25, h: 1.2, r: 1.12 },',
    '  { yb:  0.45, h: 1.1, r: 0.86 },',
    '  { yb:  1.05, h: 1.0, r: 0.60 },',
    '];',
    '',
    'function project(p, th) {',
    '  const x1 = p.x * cos(th) + p.z * sin(th);',
    '  const z1 = -p.x * sin(th) + p.z * cos(th);',
    '  const f  = CAM / (CAM + z2);',
    '  return [cx + x1 * f * S, cy - y2 * f * S];',
    '}',
    '',
    'function draw(t) {',
    '  zbuf.fill(Infinity);',
    '  for (const p of points) {',
    '    const [col, row] = toCell(project(p, angle));',
    '    if (z < zbuf[idx]) put(idx, z, glyph(p, light), color);',
    '  }',
    '  drawSnow(t);',
    '  drawBanner(t);',
    '}',
    '',
  ].join('\n');
  $('code').textContent = SNIPPET + '\n' + SNIPPET;
  if (!CONFIG.showCode) $('codebar').classList.add('hidden');

  /* =====================================================================
   * 8) LOOP
   * ===================================================================== */
  elHandle.textContent = CONFIG.handle;
  applyTheme(CONFIG.theme);
  resize();
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(view);
  window.addEventListener('resize', resize);

  const interval = 1000 / CONFIG.fps;
  let lastTs = 0, lastFrame = 0, fpsCount = 0, fpsAt = 0, hudTick = 0;

  function loop(now) {
    requestAnimationFrame(loop);
    if (!lastTs) { lastTs = now; lastFrame = now; fpsAt = now; }
    const elapsed = now - lastFrame;
    if (elapsed < interval - 1) return;
    const dt = Math.min(0.1, (now - lastTs) / 1000);
    lastTs = now;
    lastFrame = now - (elapsed % interval);

    frame(dt);

    fpsCount++;
    if (++hudTick % 4 === 0) updateHud();
    if (now - fpsAt >= 1000) {
      elFps.textContent = String(Math.round((fpsCount * 1000) / (now - fpsAt)));
      fpsCount = 0;
      fpsAt = now;
    }
  }
  requestAnimationFrame(loop);

  // dipakai untuk debugging di console: window.__tree.lettersCount
  window.__tree = { get lettersCount() { return lettersCount; }, THEMES };
})();
