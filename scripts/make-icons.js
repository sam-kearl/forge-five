/**
 * Renders Forge Five's original app icons from the same geometry as the
 * in-app logo (src/ui/Logo.tsx): five hex components joined to a glowing
 * assembly point. Dependency-free: a tiny supersampled rasteriser plus a PNG
 * encoder using Node's zlib.
 *
 *   node scripts/make-icons.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'assets');

const C = {
  ink: [0x16, 0x1b, 0x24],
  blueprintLine: [0x6f, 0xb2, 0xe8],
  ember: [0xff, 0xb0, 0x3b],
  flux: [0xff, 0x6a, 0x3d],
  brass: [0xe9, 0xc4, 0x6a],
  brassDeep: [0xb8, 0x89, 0x2f],
  ceramic: [0xf5, 0xf0, 0xe6],
  coolant: [0x2e, 0xc4, 0xb6],
  white: [0xff, 0xff, 0xff],
};

// ---------------------------------------------------------------------------
// Geometry (unit square 0..1)
// ---------------------------------------------------------------------------

function hexPoints(cx, cy, w) {
  const h = w * 0.88;
  return [
    [cx - w / 4, cy - h / 2],
    [cx + w / 4, cy - h / 2],
    [cx + w / 2, cy],
    [cx + w / 4, cy + h / 2],
    [cx - w / 4, cy + h / 2],
    [cx - w / 2, cy],
  ];
}

/** The logo as a list of shapes, scaled to occupy `scale` of the square. */
function logoShapes(scale, { mono = false } = {}) {
  const c = 0.5;
  const R = 0.34 * scale;
  const hexW = 0.26 * scale;
  const stroke = 0.022 * scale;
  const centers = Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return [c + Math.cos(a) * R, c + Math.sin(a) * R];
  });
  const col = (x) => (mono ? C.white : x);
  const shapes = [];
  for (const [x, y] of centers) {
    shapes.push({ kind: 'line', a: [x, y], b: [c, c], width: 0.014 * scale, color: col(C.blueprintLine), alpha: mono ? 1 : 0.7 });
  }
  if (!mono) shapes.push({ kind: 'circle', c: [c, c], r: 0.12 * scale, color: C.flux, alpha: 0.3 });
  shapes.push({ kind: 'circle', c: [c, c], r: 0.075 * scale, color: col(C.ember), alpha: 1 });
  centers.forEach(([x, y], i) => {
    const pts = hexPoints(x, y, hexW);
    if (mono) {
      shapes.push({ kind: 'poly', pts, fill: C.white, stroke: null, strokeWidth: 0 });
    } else {
      shapes.push({
        kind: 'poly',
        pts,
        fill: i === 0 ? C.brass : C.ceramic,
        stroke: i === 0 ? C.brassDeep : C.coolant,
        strokeWidth: stroke,
      });
    }
  });
  return shapes;
}

// ---------------------------------------------------------------------------
// Rasteriser
// ---------------------------------------------------------------------------

function segDist(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function inPoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Returns [color, alpha] painted by a shape at a point, or null. */
function sample(shape, x, y) {
  switch (shape.kind) {
    case 'circle':
      return Math.hypot(x - shape.c[0], y - shape.c[1]) <= shape.r ? [shape.color, shape.alpha] : null;
    case 'line':
      return segDist(x, y, shape.a, shape.b) <= shape.width / 2 ? [shape.color, shape.alpha] : null;
    case 'poly': {
      if (shape.stroke) {
        let d = Infinity;
        for (let i = 0; i < shape.pts.length; i++) d = Math.min(d, segDist(x, y, shape.pts[i], shape.pts[(i + 1) % shape.pts.length]));
        if (d <= shape.strokeWidth / 2) return [shape.stroke, 1];
      }
      return inPoly(x, y, shape.pts) ? [shape.fill, 1] : null;
    }
  }
  return null;
}

function bbox(shape) {
  const pad = (shape.strokeWidth || shape.width || 0) / 2 + 0.002;
  const pts =
    shape.kind === 'circle'
      ? [
          [shape.c[0] - shape.r, shape.c[1] - shape.r],
          [shape.c[0] + shape.r, shape.c[1] + shape.r],
        ]
      : shape.kind === 'line'
        ? [shape.a, shape.b]
        : shape.pts;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad];
}

/**
 * Render shapes onto a size×size RGBA buffer with SS×SS supersampling.
 * `background` is an RGB colour or null for transparent.
 */
function render(size, shapes, background, SS = 4) {
  const boxes = shapes.map(bbox);
  const buf = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / size;
          const y = (py + (sy + 0.5) / SS) / size;
          // Premultiplied compositing, back to front.
          let cr = 0,
            cg = 0,
            cb = 0,
            ca = 0;
          if (background) {
            [cr, cg, cb] = background.map((v) => v / 255);
            ca = 1;
          }
          shapes.forEach((s, i) => {
            const bx = boxes[i];
            if (x < bx[0] || x > bx[2] || y < bx[1] || y > bx[3]) return;
            const hit = sample(s, x, y);
            if (!hit) return;
            const [col, al] = hit;
            cr = (col[0] / 255) * al + cr * (1 - al);
            cg = (col[1] / 255) * al + cg * (1 - al);
            cb = (col[2] / 255) * al + cb * (1 - al);
            ca = al + ca * (1 - al);
          });
          r += cr;
          g += cg;
          b += cb;
          a += ca;
        }
      }
      const n = SS * SS;
      const o = (py * size + px) * 4;
      const alpha = a / n;
      // Un-premultiply for PNG storage.
      buf[o] = alpha ? Math.round((r / n / alpha) * 255) : 0;
      buf[o + 1] = alpha ? Math.round((g / n / alpha) * 255) : 0;
      buf[o + 2] = alpha ? Math.round((b / n / alpha) * 255) : 0;
      buf[o + 3] = Math.round(alpha * 255);
    }
  }
  return buf;
}

// ---------------------------------------------------------------------------
// PNG encoder
// ---------------------------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** Encode RGBA (withAlpha) or RGB (opaque) PNG. */
function png(size, rgba, withAlpha) {
  const channels = withAlpha ? 4 : 3;
  const raw = Buffer.alloc((size * channels + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * channels + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4;
      const dst = y * (size * channels + 1) + 1 + x * channels;
      raw[dst] = rgba[src];
      raw[dst + 1] = rgba[src + 1];
      raw[dst + 2] = rgba[src + 2];
      if (withAlpha) raw[dst + 3] = rgba[src + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = withAlpha ? 6 : 2; // colour type RGBA / RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function write(name, size, shapes, background, { alpha }) {
  const file = path.join(OUT, name);
  fs.writeFileSync(file, png(size, render(size, shapes, background), alpha));
  console.log(`${name.padEnd(30)} ${size}×${size}  ${fs.statSync(file).size} bytes`);
}

// iOS / store icon: opaque, full-bleed ink background (the OS applies the rounded mask).
write('icon.png', 1024, logoShapes(0.86), C.ink, { alpha: false });
// Splash: transparent logo on the ink splash background configured in app.json.
write('splash-icon.png', 1024, logoShapes(1), null, { alpha: true });
// Browser tab icon.
write('favicon.png', 48, logoShapes(1.05), C.ink, { alpha: true });
// Android adaptive icon: logo kept inside the central safe zone.
write('android-icon-foreground.png', 512, logoShapes(0.62), null, { alpha: true });
write('android-icon-background.png', 512, [], C.ink, { alpha: true });
write('android-icon-monochrome.png', 432, logoShapes(0.62, { mono: true }), null, { alpha: true });
