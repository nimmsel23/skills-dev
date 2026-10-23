// Design B — „Gravity Map“: Sternkarte, jede Progression ein Sternbild.
import Core from './core.js';
import css from './b-gravity-map.css?inline';

const SEL = '[data-node],[data-open],[data-back],[data-run],[data-master],[data-down],[data-fin],[data-skip],[data-pause],[data-add],[data-adj],[data-skipblock],[data-rpe],[data-save],[data-exit],[data-video]';

/* Sternbild-Geometrie (deterministisch je Skill) */
function rng(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
function layout(skill, w, h, pad) {
  const r = rng(skill.id), n = skill.progressions.length;
  return skill.progressions.map((p, i) => {
    const t = n === 1 ? 0 : i / (n - 1);
    return { x: pad + t * (w - pad * 2) + (r() - .5) * 14, y: h - pad - t * (h - pad * 2) * .72 + (r() - .5) * (h - pad * 2) * .34, p, i };
  });
}
function constellation(skill, w, h, pad, big) {
  const pts = layout(skill, w, h, pad), st = Core.stage(skill.id), done = Core.done(skill);
  const dN = pts.slice(0, st + 1);
  const len = a => a.reduce((s, q, k) => (k ? s + Math.hypot(q.x - a[k - 1].x, q.y - a[k - 1].y) : 0), 0);
  const path = a => a.map((q, k) => `${k ? 'L' : 'M'}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ');
  const rs = big ? 1.5 : 1;
  return `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">
    <path class="ln-todo" d="${path(pts)}" fill="none"/>
    ${dN.length > 1 ? `<path class="ln-done draw" style="--len:${len(dN).toFixed(0)}" d="${path(dN)}" fill="none"/>` : ''}
    ${pts.map(q => {
      const k = q.i < st || done ? 'done' : q.i === st ? 'cur' : 'todo';
      return `<g data-node="${q.i}">
        ${k === 'cur' ? `<circle class="halo" cx="${q.x}" cy="${q.y}" r="${5 * rs}"/>` : ''}
        <circle class="nd-${k}" cx="${q.x}" cy="${q.y}" r="${(k === 'todo' ? 2.6 : k === 'cur' ? 5 : 3.6) * rs}"/>
        ${big ? `<circle class="hit" cx="${q.x}" cy="${q.y}" r="22"/>
        <text class="lbl ${k}" x="${q.x}" y="${q.y + (q.i % 2 ? 26 : -18)}" text-anchor="middle">${Core.esc(q.p.name.length > 22 ? q.p.name.slice(0, 21) + '…' : q.p.name)}</text>` : ''}
      </g>`;
    }).join('')}
  </svg>`;
}

function mount(host) {
  const sr = host.attachShadow({ mode: 'open' });
  sr.innerHTML = `<style>${css}</style><div class="root"><canvas id="sky"></canvas><div id="app"></div></div>`;
  const $ = s => sr.querySelector(s);
  const app = $('#app');
  let runner = null;

  /* Sternenhimmel (Canvas, Parallax) */
  const cv = $('#sky'), ctx = cv.getContext('2d');
  let W, H, stars = [], mx = 0, my = 0, sy = 0, raf = 0;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function size() {
    W = cv.width = innerWidth * devicePixelRatio; H = cv.height = innerHeight * devicePixelRatio;
    stars = Array.from({ length: Math.round(innerWidth * innerHeight / 5200) }, () => ({ x: Math.random(), y: Math.random(), z: Math.random() ** 2, p: Math.random() * 6.28, s: .4 + Math.random() * 1.4 }));
  }
  const onMove = e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; };
  const onScroll = () => { sy = scrollY; };
  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    const d = devicePixelRatio;
    for (const s of stars) {
      const par = (1 - s.z) * 40 + 6;
      const x = (((s.x * W + mx * par * d) % W) + W) % W, y = (((s.y * H - sy * (1 - s.z) * .18 * d + my * par * d) % H) + H) % H;
      ctx.globalAlpha = reduce ? .6 : (.25 + .75 * (.5 + .5 * Math.sin(t / 900 * s.s + s.p))) * (1 - s.z * .5);
      ctx.fillStyle = s.z < .08 ? '#fff1c9' : '#cfd8ff';
      ctx.beginPath(); ctx.arc(x, y, (.5 + (1 - s.z) * 1.1) * d, 0, 6.28); ctx.fill();
    }
    if (!reduce) raf = requestAnimationFrame(frame);
  }
  size();
  addEventListener('resize', size); addEventListener('pointermove', onMove); addEventListener('scroll', onScroll, { passive: true });
  raf = requestAnimationFrame(frame);

  function renderList() {
    const m = Core.skills.filter(Core.done).length;
    let i = 0;
    const label = Core.CATS;
    app.innerHTML = `<div class="wrap">
      <header class="top rv">
        <div class="eyebrow">Calisthenics · Sternkarte</div>
        <h1>Gravity<br><em>Map</em></h1>
        <p class="lede">Jede Progression ist ein Sternbild. Du kletterst Stern für Stern gegen die Schwerkraft — <b>${m} von ${Core.skills.length}</b> Sternbildern sind vollständig erleuchtet.</p>
      </header>
      ${Object.keys(Core.CATS).map(c => `
        <h2 class="cat rv" style="--i:${i}">${label[c]} <span>${Core.CATS[c]}</span></h2>
        <div class="grid">${Core.skills.filter(s => s.category === c).map(s => {
          const st = Core.stage(s.id), n = s.progressions.length, d = Core.done(s);
          return `<button class="card rv ${d ? 'mastered' : ''}" style="--i:${++i}" data-open="${s.id}">
            ${constellation(s, 300, 150, 22, false)}
            <div class="c-name">${s.name}</div>
            <div class="c-sub"><span>${d ? 'vollständig erleuchtet' : Core.esc(s.progressions[st].name)}</span><b>${st + (d ? 1 : 0)}/${n}</b></div>
          </button>`; }).join('')}</div>`).join('')}
    </div>`;
  }

  function renderDetail(id) {
    const s = Core.byId(id), st = Core.stage(id), p = s.progressions[st], n = s.progressions.length, last = Core.done(s);
    const hist = Core.history(id);
    app.innerHTML = `<div class="wrap">
      <button class="back" data-back>← Sternkarte</button>
      <div class="d-title rv">${s.name}</div>
      <div class="d-meta rv" style="--i:1">${Core.CATS[s.category]} · ${n} Sterne · ${last ? 'erleuchtet' : 'Stufe ' + (st + 1)}</div>
      <div class="big-sky rv" style="--i:2">${constellation(s, 360, 250, 34, true)}</div>
      <div class="tip" id="tip">${Core.esc(p.name)}<small>${Core.target(p)}</small></div>
      <div class="now rv" style="--i:3">
        <small>${last ? 'Höchste Stufe' : 'Nächster Stern'}</small>
        <div class="t">${Core.esc(p.name)}</div><div class="g">${Core.target(p)}</div>
        <button class="ignite" data-run><i>▶</i> Zünden</button>
      </div>
      <div class="actions">
        ${!last ? '<button class="ghost" data-master>Stufe / Meisterschaft bestätigen ↑</button>' : ''}
        ${st > 0 || last ? '<button class="ghost" data-down>Einen zurück ↓</button>' : ''}
      </div>
      <h3 class="sub">Alle Sterne</h3>
      <div class="chainlist">${s.progressions.map((q, k) => `<div class="row ${k < st ? 'done' : k === st ? 'cur' : ''}" data-vrow><em>${Core.esc(q.name)}</em><span class="g">${Core.short(q)}<button class="vbtn" data-video="${k}">Video</button></span></div>`).join('')}</div>
      ${hist.length ? `<h3 class="sub">Logbuch</h3><div class="chainlist">${hist.slice().reverse().map(h => `<div class="row done"><em>${h.reset ? '↓ ' : '✓ '}${Core.esc(h.name)}</em><span class="g">${Core.date(h.masteredAt)}</span></div>`).join('')}</div>` : ''}
    </div>`;
    scrollTo(0, 0);
  }

  function renderRun(r) {
    let el = $('#run');
    if (!el) { el = document.createElement('div'); el.id = 'run'; $('.root').appendChild(el); }
    const b = r.p, isHold = r.isHold, R = 150, C = 2 * Math.PI * R;
    const frac = r.phase === 'done' ? 1 : r.phase === 'work' && !isHold ? Math.min(1, r.workMs / 1000 / 30) : r.total ? 1 - r.left / r.total : 0;
    const ang = frac * 2 * Math.PI - Math.PI / 2, px = 170 + R * Math.cos(ang), py = 170 + R * Math.sin(ang);
    const num = r.phase === 'done' ? '✓' : r.phase === 'work' && !isHold ? r.reps : Core.secs(r.left);
    const sig = r.sig();
    if (el.dataset.sig === sig) {
      el.querySelector('.arc').setAttribute('stroke-dashoffset', C * (1 - frac));
      const pl = el.querySelector('.planet'); pl.setAttribute('cx', px); pl.setAttribute('cy', py);
      el.querySelector('.n').textContent = num; return;
    }
    el.dataset.sig = sig; el.className = 'run ' + r.phase;
    const ph = { prep: 'bereit machen', work: isHold ? 'halten' : 'Ziel ' + b.reps + ' Wdh', rest: 'schweben', done: r.metTarget() ? 'Ziel erreicht' : 'geschafft' }[r.phase];
    const moons = Array.from({ length: r.sets }, (_, k) => `<i class="${k < r.logCur.length ? 'on' : k === r.si && r.phase !== 'done' ? 'cur' : ''}"></i>`).join('');
    const unit = r.phase === 'done' ? r.log[0].join(' · ') + (r.blocks[0].type === 'hold' ? ' s' : ' Wdh') : r.phase === 'work' && !isHold ? 'Wiederholungen' : 'Sekunden';
    el.innerHTML = `
      <div class="r-top"><div><div class="a">${r.phase === 'done' ? 'Workout komplett' : `${r.skill.name} · Übung ${r.bi + 1}/${r.blocks.length} · ${b.role} · Umlauf ${r.si + 1}/${r.sets}`}</div><div class="b">${Core.esc(r.phase === 'done' ? r.skill.name : b.name)}</div>
        ${r.phase !== 'done' ? '<button class="skipb" data-skipblock>Übung überspringen →</button>' : ''}</div><button class="x" data-exit>Abbrechen ✕</button></div>
      <div class="r-mid">
        <div class="ring"><svg viewBox="0 0 340 340">
          ${Array.from({ length: 60 }, (_, k) => { const a = k / 60 * 6.283, l = k % 5 ? 4 : 9; return `<line class="tick" x1="${170 + (R + 14) * Math.cos(a)}" y1="${170 + (R + 14) * Math.sin(a)}" x2="${170 + (R + 14 + l) * Math.cos(a)}" y2="${170 + (R + 14 + l) * Math.sin(a)}"/>`; }).join('')}
          <circle class="trk" cx="170" cy="170" r="${R}"/>
          <circle class="arc" cx="170" cy="170" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}" transform="rotate(-90 170 170)"/>
          <circle class="planet" cx="${px}" cy="${py}" r="7"/>
        </svg><div class="core"><div class="ph">${ph}</div><div class="n">${num}</div><div class="u">${unit}</div></div></div>
        ${r.phase === 'work' && !isHold ? '<div class="adj"><button data-adj="-1">−</button><button data-adj="1">+</button></div>' : ''}
        ${r.phase === 'done' ? `<div class="rpe">${Core.RPE.map(o => `<button class="${r.rpe === o.id ? 'on' : ''}" data-rpe="${o.id}">${o.label}</button>`).join('')}</div>` : `<div class="moons">${moons}</div>`}
        <div class="r-sub">${r.phase === 'done' ? 'Bewerte das Workout und speichere es.' : r.phase === 'rest' ? (r.si + 1 < r.p.sets ? 'Schwerelos. Gleich folgt Umlauf ' + (r.si + 2) + '.' : 'Schwerelos. Gleich: ' + (r.blocks[r.bi + 1]?.name || 'Ende')) : Core.target(b)}</div>
      </div>
      ${r.phase === 'done' ? Core.qualityHTML(r) : ''}
      <div class="r-bot">
        ${r.phase === 'work' ? `<button class="rb pri" data-fin>${isHold ? 'Früher beenden' : 'Satz fertig'}</button>` : ''}
        ${r.phase === 'rest' ? '<button class="rb" data-add>+30s</button><button class="rb pri" data-skip>Weiter</button>' : ''}
        ${r.phase === 'prep' ? '<button class="rb pri" data-skip>Los</button>' : ''}
        ${r.phase === 'done' ? '<button class="rb pri" data-save>Speichern</button>' : `<button class="rb" data-pause>${r.paused ? 'Weiter' : 'Pause'}</button>`}
      </div>`;
  }

  function closeRun() { if (runner) runner.stop(); runner = null; $('#run')?.remove(); }
  function route() { const id = Core.hash(); id && Core.byId(id) ? renderDetail(id) : renderList(); }

  let saving = false;
  const onClick = async e => {
    if (saving) return;
    try {
    const t = e.target.closest(SEL);
    if (!t) return;
    const id = Core.hash(), ds = t.dataset;
    if ('node' in ds) { const tip = $('#tip'); if (tip) { const q = Core.byId(id).progressions[+ds.node]; tip.innerHTML = `${Core.esc(q.name)}<small>${Core.target(q)}</small>`; } return; }
    if (runner && Core.act(runner, ds)) return;
    if (ds.open) { Core.setHash(ds.open); route(); }
    else if ('back' in ds) { Core.setHash(null); route(); }
    else if ('run' in ds) { runner = Core.runner(Core.byId(id), Core.stage(id), renderRun); runner.start(); }
    else if ('master' in ds) { saving = true; await Core.master(Core.byId(id)); renderDetail(id); }
    else if ('down' in ds) { saving = true; if (await Core.downgrade(Core.byId(id))) renderDetail(id); }
    else if ('save' in ds) { saving = true; await Core.saveWorkout(runner); closeRun(); renderDetail(id); }
    else if ('exit' in ds) closeRun();
    else if ('video' in ds) Core.toggleVideo(t, Core.byId(id).progressions[+ds.video].name);
    } catch (error) { window.alert(`Nicht gespeichert: ${error.message}`); } finally { saving = false; }
  };
  const onPointer = e => {
    const c = e.target.closest?.('.card') || e.composedPath?.().find(n => n.classList?.contains('card'));
    if (!c) return;
    const b = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - b.left) + 'px'); c.style.setProperty('--my', (e.clientY - b.top) + 'px');
  };
  const onKey = e => { if (e.key === 'Escape') closeRun(); };
  const onQuality = e => Core.qualityInput(runner,e.target);
  sr.addEventListener('input',onQuality);
  const stopProgress = Core.subscribe(() => { if (!runner) route(); });
  sr.addEventListener('click', onClick); sr.addEventListener('pointermove', onPointer);
  addEventListener('keydown', onKey);
  route();

  return () => {
    stopProgress(); sr.removeEventListener('input',onQuality); closeRun(); cancelAnimationFrame(raf);
    removeEventListener('resize', size); removeEventListener('pointermove', onMove); removeEventListener('scroll', onScroll); removeEventListener('keydown', onKey);
  };
}

export default {
  id: 'b', name: 'Gravity Map', hint: 'Sternkarte · Sternbild je Skill',
  swatch: ['#04050a', '#c8ff00', '#8fb6ff'], bg: '#04050a',
  fonts: 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Mono:wght@300;400;500&display=swap',
  mount,
};
