import { Cat, INTERRUPT, clamp, rand, pick, delay, perch, pageRect, layer, reducedMotion } from "./cat.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const CONCEPTS = {
  roommates: "Roommates: they wander between the rules, nap on the footer and bat the nav. Click a cat to pet it.",
  knockoff: "Knock it off: they push 88×31 buttons off the shelf and tilt the nav, one thing at a time.",
  playtime: "Playtime: throw the yarn or turn on the laser pointer. Drag the yarn anywhere.",
  peekaboo: "Peekaboo: the quiet one. They hide behind the rules, peek out and duck if you get close.",
};
const params = new URLSearchParams(location.search);
const concept = CONCEPTS[params.get("c")] ? params.get("c") : "roommates";
const STYLES = { atsume: "Neko Atsume", pixel: "Pixel 32×32" };
const style = STYLES[params.get("s")] ? params.get("s") : "atsume";
const go = (c, s) => { location.search = `?c=${c}&s=${s}`; };

const bottomEdge = (el, o = {}) => {
  const p = perch(el, o);
  const base = p.rect;
  p.rect = () => { const r = base(); return { ...r, top: r.top + el.getBoundingClientRect().height }; };
  return p;
};

const buttonsEl = $("#buttons");
const liveButtons = () => [...buttonsEl.children].filter((a) => !a.classList.contains("gone"));
const buttonRow = () => {
  const bs = liveButtons().map((a) => ({ a, r: pageRect(a) }));
  if (!bs.length) return [];
  const top = Math.min(...bs.map((b) => b.r.top));
  return bs.filter((b) => Math.abs(b.r.top - top) < 2);
};
const buttonsPerch = {
  name: "buttons",
  rect() {
    const row = buttonRow();
    if (!row.length) { const r = pageRect(buttonsEl); return { left: r.left + 16, right: r.left + 80, top: r.top }; }
    return {
      left: Math.min(...row.map((b) => b.r.left)) + 14,
      right: Math.max(...row.map((b) => b.r.right)) - 14,
      top: row[0].r.top,
    };
  },
};

const P = {
  header: perch($("#header-rule"), { inset: 24, name: "header" }),
  work: bottomEdge($("#work-label"), { inset: 24, name: "work" }),
  friends: bottomEdge($("#friends-label"), { inset: 24, name: "friends" }),
  buttons: buttonsPerch,
  floor: perch($("#footer"), { inset: 20, name: "floor" }),
};
const SHELVES = [P.header, P.work, P.friends, P.buttons, P.floor];
const PROP_SHELVES = [P.header, P.work, P.buttons, P.floor];
const pageBounds = () => { const r = pageRect($(".page")); return { left: r.left + 12, right: r.right - 12 }; };

// ---------- physics props (fallen buttons, yarn) ----------

