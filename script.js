// ============ YEAR ============
document.getElementById('year').textContent = new Date().getFullYear();

// ============ GARDEN / TREE ============
(function () {
  const canvas = document.getElementById('gardenCanvas');
  const ctx = canvas.getContext('2d');
  const waterBtn = document.getElementById('waterBtn');
  const resetBtn = document.getElementById('resetBtn');
  const fill = document.getElementById('growthFill');
  const pct = document.getElementById('growthPct');
  const hint = document.getElementById('gardenHint');

  const STORAGE_KEY = 'bz_garden_growth_v1';
  const MAX_GROWTH = 100;

  let growth = parseFloat(localStorage.getItem(STORAGE_KEY)) || 0;
  let raindrops = [];
  let leaves = [];
  let dpr = window.devicePixelRatio || 1;
  let W, H;

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

  function updateUI() {
    const p = Math.min(100, Math.round(growth));
    fill.style.width = p + '%';
    pct.textContent = p + '%';
    if (p >= 100) {
      hint.textContent = '🌳 Dein Baum ist voll ausgewachsen! Danke fürs Gießen 💚';
    } else if (p > 60) {
      hint.textContent = 'Fast geschafft — weiter gießen! 🌿';
    } else if (p > 20) {
      hint.textContent = 'Er wächst! Gieß weiter 💧';
    } else {
      hint.textContent = 'Klick auf "Gießen" oder direkt auf den Boden 🌱';
    }
  }

  function water(amount = 6) {
    growth = Math.min(MAX_GROWTH, growth + amount);
    localStorage.setItem(STORAGE_KEY, growth);
    updateUI();
    spawnDrops(8);
    if (Math.random() < 0.4 && growth > 15) spawnLeafBurst();
  }

  function resetGarden() {
    growth = 0;
    localStorage.setItem(STORAGE_KEY, growth);
    updateUI();
  }

  function spawnDrops(n) {
    for (let i = 0; i < n; i++) {
      raindrops.push({
        x: W * 0.5 + (Math.random() - 0.5) * 60,
        y: 20 + Math.random() * 30,
        vy: 2 + Math.random() * 2,
        r: 2 + Math.random() * 2,
        life: 1,
      });
    }
  }

  function spawnLeafBurst() {
    const treeTopY = H - 60 - (growth / MAX_GROWTH) * (H - 140);
    for (let i = 0; i < 5; i++) {
      leaves.push({
        x: W / 2 + (Math.random() - 0.5) * 40,
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

  function drawSky() {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0d1a24');
    grad.addColorStop(0.6, '#0b1712');
    grad.addColorStop(1, '#0a140f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // soft sun glow
    const sunGrad = ctx.createRadialGradient(W * 0.8, 60, 5, W * 0.8, 60, 120);
    sunGrad.addColorStop(0, 'rgba(255,180,84,0.35)');
    sunGrad.addColorStop(1, 'rgba(255,180,84,0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, W, H);
  }

  function drawTree(g) {
    const p = g / MAX_GROWTH; // 0..1
    const baseX = W / 2;
    const baseY = H - 55;
    const trunkHeight = 20 + p * (H - 140);
    const trunkWidth = 6 + p * 16;

    // trunk (curved slightly)
    ctx.save();
    ctx.strokeStyle = '#5b4230';
    ctx.lineWidth = trunkWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    const sway = Math.sin(Date.now() / 1400) * (2 + p * 6);
    ctx.quadraticCurveTo(baseX + sway, baseY - trunkHeight / 2, baseX + sway * 1.4, baseY - trunkHeight);
    ctx.stroke();

    // branches once grown a bit
    if (p > 0.25) {
      const topX = baseX + sway * 1.4;
      const topY = baseY - trunkHeight;
      const branches = Math.floor(2 + p * 4);
      for (let i = 0; i < branches; i++) {
        const t = (i + 1) / (branches + 1);
        const by = baseY - trunkHeight * (0.35 + t * 0.55);
        const bxOff = (i % 2 === 0 ? -1 : 1) * (20 + p * 40) * (0.5 + t);
        ctx.lineWidth = Math.max(2, trunkWidth * (1 - t) * 0.6);
        ctx.beginPath();
        ctx.moveTo(baseX + sway * t, by);
        ctx.quadraticCurveTo(baseX + bxOff * 0.5, by - 20, baseX + bxOff, by - 35 - p * 10);
        ctx.stroke();
      }
      var topPoint = { x: topX, y: topY };
    } else {
      var topPoint = { x: baseX + sway * 1.4, y: baseY - trunkHeight };
    }
    ctx.restore();

    // foliage — layered soft blobs, grows with p
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
      blobs.forEach((b, i) => {
        ctx.beginPath();
        ctx.fillStyle = greens[i % greens.length];
        ctx.globalAlpha = 0.9;
        ctx.arc(cx + b.dx, cy + b.dy, b.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // little blossoms near full growth
      if (p > 0.85) {
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
      // tiny sprout leaves
      ctx.fillStyle = '#57d38c';
      ctx.beginPath();
      ctx.ellipse(topPoint.x - 5, topPoint.y, 6, 3, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(topPoint.x + 5, topPoint.y, 6, 3, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // seed / mound
      ctx.fillStyle = '#6b4e2e';
      ctx.beginPath();
      ctx.ellipse(baseX, baseY - 2, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
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

  function step() {
    drawSky();
    drawGround();
    drawTree(growth);

    // update+draw raindrops
    raindrops.forEach((d) => {
      d.y += d.vy;
      d.life -= 0.02;
    });
    raindrops = raindrops.filter((d) => d.life > 0 && d.y < H);
    drawDrops();

    // update+draw leaves
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

  waterBtn.addEventListener('click', () => water(6));
  canvas.addEventListener('click', () => water(4));
  resetBtn.addEventListener('click', () => {
    if (confirm('Baum wirklich zurücksetzen?')) resetGarden();
  });

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
    { title: 'Diffusion Models — Monbroussou (2025)', sub: 'Notizen & Zusammenfassung', link: '#' },
    { title: 'arXiv 2502.05981', sub: 'Preprint gelesen & annotiert', link: 'https://arxiv.org/abs/2502.05981' },
    { title: 'arXiv 2505.22060', sub: 'Preprint gelesen & annotiert', link: 'https://arxiv.org/abs/2505.22060' },
    { title: 'Quantum-Inspired Tensor Networks', sub: 'Vertiefungsthema Tensor-Netzwerke', link: '#' },
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
