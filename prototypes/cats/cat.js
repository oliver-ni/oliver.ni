// Tiny cat engine for the prototypes: SVG sprites, perches, walking, jumping.
import { frame, PX } from "./pixel.js";

export const INTERRUPT = Symbol("interrupt");

export const COATS = {
  tabby: {
    line: "#231d1a", fur: "#7d6d5e", shade: "#625548", stripe: "#2e2724", white: "#f7f2eb", belly: "#d9c3a5",
    paw: "#7d6d5e", ear: "#d9a3a3", eye: "#231d1a", nose: "#d9918c", backSocks: true, dotEyes: true,
  },
  gray: {
    line: "#2b2b31", fur: "#8f96a1", shade: "#727985", stripe: null, white: "#fbfaf7",
    paw: "#fbfaf7", ear: "#eeaab0", eye: "#f0bd3c", nose: "#eba1a8", dotEyes: false,
  },
};

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const rand = (lo, hi) => lo + Math.random() * (hi - lo);
export const pick = (xs) => xs[Math.floor(Math.random() * xs.length)];
export const delay = (ms) => new Promise((r) => setTimeout(r, ms));
export const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

export const layer = document.createElement("div");
layer.id = "cat-layer";
document.body.append(layer);

export function perch(el, { inset = 12, offset = 0, name } = {}) {
  return {
    el,
    name: name ?? el.dataset.perch ?? "perch",
    rect() {
      const r = el.getBoundingClientRect();
      return {
        left: r.left + scrollX + inset,
        right: r.right + scrollX - inset,
        top: r.top + scrollY + offset,
      };
    },
  };
}

export function pageRect(el) {
  const r = el.getBoundingClientRect();
  return {
    left: r.left + scrollX, right: r.right + scrollX,
    top: r.top + scrollY, bottom: r.bottom + scrollY,
    cx: r.left + scrollX + r.width / 2, width: r.width, height: r.height,
  };
}

let uid = 0;
const S = `stroke="var(--line)" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
const fatStroke = (d, color, ring) => `
  <path d="${d}" fill="none" stroke="var(--line)" stroke-width="10.2" stroke-linecap="round"/>
  <path d="${d}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"/>
  ${ring ? `<path d="${d}" fill="none" stroke="var(--stripe)" stroke-width="5" stroke-dasharray="3 4.5" stroke-dashoffset="-2"/>` : ""}`;

function head(c, id, { dx = 0, dy = 0 } = {}) {
  const hc = `h${id}-${dx}`;
  const eyes = c.dotEyes
    ? `<circle class="pupil" cx="63" cy="29" r="2.4" fill="var(--line)"/><circle class="pupil" cx="77" cy="29" r="2.4" fill="var(--line)"/>`
    : `<circle cx="63" cy="29" r="3.3" fill="var(--eye)" stroke="var(--line)" stroke-width="1.5"/>
       <circle cx="77" cy="29" r="3.3" fill="var(--eye)" stroke="var(--line)" stroke-width="1.5"/>
       <circle class="pupil" cx="63" cy="29" r="1.3" fill="var(--line)"/><circle class="pupil" cx="77" cy="29" r="1.3" fill="var(--line)"/>`;
  const marks = c.stripe
    ? `<path d="M64.5 16.5v5.5M70 15.5v6.5M75.5 16.5v5.5M50 28h5M50.5 33h5M85 28h5M84.5 33h5" stroke="var(--stripe)" stroke-width="3" stroke-linecap="round"/>
       <path d="M59.5 35C60.5 30.8 65.5 31 70 32.8 74.5 31 79.5 30.8 80.5 35 82 40.5 77.5 45 70 45S58 40.5 59.5 35z" fill="var(--white)"/>`
    : `<path d="M70 17C67.5 23 64 27 59 31.5 56 36 58 44.5 70 44.5S84 36 81 31.5C76 27 72.5 23 70 17z" fill="var(--white)"/>`;
  return `<g class="head" transform="translate(${dx} ${dy})"><g class="head-tilt">
    <clipPath id="${hc}"><ellipse cx="70" cy="30" rx="19" ry="14.5"/></clipPath>
    <path d="M52.5 25 53.3 9.8c.1-1.8 1.6-2.4 3-1.5L67 16z" fill="var(--fur)" ${S}/>
    <path d="M73 16l10.7-7.7c1.4-.9 2.9-.3 3 1.5L87.5 25z" fill="var(--fur)" ${S}/>
    <path d="M56.2 12.6l.6 6.6 5-3.1zM83.8 12.6l-.6 6.6-5-3.1z" fill="var(--ear)"/>
    <ellipse cx="70" cy="30" rx="19" ry="14.5" fill="var(--fur)"/>
    <g clip-path="url(#${hc})">${marks}</g>
    <ellipse cx="70" cy="30" rx="19" ry="14.5" fill="none" ${S}/>
    <g class="eye-open">${eyes}</g>
    <path class="eye-closed" d="M59.5 29.5h6.5M74 29.5h6.5" stroke="var(--line)" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M68.4 32.4h3.2l-1.6 1.8z" fill="var(--nose)" stroke="var(--line)" stroke-width="1" stroke-linejoin="round"/>
    <path d="M66.3 34.6q1.85 2.3 3.7 0 1.85 2.3 3.7 0" fill="none" stroke="var(--line)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </g></g>`;
}

