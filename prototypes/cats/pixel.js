// 32×32 pixel cats, drawn procedurally: each layer is a set of filled cells that gets
// its own 1px outline, so later layers (near legs, head) read as separate shapes.
export const PX = { w: 32, h: 24, top: 7 };

const PAL = {
  tabby: { o: "#231d1a", f: "#7d6d5e", s: "#625548", d: "#2e2724", w: "#f7f2eb", t: "#d9c3a5", p: "#d9918c", k: "#231d1a" },
  gray: { o: "#2b2b31", f: "#8f96a1", s: "#6f7682", d: "#727985", w: "#fbfaf7", p: "#eeaab0", k: "#2b2b31" },
};

const HEAD = {
  tabby: [
    "ff......ff",
    "fpf....fpf",
    "ffdfddfdff",
    "ffkffffkff",
    "ffkffffkff",
    "ffwwppwwff",
    "fwwwwwwwwf",
    ".ffwwwwff.",
  ],
  gray: [
    "ff......ff",
    "fpf....fpf",
    "ffffwwffff",
    "ffkfwwfkff",
    "ffkwwwwkff",
    "fwwwppwwwf",
    "wwwwwwwwww",
    ".wwwwwwww.",
  ],
};

const blank = () => Array.from({ length: 32 }, () => Array(32).fill(null));
const set = (g, x, y, c) => { if (x >= 0 && x < 32 && y >= 0 && y < 32 && c) g[y][x] = c; };
const ellipse = (g, cx, cy, rx, ry, col) => {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++)
    if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) set(g, x, y, col(x, y));
};
const rect = (g, x0, y0, x1, y1, col) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(g, x, y, col(x, y));
};
const line = (g, pts, col) => {
  let i = 0;
  for (let s = 0; s < pts.length - 1; s++) {
    const [ax, ay] = pts[s], [bx, by] = pts[s + 1];
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1);
    for (let t = 0; t <= n; t++, i++) {
      const x = Math.round(ax + ((bx - ax) * t) / n), y = Math.round(ay + ((by - ay) * t) / n);
      const c = col(i);
      set(g, x, y, c); set(g, x + 1, y, c); set(g, x, y + 1, c); set(g, x + 1, y + 1, c);
    }
  }
};

function head(coat, hx, hy, { closed = false } = {}) {
  const g = blank();
  HEAD[coat].forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === ".") return;
    let c = ch;
    if (closed && ch === "k") c = y === 4 ? "o" : HEAD[coat][2][x] === "w" ? "w" : "f";
    set(g, hx + x, hy + y, c);
  }));
  if (closed) {
    set(g, hx + 1, hy + 4, "o"); set(g, hx + 8, hy + 4, "o");
  }
  return g;
}

function compose(layers) {
  const out = blank();
  for (const g of layers) {
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      if (g[y][x]) continue;
      if ((g[y - 1]?.[x]) || (g[y + 1]?.[x]) || g[y][x - 1] || g[y][x + 1]) out[y][x] = "o";
    }
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (g[y][x]) out[y][x] = g[y][x];
  }
  return out;
}

