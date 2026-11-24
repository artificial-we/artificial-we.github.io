/* Artificial We — delegation field.
   WE = a principal (a person or a collective: a household, a team, a community).
   A  = an agent. Big A's are direct delegates; smaller A's are sub-agents, one level of
        sub-delegation per split.
   H  = a human called back in: where mandates overlap, agents escalate instead of
        deciding alone.
   Hero: a quadtree mosaic of agent tiles that keeps merging and splitting as mandate
   shapes morph. Hover: the cursor is a WE. Click: jump to the content.
   Bands: two waves of agents pass through each other; where they meet, H. */
(function () {
  "use strict";

  const css = getComputedStyle(document.documentElement);
  const C = {
    human: css.getPropertyValue("--human").trim() || "#e8432a",
    agent: css.getPropertyValue("--agent").trim() || "#2b3bf0",
    we: css.getPropertyValue("--ink").trim() || "#12142e",
    faint: css.getPropertyValue("--dot").trim() || "#cdd0dd",
  };
  const FONT = '"Archivo", "Arial Narrow", Arial, sans-serif';
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const TAU = Math.PI * 2;

  const smooth = (e0, e1, x) => {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };

  function setFont(g, size, weight) {
    g.font = `${weight || 800} ${size}px ${FONT}`;
    if ("fontStretch" in g) g.fontStretch = "condensed";
  }

  // Pre-render a glyph once at full cell size; tiles draw scaled copies of it.
  function glyph(text, color, w, h, weight) {
    const c = document.createElement("canvas");
    c.width = Math.ceil(w * DPR); c.height = Math.ceil(h * DPR);
    const g = c.getContext("2d");
    g.scale(DPR, DPR);
    g.fillStyle = color;
    g.textAlign = "center";
    g.textBaseline = "alphabetic";
    let size = h * 1.3;
    setFont(g, size, weight);
    let m = g.measureText(text);
    size *= Math.min(1, (w * 0.96) / m.width);
    setFont(g, size, weight);
    m = g.measureText(text);
    const asc = m.actualBoundingBoxAscent || size * 0.72;
    g.translate(w / 2, h * 0.5 + asc / 2);
    g.fillText(text, 0, 0);
    return c;
  }

  function pill(g, x, y, w, h) {
    const r = h / 2;
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function sizeCanvas(canvas) {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.round(r.width * DPR);
    canvas.height = Math.round(r.height * DPR);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    return { ctx, W: r.width, H: r.height };
  }

  function onVisible(el, cb) {
    if (!("IntersectionObserver" in window)) return cb(true);
    new IntersectionObserver((es) => es.forEach((e) => cb(e.isIntersecting))).observe(el);
  }

  // Draw a centered tile at scale s (0..1) of the cell.
  function tile(ctx, img, cx, cy, w, h, s) {
    const tw = w * s, th = h * s;
    ctx.drawImage(img, cx - tw / 2, cy - th / 2, tw, th);
  }

  /* ---------------- Hero ----------------
     A quadtree of agent tiles, in the manner of a mosaic that keeps re-dividing.
     Near a principal (red WE), agents are large: direct delegates with broad authority.
     Further out, tiles split into smaller and smaller A's: sub-delegation, agent to
     sub-agent. Where two principals' mandates overlap, agents escalate to people: H.
     Mandate shapes morph between diamond, circle and square, so the field keeps
     merging and splitting. Hover: the cursor is a WE with its own mandate.
     Click: scroll down to the content. */
  function fillGlyph(text, color, w, h) {
    // Stretch a glyph to fill its whole tile (wide, squat letters), with a small gap.
    const c = document.createElement("canvas");
    c.width = Math.ceil(w * DPR); c.height = Math.ceil(h * DPR);
    const g = c.getContext("2d");
    g.scale(DPR, DPR);
    setFont(g, 100, 900);
    const m = g.measureText(text);
    const asc = m.actualBoundingBoxAscent || 72, desc = m.actualBoundingBoxDescent || 0;
    const gw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight || m.width;
    const pad = 0.08;
    g.translate(w * pad / 2, h * pad / 2);
    g.scale((w * (1 - pad)) / gw, (h * (1 - pad)) / (asc + desc));
    g.fillStyle = color;
    g.textBaseline = "alphabetic";
    g.fillText(text, m.actualBoundingBoxLeft || 0, asc);
    return c;
  }

  function hero(canvas) {
    let ctx, W, H, BW, BH, R, G, running = false, raf = 0;
    const t0 = performance.now();
    const pointer = { x: 0, y: 0, w: 0, target: 0 };

    const people = [
      { cx: 0.56, cy: 0.30, ax: 0.10, ay: 0.12, fx: 0.031, fy: 0.043, p: 0.0 },
      { cx: 0.82, cy: 0.30, ax: 0.10, ay: 0.12, fx: 0.039, fy: 0.027, p: 2.1 },
      { cx: 0.76, cy: 0.62, ax: 0.10, ay: 0.08, fx: 0.023, fy: 0.035, p: 4.2 },
    ];

    function layout() {
      ({ ctx, W, H } = sizeCanvas(canvas));
      const narrow = W < 700;
      BW = narrow ? 56 : 88;          // largest tile
      BH = narrow ? 38 : 58;
      R = Math.min(W, H) * (narrow ? 0.42 : 0.4);
      G = {
        A: fillGlyph("A", C.agent, BW, BH),
        H: fillGlyph("H", C.human, BW, BH),
        we: glyph("WE", "#ffffff", 40, 26, 900),
      };
    }

    function principals(t) {
      const P = people.map((p, n) => ({
        x: W * (p.cx + p.ax * Math.sin(t * p.fx * TAU + p.p)),
        y: H * (p.cy + p.ay * Math.sin(t * p.fy * TAU + p.p * 1.7)),
        r: R * (1 + 0.12 * Math.sin(t * 0.37 + n * 2.3)),
        w: 1,
        // Each mandate's shape morphs: p=1 diamond, p=2 circle, p>2 towards a square.
        norm: 2 + 1.5 * Math.sin(t * 0.22 + n * 2.1),
        rot: 0.4 * Math.sin(t * 0.13 + n),
      }));
      if (pointer.w > 0.01) P.push({ x: pointer.x, y: pointer.y, r: R * 0.6, w: pointer.w, norm: 2, rot: 0, you: true });
      return P;
    }

    // Mandate strength at a point: how far each principal's delegation reaches here.
    function sample(x, y, P, t) {
      // Gentle warp so edges ripple rather than staying geometric.
      const wx = x + 22 * Math.sin(y * 0.012 + t * 0.6);
      const wy = y + 22 * Math.cos(x * 0.010 - t * 0.5);
      let best = 0, count = 0;
      for (let n = 0; n < P.length; n++) {
        const p = P[n];
        let dx = wx - p.x, dy = wy - p.y;
        const c = Math.cos(p.rot), s = Math.sin(p.rot);
        const rx = Math.abs(dx * c - dy * s), ry = Math.abs(dx * s + dy * c);
        const d = Math.pow(Math.pow(rx, p.norm) + Math.pow(ry * 1.25, p.norm), 1 / p.norm);
        const m = p.w * Math.max(0, 1 - d / p.r);
        if (m > 0.18) count += p.w;
        if (m > best) best = m;
      }
      return { f: best, overlap: count > 1.2 };
    }

    // Level 0 = one big tile; each level splits a tile into four.
    function levelFor(f) {
      if (f > 0.72) return 0;
      if (f > 0.48) return 1;
      if (f > 0.26) return 2;
      if (f > 0.08) return 3;
      return 4;
    }

    function cell(x, y, w, h, lvl, P, t, dots) {
      const smp = sample(x + w / 2, y + h / 2, P, t);
      const want = levelFor(smp.f);
      if (want > lvl && lvl < 3) {
        const hw = w / 2, hh = h / 2;
        cell(x, y, hw, hh, lvl + 1, P, t, dots);
        cell(x + hw, y, hw, hh, lvl + 1, P, t, dots);
        cell(x, y + hh, hw, hh, lvl + 1, P, t, dots);
        cell(x + hw, y + hh, hw, hh, lvl + 1, P, t, dots);
        return;
      }
      if (want === 4) {
        // Agents nobody has delegated to: a faint speck.
        dots.rect(x + w / 2 - 1.2, y + h / 2 - 1.2, 2.4, 2.4);
        return;
      }
      ctx.drawImage(smp.overlap ? G.H : G.A, x, y, w, h);
    }

    function frame(now) {
      const t = reduceMotion ? 30 : (now - t0) / 1000;
      pointer.w += (pointer.target - pointer.w) * 0.12;
      const P = principals(t);
      ctx.clearRect(0, 0, W, H);

      const dots = new Path2D();
      const cols = Math.ceil(W / BW), rows = Math.ceil(H / BH);
      const ox = (W - cols * BW) / 2, oy = (H - rows * BH) / 2;
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++)
          cell(ox + i * BW, oy + j * BH, BW, BH, 0, P, t, dots);
      ctx.fillStyle = C.faint;
      ctx.fill(dots);

      // Principals: red WE badges. The visitor's badge is their cursor.
      P.forEach((p) => {
        ctx.globalAlpha = p.w;
        ctx.fillStyle = C.human;
        pill(ctx, p.x - 30, p.y - 17, 60, 34); ctx.fill();
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3;
        pill(ctx, p.x - 30, p.y - 17, 60, 34); ctx.stroke();
        ctx.drawImage(G.we, p.x - 20, p.y - 13, 40, 26);
      });
      ctx.globalAlpha = 1;

      if (running && !reduceMotion) raf = requestAnimationFrame(frame);
    }

    const start = () => { if (!running) { running = true; raf = requestAnimationFrame(frame); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    canvas.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.target = 1;
      if (reduceMotion) { pointer.w = 1; frame(performance.now()); }
    });
    canvas.addEventListener("pointerleave", () => {
      pointer.target = 0;
      if (reduceMotion) { pointer.w = 0; frame(performance.now()); }
    });
    // Click: go straight to the content, as a cover page would.
    canvas.addEventListener("click", () => {
      const next = document.getElementById("about");
      if (next) next.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    });

    layout();
    if (reduceMotion) frame(0);
    onVisible(canvas, (v) => (v ? start() : stop()));
    return { relayout() { layout(); if (!running || reduceMotion) frame(performance.now()); } };
  }

  /* ---------------- Bands: a wave of H and a wave of A ---------------- */
  function band(canvas) {
    let ctx, W, H, cw, ch, G, running = false, raf = 0;
    const t0 = performance.now();

    function layout() {
      ({ ctx, W, H } = sizeCanvas(canvas));
      cw = W < 700 ? 14 : 17;
      ch = W < 700 ? 15 : 18;
      G = { H: glyph("H", C.human, cw, ch, 900), A: glyph("A", C.agent, cw, ch) };
    }

    function frame(now) {
      const t = reduceMotion ? 6 : (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      const cols = Math.ceil(W / cw) + 1, rows = Math.ceil(H / ch);
      const offY = (H - rows * ch) / 2 + ch / 2;
      const faint = new Path2D();
      for (let j = 0; j < rows; j++) {
        const y = offY + j * ch;
        const v = y / H;
        for (let i = 0; i < cols; i++) {
          const x = i * cw + (j % 2 ? cw / 2 : 0);
          const u = x / W;
          const h = smooth(0.45, 1, 0.5 + 0.5 * Math.sin(u * 9 - t * 0.9 + Math.sin(v * 3 + t * 0.3) * 1.2));
          const a = smooth(0.45, 1, 0.5 + 0.5 * Math.sin(u * 7 + t * 1.2 - v * 4 + 2));
          // Two principals' waves of agents; where they cross, a human is called in.
          if (h > 0.35 && a > 0.35) tile(ctx, G.H, x, y, cw, ch, 0.6 + 0.4 * Math.min(h, a));
          else if (h < 0.05 && a < 0.05) { faint.moveTo(x + 1.2, y); faint.arc(x, y, 1.2, 0, TAU); }
          else tile(ctx, G.A, x, y, cw, ch, 0.2 + 0.75 * Math.max(h, a));
        }
      }
      ctx.fillStyle = C.faint;
      ctx.fill(faint);
      if (running && !reduceMotion) raf = requestAnimationFrame(frame);
    }

    const start = () => { if (!running) { running = true; raf = requestAnimationFrame(frame); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    layout();
    if (reduceMotion) frame(0);
    onVisible(canvas, (v) => (v ? start() : stop()));
    return { relayout() { layout(); if (!running || reduceMotion) frame(performance.now()); } };
  }

  function init() {
    const all = [];
    const h = document.getElementById("field");
    if (h) all.push(hero(h));
    document.querySelectorAll("canvas.band").forEach((c) => all.push(band(c)));
    let to;
    window.addEventListener("resize", () => { clearTimeout(to); to = setTimeout(() => all.forEach((i) => i.relayout()), 150); });
  }

  const ready = document.fonts && document.fonts.load
    ? Promise.all([document.fonts.load('800 condensed 20px "Archivo"'), document.fonts.ready]).catch(() => {})
    : Promise.resolve();
  ready.then(init);
})();
