'use strict';

(function heroCanvas() {
  const canvas = document.getElementById('hero-canvas');
  const ctx    = canvas.getContext('2d');

  // ── Constants ───────────────────────────────────────────────
  const ACCENT_HSL     = '26, 13%, ';
  const N_LINES        = 26;   // iso-contour lines to draw
  const N_NODES        = 28;   // drifting data-point nodes
  const NODE_LINK_DIST = 120;  // max px distance to connect nodes
  const SCALE          = 0.0018; // spatial frequency of the noise field
  const COLS           = 180;  // horizontal samples per contour pass
  const ROWS           = 80;   // vertical samples per contour pass
  const TIME_STEP      = 0.006; // animation speed

  let t   = 0;
  let raf = null;
  const nodes = [];

  // ── Noise field ─────────────────────────────────────────────
  // Layered sine/cosine functions that approximate a smooth 2-D field.
  // Returns a value in approximately [-1, 1].
  function field(x, y, time) {
    return (
      Math.sin(x * SCALE * 1.4 + time * 0.18) * Math.cos(y * SCALE * 1.9 + time * 0.11) +
      Math.sin(x * SCALE * 3.1 - time * 0.22 + y * SCALE * 1.2) * 0.55 +
      Math.cos(x * SCALE * 0.8 + y * SCALE * 2.6 + time * 0.08) * 0.35 +
      Math.sin(x * SCALE * 4.5 + time * 0.30 - y * SCALE * 0.9) * 0.20
    ) / 2.1;
  }

  function lerp(a, b, f) { return a + (b - a) * f; }

  // ── Nodes ────────────────────────────────────────────────────
  function initNodes(w, h) {
    nodes.length = 0;
    for (let i = 0; i < N_NODES; i++) {
      nodes.push({
        x:       Math.random() * w,
        y:       Math.random() * h,
        vx:      (Math.random() - 0.5) * 0.25,
        vy:      (Math.random() - 0.5) * 0.25,
        r:       Math.random() * 1.5 + 0.6,
        opacity: Math.random() * 0.3 + 0.1,
      });
    }
  }

  // ── Resize ───────────────────────────────────────────────────
  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    initNodes(canvas.width, canvas.height);
  }

  // ── Draw ─────────────────────────────────────────────────────
  function drawFrame() {
    const w        = canvas.width;
    const h        = canvas.height;
    const colStep  = w / COLS;
    const rowStep  = h / ROWS;

    ctx.clearRect(0, 0, w, h);

    // Contour iso-lines
    for (let li = 0; li < N_LINES; li++) {
      const threshold   = -1 + (2 / N_LINES) * li + 1 / N_LINES;
      const distFromMid = Math.abs(li - N_LINES / 2) / (N_LINES / 2);
      const opacity     = lerp(0.22, 0.04, distFromMid * distFromMid);
      const lightness   = lerp(60, 45, distFromMid);
      const isIndex     = li % 5 === 0; // every 5th line is a thicker "index contour"

      ctx.beginPath();
      ctx.strokeStyle = `hsla(${ACCENT_HSL}${lightness}%, ${opacity})`;
      ctx.lineWidth   = isIndex ? 1.4 : 0.8;

      let penDown = false;
      for (let ci = 0; ci <= COLS; ci++) {
        const x = ci * colStep;
        for (let ri = 1; ri <= ROWS; ri++) {
          const y  = ri * rowStep;
          const v  = field(x, y,          t) - threshold;
          const pv = field(x, y - rowStep, t) - threshold;
          if ((v >= 0 && pv < 0) || (v < 0 && pv >= 0)) {
            const frac = Math.abs(pv) / (Math.abs(pv) + Math.abs(v));
            const cy   = (y - rowStep) + frac * rowStep;
            if (!penDown) { ctx.moveTo(x, cy); penDown = true; }
            else            ctx.lineTo(x, cy);
          }
        }
      }
      ctx.stroke();
    }

    // Drifting data-point nodes
    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0) n.x = w; else if (n.x > w) n.x = 0;
      if (n.y < 0) n.y = h; else if (n.y > h) n.y = 0;

      const pulse = 0.5 + 0.5 * Math.sin(t * 1.2 + n.x * 0.01);
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(37, 9%, 82%, ${n.opacity * (0.6 + 0.4 * pulse)})`;
      ctx.fill();
    }

    // Proximity connection lines between nodes
    for (let i = 0; i < nodes.length - 1; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx   = nodes[i].x - nodes[j].x;
        const dy   = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < NODE_LINK_DIST) {
          ctx.beginPath();
          ctx.strokeStyle = `hsla(37, 9%, 75%, ${0.12 * (1 - dist / NODE_LINK_DIST)})`;
          ctx.lineWidth   = 0.5;
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    t   += TIME_STEP;
    raf  = requestAnimationFrame(drawFrame);
  }

  // Pause when the tab is hidden to save CPU
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else drawFrame();
  });

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  drawFrame();
}());