export function build(coat, pose, f, closed) {
  const tabby = coat === "tabby";
  const body = (cy) => (x, y) => tabby
    ? (y >= cy + 2 ? "t" : x % 3 === 0 ? "d" : "f")
    : (y >= cy + 1 ? "w" : "f");
  const sock = (bottom) => (x, y) => (!tabby && y >= bottom - 2 ? "w" : "f");
  const shade = () => "s";
  const backSock = (bottom, base) => (x, y) => (y >= bottom - 1 ? "w" : base);
  const tail = (i) => (tabby && Math.floor(i / 2) % 2 ? "d" : "f");
  const L = { far: blank(), tail: blank(), body: blank(), near: blank(), paw: blank() };
  let h;

  if (pose === "stand" || pose === "walk" || pose === "run" || pose === "crouch" || pose === "wiggle" || pose === "bat" || pose === "paw-down") {
    const low = pose === "crouch" || pose === "wiggle" ? 2 : 0;
    const bob = pose === "walk" ? (f % 2) : pose === "run" ? (f % 2) * -1 : 0;
    const cy = 22.5 + low + bob;
    let s = [0, 0, 0, 0], lift = [0, 0, 0, 0];
    if (pose === "walk") {
      s = [[-1, 1, 1, -1], [0, 0, 0, 0], [1, -1, -1, 1], [0, 0, 0, 0]][f];
      lift = [[0, 0, 0, 0], [1, 0, 0, 1], [0, 0, 0, 0], [0, 1, 1, 0]][f];
    }
    if (pose === "run") s = [[-3, -2, 3, 3], [2, 2, -2, -2]][f];
    const [bFar, bNear, fFar, fNear] = [7 + s[0], 9 + s[1], 16 + s[2], 18 + s[3]];
    const top = Math.round(cy) + 1;
    rect(L.far, bFar, top, bFar + 1, 29 - lift[0], tabby ? backSock(29 - lift[0], "s") : shade);
    rect(L.far, fFar, top, fFar + 1, 29 - lift[2], shade);
    ellipse(L.body, 13, cy, 8, 4.5, body(cy));
    rect(L.near, bNear, top, bNear + 1, 29 - lift[1], tabby ? backSock(29 - lift[1], "f") : sock(29));
    if (pose === "bat") rect(L.paw, 25, 16 - f * 3, 27, 17 - f * 3, sock(0));
    else if (pose === "paw-down") rect(L.paw, 20, 25 + f, 23 + f, 26 + f, sock(0));
    else rect(L.near, fNear, top, fNear + 1, 29 - lift[3], sock(29));
    const wag = pose === "wiggle" ? f : pose === "stand" ? f : 0;
    const tailPts = pose === "run"
      ? [[6, cy - 2], [2, cy - 3], [0, cy - 4]]
      : [[6, cy - 2], [4, cy - 6], [4 - wag, cy - 9], [6 - wag, cy - 11]];
    line(L.tail, tailPts, tail);
    h = head(coat, 16, Math.round(cy) - 9 + (pose === "paw-down" ? 1 : 0), { closed });
  } else if (pose === "jump") {
    rect(L.far, 3, 19, 7, 20, (x) => (tabby && x <= 4 ? "w" : "s"));
    rect(L.far, 19, 20, 23, 21, shade);
    ellipse(L.body, 13, 19, 9, 4, body(19));
    rect(L.near, 2, 21, 6, 22, (x) => (x <= 3 ? "w" : sock(99)(x)));
    rect(L.near, 20, 22, 24, 23, sock(99));
    line(L.tail, [[5, 17], [2, 15], [0, 13]], tail);
    h = head(coat, 17, 11, { closed });
  } else if (pose === "sit" || pose === "groom") {
    ellipse(L.body, 13, 24.5, 6.5, 6.5, body(26));
    ellipse(L.near, 10, 27.5, 4, 3, body(26));
    if (tabby) rect(L.paw, 7, 29, 9, 29, () => "w");
    rect(L.near, 15, 23, 18, 29, (x, y) => (x === 16 && y > 25 ? "o" : sock(29)(x, y)));
    line(L.tail, [[8, 29], [4, 29], [3, 27 - (f % 2)], [3, 25 - (f % 2)]], tail);
    h = head(coat, 10, 11 + (pose === "groom" ? 1 : 0), { closed: closed || pose === "groom" });
    if (pose === "groom") rect(L.paw, 17, 17 - f, 18, 21 - f, sock(0));
  } else {
    const breath = pose === "sleep" ? f : 0;
    ellipse(L.body, 13, 25.5 - breath * 0.5, 9, 4.5 + breath * 0.5, body(26));
    line(L.tail, [[4, 26], [6, 28], [16, 28]], tail);
    h = head(coat, 16, 19, { closed: closed || pose === "sleep" });
    rect(L.paw, 19, 29, 20, 29, sock(0));
    rect(L.paw, 23, 29, 24, 29, sock(0));
  }
  const layers = [L.far, L.tail, L.body, L.near, h, L.paw];
  return compose(layers);
}

const FRAMES = { walk: [4, 8], run: [2, 12], stand: [2, 1.2], sit: [2, 0.8], sleep: [2, 0.7], wiggle: [2, 10], bat: [2, 6], "paw-down": [2, 6], groom: [2, 5] };

const cache = new Map();
export function frame(coat, pose, t, closed) {
  const [n, fps] = FRAMES[pose] ?? [1, 1];
  const f = Math.floor(t * fps) % n;
  const key = `${coat}/${pose}/${f}/${closed}`;
  if (!cache.has(key)) {
    const g = build(coat, pose, f, closed);
    const cv = document.createElement("canvas");
    cv.width = PX.w; cv.height = PX.h;
    const ctx = cv.getContext("2d");
    for (let y = 0; y < PX.h; y++) for (let x = 0; x < 32; x++) {
      const c = g[y + PX.top][x];
      if (c) { ctx.fillStyle = PAL[coat][c]; ctx.fillRect(x, y, 1, 1); }
    }
    cache.set(key, cv);
  }
  return cache.get(key);
}