class Prop {
  constructor(el, { x, y, w, h, roll = false, shelves = PROP_SHELVES }) {
    Object.assign(this, { el, x, y, w, h, roll, shelves, vx: 0, vy: 0, rot: 0, vr: 0, resting: false, perch: null, dragging: false });
    el.classList.add("prop");
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    layer.append(el);
    Prop.all.push(this);
    this.render();
  }
  kick(vx, vy, vr = 0) { this.vx = vx; this.vy = vy; this.vr = vr; this.resting = false; this.perch = null; }
  step(dt) {
    if (this.dragging) return this.render();
    if (this.resting && this.perch) {
      const r = this.perch.rect();
      this.y = r.top;
      if (this.x < r.left - 14 || this.x > r.right + 14) { this.resting = false; this.perch = null; }
      return this.render();
    }
    const py = this.y;
    this.vy += 1900 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += (this.roll ? (this.vx * dt) / (this.w / 2) * 57.3 : this.vr * dt);
    const b = pageBounds();
    if (this.x < b.left) { this.x = b.left; this.vx = Math.abs(this.vx) * 0.5; }
    if (this.x > b.right) { this.x = b.right; this.vx = -Math.abs(this.vx) * 0.5; }
    for (const s of this.shelves) {
      const r = s.rect();
      if (py <= r.top + 0.5 && this.y >= r.top && this.x >= r.left - 14 && this.x <= r.right + 14) {
        this.y = r.top;
        this.perch = s;
        if (this.vy > 180) { this.vy = -this.vy * (this.roll ? 0.45 : 0.28); this.vr *= -0.5; }
        else {
          this.vy = 0;
          this.vx *= this.roll ? 0.992 : 0.8;
          if (!this.roll) { this.vr = 0; this.rot += (Math.round(this.rot / 180) * 180 - this.rot) * 0.2; }
          if (Math.abs(this.vx) < 6) { this.vx = 0; this.resting = true; }
        }
        break;
      }
    }
    if (this.y > document.documentElement.scrollHeight + 200) { this.y = P.floor.rect().top; this.vy = 0; }
    this.render();
  }
  render() {
    this.el.style.transform = `translate(${this.x - this.w / 2}px, ${this.y - this.h}px) rotate(${this.rot}deg)`;
  }
  remove() { this.el.remove(); Prop.all.splice(Prop.all.indexOf(this), 1); }
}
Prop.all = [];
{
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(32, now - last) / 1000;
    last = now;
    for (const p of [...Prop.all]) p.step(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

// ---------- cats ----------

const tabby = new Cat({ name: "brown tabby", coat: "tabby", style });
const gray = new Cat({ name: "gray & white", coat: "gray", style });
const cats = [tabby, gray];
const other = (c) => (c === tabby ? gray : tabby);

let pointer = { x: -1e4, y: -1e4, active: false };
addEventListener("pointermove", (e) => { pointer = { x: e.pageX, y: e.pageY, active: true }; });
document.addEventListener("pointerleave", () => { pointer.active = false; });

function pet(cat) {
  return cat.doNow(async () => {
    cat.clipDepth = 0;
    cat.pose = "sit";
    cat.el.classList.add("happy");
    cat.hearts();
    cat.bubble(pick(["prrr", "mrrp", "prrrrr"]));
    try { await cat.wait(2200); } finally { cat.el.classList.remove("happy"); }
  });
}
for (const c of cats) c.el.addEventListener("click", () => (concept === "peekaboo" ? peekPet(c) : pet(c)));

async function napFx(cat, ms) {
  cat.pose = "sleep";
  let e = 0, z = 0;
  await cat.frames((dt) => {
    e += dt * 1000;
    if (e > z) {
      z += 1400;
      const el = document.createElement("div");
      el.className = "cat-z";
      el.textContent = "z";
      cat.fx.append(el);
      setTimeout(() => el.remove(), 2400);
    }
    return e >= ms;
  });
  cat.pose = "stand";
}

const neighbours = (p) => {
  const i = SHELVES.indexOf(p);
  return SHELVES.filter((_, j) => j !== i && Math.abs(j - i) <= 2);
};

async function batNav(cat, { tilt = false } = {}) {
  const link = pick($$("#nav a"));
  const r = pageRect(link);
  const side = Math.random() < 0.5 ? -1 : 1;
  await cat.goTo(P.header, side < 0 ? r.left - 18 : r.right + 18);
  cat.face(r.cx);
  cat.pose = "bat";
  for (let i = 0; i < 3; i++) {
    link.classList.remove("batted");
    void link.offsetWidth;
    link.classList.add("batted");
    await cat.wait(520);
  }
  if (tilt) {
    link.style.setProperty("--tilt", `${side * -rand(6, 14)}deg`);
    link.classList.add("tilted");
  }
  cat.pose = "sit";
  await cat.wait(rand(900, 1600));
}

async function roommates(cat) {
  const r = Math.random();
  if (r < 0.26) {
    const p = cat.perch.rect();
    await cat.walkTo(rand(p.left, p.right));
    await cat.wait(rand(400, 1400));
  } else if (r < 0.46) {
    const to = pick(neighbours(cat.perch));
    const p = to.rect();
    await cat.goTo(to, rand(p.left, p.right));
  } else if (r < 0.6) {
    cat.pose = "sit";
    cat.el.classList.toggle("look-up", Math.random() < 0.3);
    await cat.wait(rand(2000, 4500));
    cat.el.classList.remove("look-up");
  } else if (r < 0.7) {
    cat.pose = "groom";
    await cat.wait(rand(1800, 3200));
    cat.pose = "sit";
    await cat.wait(800);
  } else if (r < 0.78) {
    if (Math.random() < 0.6) await cat.goTo(P.floor, rand(P.floor.rect().left, P.floor.rect().right));
    await napFx(cat, rand(7000, 13000));
  } else if (r < 0.9) {
    await batNav(cat);
  } else if (r < 0.95) {
    const row = buttonRow();
    if (!row.length) return;
    const b = pick(row);
    await cat.goTo(P.buttons, b.r.cx - 18);
    cat.face(b.r.cx);
    cat.pose = "paw-down";
    b.a.classList.remove("batted");
    void b.a.offsetWidth;
    b.a.classList.add("batted");
    await cat.wait(1100);
    cat.pose = "sit";
    await cat.wait(1000);
  } else {
    const o = other(cat);
    if (o.perch !== cat.perch || o.pose === "sleep") return;
    await cat.walkTo(o.x - Math.sign(o.x - cat.x || 1) * 70);
    cat.face(o.x);
    cat.pose = "wiggle";
    o.doNow(async () => { o.face(cat.x); o.pose = "crouch"; o.bubble("!"); await o.wait(900); });
    await cat.wait(800);
    const p = cat.perch.rect();
    const away = o.x > cat.x ? p.right : p.left;
    o.doNow(async () => { await o.walkTo(away, { run: true }); o.pose = "sit"; await o.wait(1200); });
    await cat.jumpTo(cat.perch, o.x);
    await cat.walkTo(away - Math.sign(away - cat.x) * 60, { run: true });
    cat.pose = "sit";
    await cat.wait(1500);
  }
}

// ---------- knock it off ----------

const fallen = [];
async function knockButton(cat) {
  const row = buttonRow();
  if (!row.length) return false;
  const b = pick(row);
  const side = Math.random() < 0.5 ? -1 : 1;
  await cat.goTo(P.buttons, b.r.cx + side * 18);
  cat.face(b.r.cx);
  const push = -side;
  cat.pose = "paw-down";
  b.a.classList.add("nudged");
  for (let i = 1; i <= 3; i++) {
    await cat.wait(rand(450, 800));
    b.a.style.transform = `translateX(${push * i * 5}px) rotate(${push * i * 2}deg)`;
    if (i === 2) { cat.pose = "sit"; cat.el.classList.add("look-up"); await cat.wait(900); cat.el.classList.remove("look-up"); cat.pose = "paw-down"; }
  }
  await cat.wait(350);
  const r = pageRect(b.a);
  const img = b.a.querySelector("img").cloneNode();
  const holder = document.createElement("div");
  holder.append(img);
  b.a.classList.add("gone");
  b.a.style.transform = "";
  const prop = new Prop(holder, { x: r.cx, y: r.top + 31, w: 88, h: 31, shelves: [P.work, P.floor] });
  prop.home = b.a;
  prop.kick(push * rand(60, 160), -rand(120, 260), push * rand(120, 360));
  fallen.push(prop);
  cat.pose = "sit";
  cat.el.classList.add("look-down");
  await cat.wait(1300);
  cat.el.classList.remove("look-down");
  cat.bubble(pick(["oops", "…", "mrrp"]));
  await cat.wait(1400);
  return true;
}

async function knockoff(cat) {
  const r = Math.random();
  if (r < 0.45) {
    if (!(await knockButton(cat))) await napFx(cat, 8000);
  } else if (r < 0.6) {
    await batNav(cat, { tilt: true });
  } else {
    await roommates(cat);
  }
}

function tidy() {
  for (const p of fallen.splice(0)) {
    const home = p.home;
    const r = pageRect(home);
    p.el.animate(
      [{ transform: p.el.style.transform }, { transform: `translate(${r.left}px, ${r.top}px) rotate(0deg)` }],
      { duration: 500, easing: "cubic-bezier(.3,1.2,.4,1)" },
    ).finished.then(() => { home.classList.remove("gone"); p.remove(); });
  }
  $$("#nav a").forEach((a) => a.classList.remove("tilted"));
}

// ---------- playtime ----------

let yarn = null;
let laser = null;

function spawnYarn() {
  yarn?.remove();
  const el = document.createElement("div");
  el.className = "yarn";
  const b = pageBounds();
  yarn = new Prop(el, { x: rand(b.left + 100, b.right - 100), y: P.header.rect().top - 240, w: 26, h: 26, roll: true, shelves: SHELVES });
  yarn.kick(rand(-120, 120), 0);
  let samples = [];
  el.addEventListener("pointerdown", (e) => {
    el.setPointerCapture(e.pointerId);
    yarn.dragging = true;
    yarn.resting = false;
    samples = [];
  });
  el.addEventListener("pointermove", (e) => {
    if (!yarn.dragging) return;
    yarn.x = e.pageX;
    yarn.y = e.pageY + 13;
    samples.push({ x: e.pageX, y: e.pageY, t: performance.now() });
    samples = samples.slice(-5);
  });
  el.addEventListener("pointerup", () => {
    yarn.dragging = false;
    const a = samples[0], z = samples.at(-1);
    const dt = a && z && z.t > a.t ? (z.t - a.t) / 1000 : 1;
    yarn.kick(a ? clamp((z.x - a.x) / dt, -1400, 1400) : 0, a ? clamp((z.y - a.y) / dt, -1600, 1600) : 0);
  });
}

function toggleLaser(btn) {
  if (laser) {
    laser.remove(); laser = null;
    document.body.classList.remove("laser-on");
    btn.setAttribute("aria-pressed", "false");
  } else {
    laser = document.createElement("div");
    laser.className = "laser-dot";
    layer.append(laser);
    document.body.classList.add("laser-on");
    btn.setAttribute("aria-pressed", "true");
  }
  cats.forEach((c) => c.interrupt());
}
addEventListener("pointermove", (e) => { if (laser) laser.style.transform = `translate(${e.pageX}px, ${e.pageY}px)`; });

const shelfUnder = (x, y) => {
  let best = null, bestD = Infinity;
  for (const s of SHELVES) {
    const r = s.rect();
    const d = r.top - y;
    if (d >= -24 && d < bestD && x >= r.left - 60 && x <= r.right + 60) { best = s; bestD = d; }
  }
  return best ?? P.floor;
};

async function chase(cat, getTarget, { lazy }) {
  const t = getTarget();
  if (!t) return false;
  if (Math.random() < lazy) {
    cat.pose = "sit";
    await cat.frames((dt) => { const g = getTarget(); if (g) { cat.face(g.x); cat.lookAt(g.x - scrollX, g.y - scrollY); } return Math.random() < dt / 2; });
    return true;
  }
  const s = t.perch;
  if (s !== cat.perch) {
    await cat.goTo(s, t.x, { run: true });
    return true;
  }
  let reached = false;
  cat.pose = "run";
  await cat.frames((dt) => {
    const g = getTarget();
    if (!g || g.perch !== cat.perch) return true;
    const r = cat.perch.rect();
    const dx = clamp(g.x, r.left, r.right) - (cat.x + cat.dir * 18);
    if (Math.abs(dx) < 10) { reached = true; return true; }
    cat.dir = Math.sign(dx);
    cat.x += cat.dir * Math.min(Math.abs(dx), 250 * dt);
    return false;
  });
  cat.pose = "stand";
  if (!reached) return true;
  cat.pose = "wiggle";
  await cat.wait(rand(250, 600));
  return "pounce";
}

async function playtime(cat) {
  const lazy = cat === gray ? 0.45 : 0.15;
  if (laser && pointer.active) {
    const res = await chase(cat, () => ({ x: pointer.x, y: pointer.y, perch: shelfUnder(pointer.x, pointer.y) }), { lazy: lazy * 0.5 });
    if (res === "pounce") {
      await cat.jumpTo(cat.perch, pointer.x);
      if (Math.random() < 0.3) cat.bubble("!");
    }
    return;
  }
  if (yarn && !yarn.dragging && yarn.perch) {
    const res = await chase(cat, () => (yarn && yarn.perch && !yarn.dragging ? { x: yarn.x, y: yarn.y, perch: yarn.perch } : null), { lazy });
    if (res === "pounce") {
      cat.pose = "bat";
      await cat.wait(180);
      yarn.kick(cat.dir * rand(220, 520), -rand(180, 520));
      await cat.wait(200);
      cat.pose = "stand";
    }
    if (res) return;
  }
  if (yarn) {
    cat.pose = "sit";
    await cat.frames((dt) => { if (yarn) cat.lookAt(yarn.x - scrollX, yarn.y - scrollY); return Math.random() < dt; });
    return;
  }
  await roommates(cat);
}

// ---------- peekaboo ----------

const PEEK_SPOTS = [P.header, P.work, P.friends, P.floor];
const hidden = (c) => c.h;
const earsOnly = (c) => c.h * 0.8;
const eyes = (c) => c.h * 0.5;

async function clipTo(cat, depth, ms) {
  const d0 = cat.clipDepth;
  let t = 0;
  await cat.frames((dt) => {
    t = Math.min(1, t + (dt * 1000) / ms);
    const e = 1 - (1 - t) ** 3;
    cat.clipDepth = d0 + (depth - d0) * e;
    return t >= 1;
  });
}

const near = (cat, d = 110) => {
  const r = cat.el.getBoundingClientRect();
  return Math.hypot(pointer.x - scrollX - (r.left + r.width / 2), pointer.y - scrollY - (r.top + r.height / 2)) < d;
};

async function peekaboo(cat) {
  cat.pose = "sit";
  if (cat.clipDepth < hidden(cat) - 1) await clipTo(cat, hidden(cat), 260);
  const taken = other(cat).perch;
  const spot = pick(PEEK_SPOTS.filter((s) => s !== taken));
  const r = spot.rect();
  const mid = (r.left + r.right) / 2;
  const x = spot === P.header || spot === P.floor ? rand(r.left, r.right) : rand(mid, r.right);
  cat.perch = spot;
  cat.x = x;
  cat.dir = x > mid ? -1 : 1;
  await cat.wait(rand(1200, 3500));
  await clipTo(cat, earsOnly(cat), 600);
  await cat.wait(rand(800, 1800));
  if (near(cat, 160)) return;
  await clipTo(cat, eyes(cat), 500);
  let stay = rand(2500, 6000), ducked = false;
  await cat.frames((dt) => {
    stay -= dt * 1000;
    cat.lookAt(pointer.x - scrollX, pointer.y - scrollY);
    if (near(cat)) { ducked = true; return true; }
    return stay <= 0;
  });
  if (ducked) { cat.bubble("!", 700); await clipTo(cat, hidden(cat), 140); await cat.wait(1600); }
}

function peekPet(cat) {
  return cat.doNow(async () => {
    await clipTo(cat, 0, 300);
    cat.pose = "sit";
    cat.el.classList.add("happy");
    cat.hearts();
    cat.bubble("mrrp");
    try { await cat.wait(2600); } finally { cat.el.classList.remove("happy"); }
  });
}

// ---------- boot ----------

const tabs = $("#tabs");
for (const [key, note] of Object.entries(CONCEPTS)) {
  const b = document.createElement("button");
  b.textContent = note.split(":")[0];
  b.setAttribute("aria-pressed", String(key === concept));
  b.addEventListener("click", () => go(key, style));
  tabs.append(b);
}
const styles = $("#styles");
for (const [key, label] of Object.entries(STYLES)) {
  const b = document.createElement("button");
  b.textContent = label;
  b.setAttribute("aria-pressed", String(key === style));
  b.addEventListener("click", () => go(concept, key));
  styles.append(b);
}
$("#note").textContent = CONCEPTS[concept].split(": ")[1];

const actions = $("#actions");
const action = (label, fn) => {
  const b = document.createElement("button");
  b.textContent = label;
  b.addEventListener("click", () => fn(b));
  actions.append(b);
};

await document.fonts.ready;
await delay(100);

tabby.place(P.header, P.header.rect().left + 60);
gray.place(P.floor, P.floor.rect().right - 60);

if (reducedMotion) {
  tabby.pose = "sit";
  gray.pose = "sleep";
} else if (concept === "roommates") {
  cats.forEach((c) => c.run(roommates));
} else if (concept === "knockoff") {
  action("Tidy up", tidy);
  cats.forEach((c) => c.run(knockoff));
} else if (concept === "playtime") {
  action("New yarn", () => spawnYarn());
  action("Laser pointer", toggleLaser);
  spawnYarn();
  cats.forEach((c) => c.run(playtime));
} else if (concept === "peekaboo") {
  for (const c of cats) c.clipDepth = c.h;
  cats.forEach((c) => c.run(peekaboo));
}