function leg(x, cls, c, { y = 43, h = 18 } = {}) {
  const far = cls.includes("far");
  const sock = cls.includes("back") && c.backSocks;
  const paw = sock ? "var(--white)" : "var(--paw)";
  return `<g class="leg ${cls}">
    <rect x="${x}" y="${y}" width="9" height="${h}" rx="4.5" fill="${far ? "var(--shade)" : "var(--fur)"}"/>
    ${far && !sock ? "" : `<rect x="${x}" y="${y + h - 7}" width="9" height="7" rx="3.5" fill="${paw}"${far ? ' opacity=".85"' : ""}/>`}
    <rect x="${x}" y="${y}" width="9" height="${h}" rx="4.5" fill="none" ${S}/>
  </g>`;
}

export function catSVG(c) {
  const id = ++uid;
  const bodyMarks = c.stripe
    ? `<ellipse cx="50" cy="56" rx="24" ry="7" fill="var(--belly)"/><path d="M33 29q3.5 6 .5 12M41.5 27.5q3.5 7 .5 13M50 27.5q3.5 7 .5 13" stroke="var(--stripe)" stroke-width="3.4" fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="54" cy="55" rx="24" ry="9" fill="var(--white)"/>`;
  const sitMarks = c.stripe
    ? `<ellipse cx="50" cy="55" rx="9" ry="10" fill="var(--belly)"/><ellipse cx="50" cy="37" rx="7" ry="6" fill="var(--white)"/><path d="M34 44q5 .5 7.5 4M33.5 51.5q5 .5 7.5 4M66 44q-5 .5-7.5 4M66.5 51.5q-5 .5-7.5 4" stroke="var(--stripe)" stroke-width="3" fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="50" cy="52" rx="11" ry="14" fill="var(--white)"/>`;
  const loafMarks = c.stripe
    ? `<ellipse cx="50" cy="62" rx="26" ry="6" fill="var(--belly)"/><path d="M27 42q3 5 .5 10M36 39.5q3 6 .5 11M45 39q3 6 .5 11" stroke="var(--stripe)" stroke-width="3.2" fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="50" cy="62" rx="26" ry="8" fill="var(--white)"/>`;
  return `<svg viewBox="0 0 100 64" overflow="visible" aria-hidden="true">
  <defs>
    <clipPath id="b${id}"><ellipse cx="46" cy="41" rx="24" ry="14"/></clipPath>
    <clipPath id="s${id}"><path d="M33 61C29 46 37 34 50 34s21 12 17 27z"/></clipPath>
    <clipPath id="l${id}"><ellipse cx="44" cy="50" rx="27" ry="12"/></clipPath>
  </defs>
  <g class="p-stand"><g class="bob">
    <g class="tail">${fatStroke("M27 39C16 35 13 23 17.5 13", "var(--fur)", !!c.stripe)}</g>
    ${leg(27, "back far b", c)}
    ${leg(59, "front far a", c)}
    <g class="torso">
      <ellipse cx="46" cy="41" rx="24" ry="14" fill="var(--fur)"/>
      <g clip-path="url(#b${id})">${bodyMarks}</g>
      <ellipse cx="46" cy="41" rx="24" ry="14" fill="none" ${S}/>
    </g>
    ${leg(34, "back near a", c)}
    ${leg(51, "front near b", c)}
    ${head(c, id)}
  </g></g>
  <g class="p-sit">
    <g class="tail">${fatStroke("M62 59.5C77 60.5 81 49 75.5 41", "var(--fur)", !!c.stripe)}</g>
    <path d="M33 61C29 46 37 34 50 34s21 12 17 27z" fill="var(--fur)"/>
    <g clip-path="url(#s${id})">${sitMarks}</g>
    <path d="M33 61C29 46 37 34 50 34s21 12 17 27z" fill="none" ${S}/>
    <path d="M45 51.5v9M55 51.5v9" stroke="var(--line)" stroke-width="2.4" stroke-linecap="round"/>
    ${c.backSocks ? `<ellipse cx="34" cy="59.5" rx="5.5" ry="3" fill="var(--white)" ${S}/><ellipse cx="66" cy="59.5" rx="5.5" ry="3" fill="var(--white)" ${S}/>` : ""}
    ${head(c, id, { dx: -20, dy: -5 })}
    <g class="groom-paw"><rect x="51" y="32" width="9" height="15" rx="4.5" fill="var(--paw)" ${S}/></g>
  </g>
  <g class="p-sleep"><g class="breathe">
    <ellipse cx="44" cy="50" rx="27" ry="12" fill="var(--fur)"/>
    <g clip-path="url(#l${id})">${loafMarks}</g>
    <ellipse cx="44" cy="50" rx="27" ry="12" fill="none" ${S}/>
    ${fatStroke("M19 53C22 63.5 52 64 66 59.5", "var(--fur)", !!c.stripe)}
    ${head(c, id, { dx: -5, dy: 14 })}
    <ellipse cx="57" cy="59.5" rx="4.6" ry="3" fill="var(--paw)" ${S}/>
    <ellipse cx="68" cy="59.5" rx="4.6" ry="3" fill="var(--paw)" ${S}/>
  </g></g>
</svg>`;
}

