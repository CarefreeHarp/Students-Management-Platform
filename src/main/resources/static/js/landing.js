/* StudyFlow: an original perspective particle scene.
 * Native scroll unfolds the hero bolt into a viewport-wide star field, then
 * reunites the same particles into two bolts flanking the closing message.
 */
(() => {
  'use strict';
  const canvas = document.querySelector('#flow-universe');
  const toggle = document.querySelector('.motion-toggle');
  if (!canvas || !toggle) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) { toggle.hidden = true; return; }

  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = preference.matches;
  let width = 0, height = 0, frame = 0, previous = 0, clock = 0;
  let scroll = window.scrollY, targetScroll = scroll;
  let pointerX = 0, pointerY = 0, targetX = 0, targetY = 0;
  let mouseX = -1000, mouseY = -1000, pointerPresent = false;
  let hover = 0, wasOverBolt = false, waveStart = -10;
  let visuals = [], stacked = false, mobile = false;
  let heroHeight = 900, orbitCenter = 740, closingTop = 0, closingHeight = 800;
  const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = x => { const t = clamp(x); return t * t * (3 - 2 * t); };
  let seed = 24751;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const polygon = [[-.12,-1.05],[.39,-1.05],[.12,-.24],[.49,-.24],[-.29,1.08],[-.06,.16],[-.46,.16]];

  function inside(x, y) {
    let hit = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [a, b] = polygon[i], [c, d] = polygon[j];
      if ((b > y) !== (d > y) && x < (c - a) * (y - b) / (d - b) + a) hit = !hit;
    }
    return hit;
  }

  const points = Array.from({ length: 1900 }, (_, i) => {
    let x, y;
    do { x = random() - .5; y = random() * 2.2 - 1.1; } while (!inside(x, y));
    return {
      bolt: [x, y, (random() - .5) * .23],
      field: [random(), random(), .4 + random() * .85],
      // Groups of two retain both final bolts when mobile draws every other point.
      side: Math.floor(i / 2) % 2 === 0 ? -1 : 1,
      size: .5 + random() * 1.35,
      alpha: .35 + random() * .65,
      color: i % 7 === 0 ? '113,206,217' : i % 4 === 0 ? '229,224,255' : '165,153,249',
      phase: random() * Math.PI * 2,
      dx: 0, dy: 0, vx: 0, vy: 0
    };
  });
  const stars = Array.from({ length: 150 }, () => ({ x: random(), y: random(), z: .2 + random() * .8, size: .4 + random() * .8 }));
  const notes = Array.from(document.querySelectorAll('.floating-note'));
  const glow = document.querySelector('.scene-glow');
  const hero = document.querySelector('.hero');
  const orbit = document.querySelector('.hero-orbit');
  const closing = document.querySelector('.closing');

  function measure() {
    mobile = innerWidth <= 700;
    stacked = innerWidth <= 1100;
    width = innerWidth; height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.6);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    heroHeight = hero.offsetHeight;
    const orbitRect = orbit.getBoundingClientRect();
    orbitCenter = orbitRect.top + window.scrollY + orbitRect.height * .5;
    const closeRect = closing.getBoundingClientRect();
    closingTop = closeRect.top + window.scrollY;
    closingHeight = closing.offsetHeight;
    visuals = Array.from(document.querySelectorAll('[data-depth]')).map(el => ({ el, top: el.getBoundingClientRect().top + window.scrollY, height: el.offsetHeight }));
    targetScroll = window.scrollY;
    wake();
  }

  function sceneAt(y) {
    // Begin dispersing immediately after the hero has room to be seen.
    // By the first feature, every hero particle spans the entire viewport.
    const scatterStart = stacked ? Math.max(0, orbitCenter - height * .55) : 35;
    const scatter = ease((y - scatterStart) / (stacked ? height * .65 : heroHeight * .7));
    // Use the closing section's position, not total document height: the footer
    // or an expanded FAQ must not keep either final bolt from fully forming.
    const reunion = ease((y + height * .75 - closingTop) / (height * .58));
    return { scatter, reunion };
  }

  function projectBolt(p, angleY, angleX, angleZ) {
    const [x, y, z] = p.bolt;
    const rx = x * Math.cos(angleY) + z * Math.sin(angleY);
    const rz = -x * Math.sin(angleY) + z * Math.cos(angleY);
    const ry = y * Math.cos(angleX) - rz * Math.sin(angleX);
    const depth = y * Math.sin(angleX) + rz * Math.cos(angleX);
    const perspective = 3.6 / (3.6 + depth);
    return {
      x: (rx * Math.cos(angleZ) - ry * Math.sin(angleZ)) * perspective,
      y: (rx * Math.sin(angleZ) + ry * Math.cos(angleZ)) * perspective,
      scale: perspective
    };
  }

  function draw(now) {
    frame = 0;
    const delta = Math.min((now - (previous || now)) / 1000, .035); previous = now;
    const damping = 1 - Math.exp(-delta * 7);
    scroll = paused ? targetScroll : mix(scroll, targetScroll, damping);
    pointerX = paused ? 0 : mix(pointerX, targetX, damping);
    pointerY = paused ? 0 : mix(pointerY, targetY, damping);
    if (!paused) clock += delta;
    const { scatter, reunion } = sceneAt(scroll);
    const heroX = stacked ? width * .5 : width * .76;
    const heroY = stacked ? orbitCenter - scroll : height * .51;
    const unit = stacked ? Math.min(width * .31, 200) : Math.min(height * .32, width * .2);
    const closingY = clamp(closingTop - scroll + closingHeight * .46, height * .32, height * .72);
    const closingUnit = mobile ? width * .18 : Math.min(height * .27, width * .15);
    const closingLeft = mobile ? .12 : .19;
    const closingRight = mobile ? .88 : .81;
    const overHero = scatter < .85 && Math.abs(mouseX - heroX) < unit * .65 && Math.abs(mouseY - heroY) < unit * 1.1;
    const overClosing = reunion > .6 && [closingLeft, closingRight].some(x => Math.abs(mouseX - width * x) < closingUnit * .7 && Math.abs(mouseY - closingY) < closingUnit * 1.1);
    const overBolt = pointerPresent && !paused && (overHero || overClosing);
    if (overBolt && !wasOverBolt) waveStart = clock;
    wasOverBolt = overBolt;
    hover = paused ? 0 : mix(hover, overBolt ? 1 : 0, 1 - Math.exp(-delta * 10));
    const angleY = -.15 + pointerX * .18 + Math.sin(clock * .18) * .07;
    const angleX = .05 + pointerY * .1;
    const angleZ = .10 + Math.sin(clock * .12) * .025;
    const density = mobile ? 2 : 1;
    const fieldWeight = scatter * (1 - reunion);
    const opacity = mix(mix(1, mobile ? .40 : .62, scatter), mobile ? .55 : .9, reunion);

    ctx.clearRect(0, 0, width, height);
    for (const star of stars) {
      const x = (star.x * width + pointerX * star.z * 13 + width) % width;
      const y = ((star.y * height - (paused ? 0 : scroll * .055 * star.z)) % height + height) % height;
      ctx.fillStyle = `rgba(191,188,236,${star.z * .25})`;
      ctx.beginPath(); ctx.arc(x, y, star.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    if (hover > .015) {
      const halo = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 180);
      halo.addColorStop(0, `rgba(112,192,238,${hover * .12})`);
      halo.addColorStop(.45, `rgba(147,117,247,${hover * .08})`);
      halo.addColorStop(1, 'rgba(147,117,247,0)');
      ctx.fillStyle = halo; ctx.fillRect(0, 0, width, height);
    }
    const influenceRadius = 155;
    let connections = 0;
    for (let i = 0; i < points.length; i += density) {
      const p = points[i];
      const bolt = projectBolt(p, angleY, angleX, angleZ);
      const heroPx = heroX + bolt.x * unit;
      const heroPy = heroY + bolt.y * unit;
      const drift = paused ? 0 : scroll * .065 * p.field[2] + clock * 2.5;
      const fieldX = p.field[0] * (width + 100) - 50 + pointerX * p.field[2] * 24 + Math.sin(clock * .12 + p.phase) * 9;
      const fieldY = ((p.field[1] * (height + 160) - drift) % (height + 160) + height + 160) % (height + 160) - 80;
      const finalPx = width * (p.side < 0 ? closingLeft : closingRight) + bolt.x * closingUnit;
      const finalPy = closingY + bolt.y * closingUnit;
      let px = mix(mix(heroPx, fieldX, scatter), finalPx, reunion);
      let py = mix(mix(heroPy, fieldY, scatter), finalPy, reunion);

      // A local vortex lifts nearby stars, with an expanding wave on entry.
      // A damped spring restores each point's silhouette when the pointer leaves.
      const dx = px - mouseX, dy = py - mouseY;
      const distance = Math.hypot(dx, dy);
      const near = Math.pow(clamp(1 - distance / influenceRadius), 2) * hover;
      const waveAge = clock - waveStart;
      const wave = waveAge < 1.15 ? Math.exp(-Math.pow((distance - waveAge * 340) / 45, 2)) * (1 - waveAge / 1.15) * hover : 0;
      const force = near * 95 + wave * 32;
      const nx = dx / Math.max(distance, 1), ny = dy / Math.max(distance, 1);
      const desiredX = nx * force - ny * near * 60;
      const desiredY = ny * force + nx * near * 60;
      if (paused) { p.dx = 0; p.dy = 0; p.vx = 0; p.vy = 0; }
      else {
        p.vx += ((desiredX - p.dx) * 95 - p.vx * 14) * delta;
        p.vy += ((desiredY - p.dy) * 95 - p.vy * 14) * delta;
        p.dx += p.vx * delta; p.dy += p.vy * delta;
      }
      px += p.dx; py += p.dy;
      const perspective = mix(bolt.scale, p.field[2], fieldWeight);
      const size = p.size * perspective * (i % 47 === 0 ? 1.8 : 1) * (1 + near * 2.2);
      const twinkle = .88 + Math.sin(clock * .8 + p.phase) * .12;
      const alpha = clamp(p.alpha * opacity * twinkle + near * .7);
      if (near > .13 && i % 12 === 0 && connections < 9) {
        ctx.strokeStyle = `rgba(155,205,255,${near * .4})`;
        ctx.lineWidth = .6;
        ctx.beginPath(); ctx.moveTo(mouseX, mouseY); ctx.lineTo(px, py); ctx.stroke();
        connections++;
      }
      if (i % 47 === 0 || near > .35) {
        const halo = ctx.createRadialGradient(px, py, 0, px, py, size * 6);
        halo.addColorStop(0, `rgba(${p.color},${alpha * .38})`);
        halo.addColorStop(1, `rgba(${p.color},0)`);
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(px, py, size * 6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = `rgba(${near > .1 ? '193,227,255' : p.color},${alpha})`;
      ctx.beginPath(); ctx.arc(px, py, size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const v of visuals) {
      const offset = clamp((v.top + v.height / 2 - scroll - height / 2) / height, -1, 1);
      v.el.style.transform = paused || stacked ? 'none' : `perspective(1200px) translate3d(0,${offset * 20}px,0) rotateX(${offset * -5}deg) rotateY(${-5 + offset * 5 + pointerX * 1.5}deg)`;
    }
    notes.forEach((el, i) => {
      el.style.transform = paused ? 'none' : `translate3d(${pointerX * (i ? 10 : -8)}px,${Math.sin(clock * .7 + i * 2) * 5 - scroll * .018}px,0) rotate(${i ? -5 : 6}deg)`;
    });
    if (glow) glow.style.opacity = String(mix(1, .6, fieldWeight));
    if (!paused && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function wake() { if (!frame && !document.hidden) frame = requestAnimationFrame(draw); }
  function updateToggle() {
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? 'Activar animación' : 'Pausar animación');
    toggle.querySelector('.motion-label').textContent = paused ? 'Activar movimiento' : 'Pausar movimiento';
    toggle.firstElementChild.textContent = paused ? '▷' : 'Ⅱ';
    previous = 0; wake();
  }
  toggle.addEventListener('click', () => { paused = !paused; updateToggle(); });
  preference.addEventListener('change', event => { paused = event.matches; updateToggle(); });
  addEventListener('scroll', () => { targetScroll = window.scrollY; wake(); }, { passive: true });
  addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse' && !paused) {
      mouseX = event.clientX; mouseY = event.clientY; pointerPresent = true;
      targetX = (mouseX / width - .5) * 2; targetY = (mouseY / height - .5) * 2;
    }
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; pointerPresent = false; });
  addEventListener('resize', measure, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; pointerPresent = false; }
    else { previous = 0; wake(); }
  });
  document.querySelectorAll('details').forEach(el => el.addEventListener('toggle', measure));
  if (document.fonts) document.fonts.ready.then(measure);
  addEventListener('pageshow', measure);
  measure(); updateToggle();
})();
