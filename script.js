// ============ YEAR ============
document.getElementById('year').textContent = new Date().getFullYear();

// ============ GARDEN / TREES ============
(function () {
  const canvas = document.getElementById('gardenCanvas');
  const ctx = canvas.getContext('2d');
  const waterBtn = document.getElementById('waterBtn');
  const plantBtn = document.getElementById('plantBtn');
  const resetBtn = document.getElementById('resetBtn');
  const growthFill = document.getElementById('growthFill');
  const growthPct = document.getElementById('growthPct');
  const healthFill = document.getElementById('healthFill');
  const healthPct = document.getElementById('healthPct');
  const hint = document.getElementById('gardenHint');
  const clockChip = document.getElementById('clockChip');
  const selectorEl = document.getElementById('treeSelector');

  const STORAGE_KEY = 'bz_garden_v2';
  const MAX_GROWTH = 100;
  const MAX_TREES = 6;
  const MAX_WATER = 100; // moisture buffer per tree
  // real seconds per in-garden minute — the whole day (24h) cycles in ~6 real minutes
  const MS_PER_GAME_MIN = 1500;

  let raindrops = [];
  let leaves = [];
  let dpr = window.devicePixelRatio || 1;
  let W, H;

  function freshTree(x) {
    return {
      x,                 // 0..1 relative position along the ground
      growth: 0,         // 0..100
      water: 60,         // moisture buffer, drains over time
      health: 100,       // 0..100, hits 0 => dead/withered
      dead: false,
      sway: Math.random() * Math.PI * 2,
      bornAt: Date.now(),
    };
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (raw && Array.isArray(raw.trees) && raw.trees.length) {
        return {
          trees: raw.trees,
          activeIndex: raw.activeIndex || 0,
          gameMinutes: raw.gameMinutes || 0,
          lastReal: raw.lastReal || Date.now(),
        };
      }
    } catch (e) {}
    return { trees: [freshTree(0.5)], activeIndex: 0, gameMinutes: 8 * 60, lastReal: Date.now() };
  }

  let state = load();

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function activeTree() {
    return state.trees[state.activeIndex] || state.trees[0];
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- time simulation ----------
  // Advance game time based on real elapsed time since last visit/tick.
  function advanceTime(deltaMs) {
    const deltaGameMin = deltaMs / MS_PER_GAME_MIN;
    if (deltaGameMin <= 0) return;
    state.gameMinutes += deltaGameMin;

    // drain water & health for every living tree proportional to elapsed game time
    const days = deltaGameMin / (24 * 60);
    state.trees.forEach((t) => {
      if (t.dead) return;
      t.water = Math.max(0, t.water - days * 55);
      if (t.water <= 0) {
        t.health = Math.max(0, t.health - days * 40);
      } else if (t.water > 15) {
        t.health = Math.min(100, t.health + days * 6);
      }
      if (t.health <= 0) {
        t.dead = true;
        t.growth = Math.max(0, t.growth * 0.4);
      }
    });
  }

  function catchUp() {
    const now = Date.now();
    advanceTime(now - state.lastReal);
    state.lastReal = now;
  }

  function dayInfo() {
    const totalMin = ((state.gameMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
    const day = Math.floor(state.gameMinutes / (24 * 60)) + 1;
    const hh = Math.floor(totalMin / 60);
    const mm = Math.floor(totalMin % 60);
    const isNight = hh < 6 || hh >= 20;
    const isDusk = hh >= 18 && hh < 20;
    const isDawn = hh >= 5 && hh < 7;
    let icon = '🌤';
    if (isNight) icon = '🌙';
    else if (isDusk) icon = '🌇';
    else if (isDawn) icon = '🌅';
    return {
      day,
      hh,
      mm,
      icon,
      dayFrac: totalMin / (24 * 60), // 0..1
    };
  }

  // ---------- UI ----------
  function updateUI() {
    const t = activeTree();
    const gp = Math.min(100, Math.round(t.growth));
    growthFill.style.width = gp + '%';
    growthPct.textContent = gp + '%';

    const hp = Math.max(0, Math.round(t.health));
    healthFill.style.width = hp + '%';
    healthPct.textContent = hp + '%';

    const info = dayInfo();
    clockChip.textContent = `${info.icon} Tag ${info.day} · ${String(info.hh).padStart(2, '0')}:${String(info.mm).padStart(2, '0')}`;

    if (t.dead) {
      hint.textContent = '🥀 Dieser Baum ist verdorrt — pflanze einen neuen oder wähle einen anderen.';
    } else if (gp >= 100) {
      hint.textContent = '🌳 Baum voll ausgewachsen! Weiter gießen hält ihn gesund.';
    } else if (hp < 30) {
      hint.textContent = '⚠️ Der Baum durstet! Jetzt gießen, sonst welkt er.';
    } else if (gp > 60) {
      hint.textContent = 'Fast geschafft — weiter gießen! 🌿';
    } else if (gp > 20) {
      hint.textContent = 'Er wächst! Gieß weiter 💧';
    } else {
      hint.textContent = 'Klick auf "Gießen" um diesen Baum zu pflegen 🌱';
    }

    plantBtn.disabled = state.trees.length >= MAX_TREES;
    renderSelector();
  }

  function renderSelector() {
    selectorEl.innerHTML = '';
    state.trees.forEach((t, i) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'tree-chip' + (i === state.activeIndex ? ' active' : '') + (t.dead ? ' dead' : '');
      const label = t.dead ? '🥀' : t.growth >= 100 ? '🌳' : t.growth > 25 ? '🌿' : '🌱';
      chip.textContent = `${label} Baum ${i + 1}`;
      chip.addEventListener('click', () => {
        state.activeIndex = i;
        save();
        updateUI();
      });
      selectorEl.appendChild(chip);
    });
  }

  function water(amount = 22) {
    const t = activeTree();
    if (t.dead) {
      hint.textContent = '🥀 Dieser Baum ist bereits verdorrt. Pflanze lieber einen neuen!';
      return;
    }
    t.water = Math.min(MAX_WATER, t.water + amount);
    t.health = Math.min(100, t.health + amount * 0.3);
    t.growth = Math.min(MAX_GROWTH, t.growth + amount * 0.18);
    save();
    updateUI();
    spawnDrops(8);
    if (Math.random() < 0.4 && t.growth > 15) spawnLeafBurst(t);
  }

  function plantNewTree() {
    if (state.trees.length >= MAX_TREES) return;
    const used = state.trees.map((t) => t.x);
    let x = 0.5;
    const slots = [];
    const n = state.trees.length + 1;
    for (let i = 0; i < n; i++) slots.push((i + 1) / (n + 1));
    // pick the slot furthest from existing trees for nicer spacing
    x = slots.reduce((best, s) => {
      const minDist = (arr) => Math.min(...arr.map((u) => Math.abs(u - s)));
      return minDist(used.length ? used : [0.5]) > minDist(used.length ? used : [0.5], best) ? s : best;
    }, slots[0]);
    state.trees.forEach((t, i) => {
      t.x = (i + 1) / (state.trees.length + 2);
    });
    state.trees.push(freshTree(state.trees.length / (state.trees.length + 1)));
    // recompute even spacing for all trees
    const m = state.trees.length;
    state.trees.forEach((t, i) => (t.x = (i + 1) / (m + 1)));
    state.activeIndex = state.trees.length - 1;
    save();
    updateUI();
    hint.textContent = '🌱 Ein neuer Baum wurde gepflanzt! Gieße ihn regelmäßig.';
  }

  function resetGarden() {
    state = { trees: [freshTree(0.5)], activeIndex: 0, gameMinutes: 8 * 60, lastReal: Date.now() };
    save();
    updateUI();
  }

  function spawnDrops(n) {
    const t = activeTree();
    const cx = W * t.x;
    for (let i = 0; i < n; i++) {
      raindrops.push({
        x: cx + (Math.random() - 0.5) * 60,
        y: 20 + Math.random() * 30,
        vy: 2 + Math.random() * 2,
        r: 2 + Math.random() * 2,
        life: 1,
      });
    }
  }

  function spawnLeafBurst(t) {
    const baseY = H - 55;
    const trunkHeight = 20 + (t.growth / MAX_GROWTH) * (H - 140);
    const treeTopY = baseY - trunkHeight;
    for (let i = 0; i < 5; i++) {
      leaves.push({
        x: W * t.x + (Math.random() - 0.5) * 40,
        y: treeTopY,
        vx: (Math.random() - 0.5) * 1.4,
        vy: -Math.random() * 1.5 - 0.5,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.1,
        life: 1,
      });
    }
  }

  // ---- drawing helpers ----
  function drawGround() {
    const grad = ctx.createLinearGradient(0, H - 70, 0, H);
    grad.addColorStop(0, '#16321f');
    grad.addColorStop(1, '#0b1a10');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, H - 55);
    for (let x = 0; x <= W; x += 40) {
      ctx.quadraticCurveTo(x + 20, H - 65 + Math.sin(x * 0.05) * 6, x + 40, H - 55);
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();
  }

  function drawSky(dayFrac) {
    // dayFrac: 0 = midnight, 0.25 = 6am, 0.5 = noon, 0.75 = 6pm
    const dayness = Math.max(0, Math.sin((dayFrac - 0.25) * Math.PI * 2 * 0.5 + Math.PI / 2));
    // simpler: brightness curve peaking at noon
    const angle = (dayFrac - 0.5) * Math.PI * 2; // -pi..pi, 0 at noon
    const brightness = Math.max(0, Math.cos(angle * 0.85));

    const nightTop = [8, 10, 22];
    const dayTop = [30, 70, 110];
    const nightBot = [8, 16, 12];
    const dayBot = [16, 40, 30];
    const lerp = (a, b, t) => Math.round(a + (b - a) * t);
    const top = [0, 1, 2].map((i) => lerp(nightTop[i], dayTop[i], brightness));
    const bot = [0, 1, 2].map((i) => lerp(nightBot[i], dayBot[i], brightness));

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, `rgb(${top[0]},${top[1]},${top[2]})`);
    grad.addColorStop(0.6, `rgb(${Math.round((top[0]+bot[0])/2)},${Math.round((top[1]+bot[1])/2)},${Math.round((top[2]+bot[2])/2)})`);
    grad.addColorStop(1, `rgb(${bot[0]},${bot[1]},${bot[2]})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // sun / moon arc
    const bodyX = W * dayFrac;
    const bodyY = H * 0.28 - Math.sin(dayFrac * Math.PI) * H * 0.18;
    const isSun = brightness > 0.15;
    const color = isSun ? '255,180,84' : '180,200,255';
    const glow = ctx.createRadialGradient(bodyX, 60, 5, bodyX, 60, 120);
    glow.addColorStop(0, `rgba(${color},0.35)`);
    glow.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // stars at night
    if (brightness < 0.25) {
      const starAlpha = 1 - brightness / 0.25;
      ctx.fillStyle = `rgba(255,255,255,${0.5 * starAlpha})`;
      for (let i = 0; i < 25; i++) {
        const sx = (i * 97.3) % W;
        const sy = (i * 53.7) % (H * 0.5);
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }
    }
  }

  function drawTree(t) {
    const p = t.growth / MAX_GROWTH; // 0..1
    const baseX = W * t.x;
    const baseY = H - 55;
    const trunkHeight = 20 + p * (H - 140);
    const trunkWidth = 6 + p * 16;
    const wither = t.dead ? 1 : Math.max(0, 1 - t.health / 100) * 0.6;

    ctx.save();
    ctx.strokeStyle = t.dead ? '#4a3a2c' : '#5b4230';
    ctx.lineWidth = trunkWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    const sway = t.dead ? 0 : Math.sin(Date.now() / 1400 + t.sway) * (2 + p * 6);
    ctx.quadraticCurveTo(baseX + sway, baseY - trunkHeight / 2, baseX + sway * 1.4, baseY - trunkHeight);
    ctx.stroke();

    if (p > 0.25) {
      const topX = baseX + sway * 1.4;
      const topY = baseY - trunkHeight;
      const branches = Math.floor(2 + p * 4);
      for (let i = 0; i < branches; i++) {
        const tt = (i + 1) / (branches + 1);
        const by = baseY - trunkHeight * (0.35 + tt * 0.55);
        const bxOff = (i % 2 === 0 ? -1 : 1) * (20 + p * 40) * (0.5 + tt);
        ctx.lineWidth = Math.max(2, trunkWidth * (1 - tt) * 0.6);
        ctx.beginPath();
        ctx.moveTo(baseX + sway * tt, by);
        ctx.quadraticCurveTo(baseX + bxOff * 0.5, by - 20, baseX + bxOff, by - 35 - p * 10);
        ctx.stroke();
      }
      var topPoint = { x: topX, y: topY };
    } else {
      var topPoint = { x: baseX + sway * 1.4, y: baseY - trunkHeight };
    }
    ctx.restore();

    // foliage — layered soft blobs, grows with p, browns as it withers
    if (p > 0.08) {
      const foliageR = 18 + p * 90;
      const cx = topPoint.x;
      const cy = topPoint.y - foliageR * 0.35;
      const blobs = [
        { dx: 0, dy: 0, r: foliageR },
        { dx: -foliageR * 0.6, dy: foliageR * 0.25, r: foliageR * 0.65 },
        { dx: foliageR * 0.6, dy: foliageR * 0.25, r: foliageR * 0.65 },
        { dx: 0, dy: -foliageR * 0.45, r: foliageR * 0.55 },
      ];
      const greens = ['#2f7d4f', '#3c9a5e', '#57d38c', '#2a6b45'];
      const browns = ['#6b4a2e', '#7d5a35', '#8a6a40', '#5a3f26'];
      blobs.forEach((b, i) => {
        ctx.beginPath();
        const c1 = greens[i % greens.length];
        const c2 = browns[i % browns.length];
        ctx.fillStyle = t.dead ? c2 : wither > 0 ? mixColor(c1, c2, wither) : c1;
        ctx.globalAlpha = t.dead ? 0.75 : 0.9;
        ctx.arc(cx + b.dx, cy + b.dy, b.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      if (p > 0.85 && !t.dead && wither < 0.3) {
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          const rr = foliageR * (0.5 + Math.random() * 0.5);
          const bx = cx + Math.cos(a) * rr;
          const by = cy + Math.sin(a) * rr * 0.8;
          ctx.beginPath();
          ctx.fillStyle = '#ffdca8';
          ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (p > 0) {
      ctx.fillStyle = t.dead ? '#7d5a35' : '#57d38c';
      ctx.beginPath();
      ctx.ellipse(topPoint.x - 5, topPoint.y, 6, 3, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(topPoint.x + 5, topPoint.y, 6, 3, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#6b4e2e';
      ctx.beginPath();
      ctx.ellipse(baseX, baseY - 2, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // active-tree marker
    if (state.trees[state.activeIndex] === t) {
      ctx.fillStyle = 'rgba(87,211,140,0.8)';
      ctx.beginPath();
      ctx.arc(baseX, baseY + 8, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function mixColor(hexA, hexB, t) {
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);
    const r = Math.round(a[0] + (b[0] - a[0]) * t);
    const g = Math.round(a[1] + (b[1] - a[1]) * t);
    const bl = Math.round(a[2] + (b[2] - a[2]) * t);
    return `rgb(${r},${g},${bl})`;
  }
  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function drawDrops() {
    ctx.fillStyle = 'rgba(120,200,255,0.85)';
    raindrops.forEach((d) => {
      ctx.globalAlpha = d.life;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.r * 0.7, d.r, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawLeaves() {
    leaves.forEach((l) => {
      ctx.save();
      ctx.globalAlpha = l.life;
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rot);
      ctx.fillStyle = '#8de3ab';
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  let lastTick = Date.now();
  function step() {
    const now = Date.now();
    advanceTime(now - lastTick);
    lastTick = now;
    state.lastReal = now;

    const info = dayInfo();
    drawSky(info.dayFrac);
    drawGround();
    state.trees.forEach(drawTree);

    raindrops.forEach((d) => {
      d.y += d.vy;
      d.life -= 0.02;
    });
    raindrops = raindrops.filter((d) => d.life > 0 && d.y < H);
    drawDrops();

    leaves.forEach((l) => {
      l.x += l.vx;
      l.y += l.vy;
      l.vy += 0.02;
      l.rot += l.vr;
      l.life -= 0.01;
    });
    leaves = leaves.filter((l) => l.life > 0);
    drawLeaves();

    requestAnimationFrame(step);
  }

  // periodically refresh the UI numbers + persist (canvas loop handles drawing every frame)
  setInterval(() => {
    updateUI();
    save();
  }, 1000);

  waterBtn.addEventListener('click', () => water(22));
  canvas.addEventListener('click', (e) => {
    // click nearest tree to water it, or just water active one
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    let nearest = 0;
    let bestDist = Infinity;
    state.trees.forEach((t, i) => {
      const d = Math.abs(t.x - clickX);
      if (d < bestDist) {
        bestDist = d;
        nearest = i;
      }
    });
    state.activeIndex = nearest;
    water(12);
  });
  plantBtn.addEventListener('click', plantNewTree);
  resetBtn.addEventListener('click', () => {
    if (confirm('Den GESAMTEN Garten (alle Bäume) wirklich zurücksetzen?')) resetGarden();
  });

  catchUp();
  updateUI();
  requestAnimationFrame(step);
})();

// ============ GITHUB REPOS ============
(function () {
  const GH_USER = 'ZecPlusPlus';
  const grid = document.getElementById('repoGrid');

  const langColors = {
    Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#2b7489',
    'C++': '#f34b7d', C: '#555555', HTML: '#e34c26', CSS: '#563d7c',
    Jupyter: '#DA5B0B', Rust: '#dea584', Go: '#00ADD8', Shell: '#89e051',
  };

  fetch(`https://api.github.com/users/${GH_USER}/repos?sort=updated&per_page=100`)
    .then((r) => {
      if (!r.ok) throw new Error('GitHub API error');
      return r.json();
    })
    .then((repos) => {
      const filtered = repos.filter((r) => !r.fork);
      if (!filtered.length) {
        grid.innerHTML = `<div class="repo-empty">Noch keine öffentlichen Repos hier — schau in der
          Zwischenzeit auf <a href="https://github.com/${GH_USER}" target="_blank" rel="noopener" style="color:var(--accent2)">GitHub</a> vorbei.</div>`;
        return;
      }
      grid.innerHTML = '';
      filtered.forEach((repo) => {
        const card = document.createElement('a');
        card.href = repo.html_url;
        card.target = '_blank';
        card.rel = 'noopener';
        card.className = 'repo-card';
        const color = langColors[repo.language] || '#8a9aab';
        card.innerHTML = `
          <div class="repo-name">📁 ${repo.name}</div>
          <div class="repo-desc">${repo.description ? escapeHtml(repo.description) : 'Keine Beschreibung vorhanden.'}</div>
          <div class="repo-meta">
            ${repo.language ? `<span><span class="repo-lang-dot" style="background:${color}"></span>${repo.language}</span>` : ''}
            <span>★ ${repo.stargazers_count}</span>
            <span>⑂ ${repo.forks_count}</span>
          </div>`;
        grid.appendChild(card);
      });
    })
    .catch(() => {
      grid.innerHTML = `<div class="repo-empty">Projekte konnten nicht geladen werden. Schau direkt auf
        <a href="https://github.com/${GH_USER}" target="_blank" rel="noopener" style="color:var(--accent2)">GitHub</a>.</div>`;
    });

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();

// ============ PAPERS ============
(function () {
  const papers = [
    {
      title: 'Towards Tensor-Network SAT-Solvers for Quantum-Classical Workflows',
      sub: 'Zec, Schmidbauer, Franz, Mauerer — angenommen auf der IEEE QCE 2026',
      link: 'https://arxiv.org/abs/2608.02041',
    },
    {
      title: 'Works on My QPU: Reproducibility in Quantum Computing Research',
      sub: 'Köster, Franz, Zec, Hoess, Ramsauer, Mauerer — arXiv 2026',
      link: 'https://arxiv.org/html/2607.08348v1',
    },
  ];
  const list = document.getElementById('paperList');
  list.innerHTML = papers
    .map(
      (p) => `<a class="paper-item" href="${p.link}" target="_blank" rel="noopener">
        <div>
          <div class="paper-title">${p.title}</div>
          <div class="paper-sub">${p.sub}</div>
        </div>
        <div class="paper-arrow">↗</div>
      </a>`
    )
    .join('');
})();