export class Cat {
  constructor({ name, coat, style = "atsume", scale, x = 100 }) {
    this.name = name;
    this.coatName = coat;
    this.coat = COATS[coat];
    this.style = style;
    this.pixel = style === "pixel";
    this.scale = scale ?? (this.pixel ? 3 : 0.9);
    this.w = (this.pixel ? PX.w : 100) * this.scale;
    this.h = (this.pixel ? PX.h : 64) * this.scale;
    this.x = x;
    this.y = 0;
    this.dir = 1;
    this.token = 0;
    this.busy = Promise.resolve();
    this.airborne = false;
    this.clipDepth = 0;

    const el = document.createElement("div");
    el.className = "cat";
    el.style.width = `${this.w}px`;
    el.style.height = `${this.h}px`;
    for (const [k, v] of Object.entries(this.coat)) if (v) el.style.setProperty(`--${k}`, v);
    el.classList.add(`cat-${style}`);
    const art = this.pixel ? `<canvas width="${PX.w}" height="${PX.h}"></canvas>` : catSVG(this.coat);
    el.innerHTML = `<div class="cat-flip">${art}</div><div class="cat-fx"></div>`;
    el.title = name;
    this.el = el;
    this.flip = el.querySelector(".cat-flip");
    this.fx = el.querySelector(".cat-fx");
    this.svg = el.querySelector("svg");
    this.canvas = el.querySelector("canvas");
    this.t0 = rand(0, 10);
    layer.append(el);
    this.pose = "stand";
    Cat.all.push(this);
  }

  get pose() { return this._pose; }
  set pose(p) {
    if (this._pose === p) return;
    this._pose = p;
    this.el.dataset.pose = p;
  }

  place(p, x) {
    this.perch = p;
    const r = p.rect();
    this.x = clamp(x ?? rand(r.left, r.right), r.left, r.right);
    this.y = r.top;
    this.render();
    return this;
  }

  render() {
    this.el.style.transform = `translate(${this.x - this.w / 2}px, ${this.y - this.h + this.clipDepth}px)`;
    this.flip.style.transform = this.dir < 0 ? "scaleX(-1)" : "";
    this.el.style.clipPath = this.clipDepth
      ? `inset(-40px -40px ${this.clipDepth}px -40px)`
      : "";
  }

  frames(step) {
    const t = this.token;
    return new Promise((resolve, reject) => {
      let last = performance.now();
      const f = (now) => {
        if (t !== this.token) return reject(INTERRUPT);
        const dt = Math.min(50, now - last) / 1000;
        last = now;
        let done;
        try { done = step(dt); } catch (e) { return reject(e); }
        this.render();
        if (done) resolve(); else requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    });
  }

  wait(ms) {
    let e = 0;
    return this.frames((dt) => (e += dt * 1000) >= ms);
  }

  async walkTo(target, { run = false, stopAt = 3, speed } = {}) {
    const v = speed ?? (run ? 240 : 64);
    this.pose = run ? "run" : "walk";
    await this.frames((dt) => {
      const r = this.perch.rect();
      const tx = clamp(typeof target === "function" ? target() : target, r.left, r.right);
      const dx = tx - this.x;
      if (Math.abs(dx) <= stopAt) return true;
      this.dir = Math.sign(dx);
      this.x += Math.sign(dx) * Math.min(Math.abs(dx), v * dt);
      return false;
    });
    this.pose = "stand";
  }

  async jumpTo(p, x) {
    const r = p.rect();
    const tx = clamp(x, r.left, r.right);
    if (Math.abs(tx - this.x) > 2) this.dir = Math.sign(tx - this.x);
    this.pose = "crouch";
    await this.wait(220);
    this.pose = "jump";
    this.airborne = true;
    const x0 = this.x, y0 = this.y;
    const dur = 360 + Math.abs(r.top - y0) * 0.9 + Math.abs(tx - x0) * 0.6;
    let t = 0;
    try {
      await this.frames((dt) => {
        t = Math.min(1, t + (dt * 1000) / dur);
        const r2 = p.rect();
        const x1 = clamp(x, r2.left, r2.right), y1 = r2.top;
        const yc = Math.min(y0, y1) - 45;
        this.x = x0 + (x1 - x0) * t;
        this.y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * yc + t * t * y1;
        return t >= 1;
      });
    } finally {
      this.airborne = false;
      this.perch = p;
    }
    this.pose = "crouch";
    await this.wait(140);
    this.pose = "stand";
  }

  async goTo(p, x, opts) {
    if (p !== this.perch) {
      const cur = this.perch.rect(), r = p.rect();
      const tx = clamp(x, r.left, r.right);
      const launch = clamp(tx, cur.left, cur.right);
      if (Math.abs(launch - this.x) > 3) await this.walkTo(launch, opts);
      await this.jumpTo(p, this.x + clamp(tx - this.x, -170, 170));
    }
    await this.walkTo(x, opts);
  }

  face(x) { if (Math.abs(x - this.x) > 1) { this.dir = Math.sign(x - this.x); this.render(); } }

  interrupt() { this.token++; }

  doNow(fn) {
    this.interrupt();
    this.busy = fn().catch((e) => { if (e !== INTERRUPT) console.error(e); });
    return this.busy;
  }

  async run(brain) {
    this.brain = brain;
    for (;;) {
      await this.busy;
      try { await brain(this); }
      catch (e) {
        if (e !== INTERRUPT) { console.error(e); await delay(800); }
        await delay(0);
      }
    }
  }

  bubble(text, ms = 1600) {
    const b = document.createElement("div");
    b.className = "cat-bubble";
    b.textContent = text;
    this.fx.append(b);
    setTimeout(() => b.remove(), ms);
  }

  hearts(n = 3) {
    for (let i = 0; i < n; i++) {
      const h = document.createElement("div");
      h.className = "cat-heart";
      h.textContent = "♥";
      h.style.left = `${40 + rand(-18, 18)}%`;
      h.style.animationDelay = `${i * 160}ms`;
      this.fx.append(h);
      setTimeout(() => h.remove(), 1600 + i * 160);
    }
  }

  draw(now) {
    if (!this.pixel) return;
    const closed = this.el.classList.contains("blink") || this.el.classList.contains("happy");
    const img = frame(this.coatName, this.pose, now / 1000 + this.t0, closed);
    if (img === this.shown) return;
    this.shown = img;
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, PX.w, PX.h);
    ctx.drawImage(img, 0, 0);
  }

  lookAt(px, py) {
    if (this.pixel) return;
    const eye = this.svg.querySelectorAll(".pupil");
    const r = this.el.getBoundingClientRect();
    const cx = r.left + r.width * 0.75, cy = r.top + r.height * 0.3;
    let dx = (px - cx) * (this.dir < 0 ? -1 : 1), dy = py - cy;
    const d = Math.hypot(dx, dy) || 1;
    dx = (dx / d) * 1.1; dy = (dy / d) * 0.8;
    eye.forEach((e) => e.setAttribute("transform", `translate(${dx} ${dy})`));
  }
}
Cat.all = [];

function tick(now) {
  for (const c of Cat.all) {
    c.draw(now ?? performance.now());
    if (!c.airborne && c.perch) {
      const r = c.perch.rect();
      c.y = r.top;
      c.x = clamp(c.x, r.left, r.right);
      c.render();
    }
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

setInterval(() => {
  for (const c of Cat.all) {
    if (Math.random() < 0.5) continue;
    c.el.classList.add("blink");
    setTimeout(() => c.el.classList.remove("blink"), 140);
  }
}, 2200);
