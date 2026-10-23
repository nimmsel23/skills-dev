// Design C — „Riso Climb“: heller Risodruck-Zine, Sticker-Karten, Türme & Treppe.
import Core from './core.js';
import css from './c-riso-climb.css?inline';

const SEL = '[data-filter],[data-open],[data-back],[data-run],[data-master],[data-down],[data-fin],[data-skip],[data-pause],[data-add],[data-adj],[data-skipblock],[data-rpe],[data-save],[data-exit],[data-video]';
const NAME = Core.CATS;

function mount(host) {
  const sr = host.attachShadow({ mode: 'open' });
  sr.innerHTML = `<style>${css}</style><div class="root"><div id="app"></div></div>`;
  const $ = s => sr.querySelector(s);
  const app = $('#app');
  let runner = null, filter = 'all';

  function renderList() {
    const m = Core.skills.filter(Core.done).length;
    const list = Core.skills.filter(s => filter === 'all' || s.category === filter);
    app.innerHTML = `<div class="wrap">
      <header class="top"><div class="blob"></div><div class="blob b2"></div>
        <h1><span data-t="skills">skills</span><br><span data-t="climb.">climb.</span></h1>
        <div class="tagline">${m} von ${Core.skills.length} gemeistert</div>
      </header>
      <nav class="tabs">${['all', ...Object.keys(Core.CATS)].map(c => `<button class="tab ${filter === c ? 'on' : ''}" data-c="${c}" data-filter="${c}">${c === 'all' ? 'alle' : c}<small>${c === 'all' ? Core.skills.length : Core.skills.filter(s => s.category === c).length}</small></button>`).join('')}</nav>
      <div class="grid">
        ${list.map((s, i) => {
          const st = Core.stage(s.id), n = s.progressions.length, d = Core.done(s);
          const rot = ((i * 37) % 5 - 2) * .55;
          return `<button class="card rv ${d ? 'done' : ''}" data-cat="${s.category}" data-open="${s.id}" style="--r:${rot}deg;--i:${i}">
            ${d ? '<span class="burst">meis-<br>tert!</span>' : ''}
            <div><div class="k"><i></i>${NAME[s.category]}</div>
            <div class="nm">${s.name}</div>
            <div class="st">${d ? 'ganz oben angekommen.' : `stufe ${st + 1}/${n}<br>→ ${Core.esc(s.progressions[st].name)}`}</div></div>
            <div class="tower">${s.progressions.map((_, k) => `<i class="${k < st || d ? 'on' : k === st ? 'cur' : ''}" style="--o:${((k * 7) % 5 - 2) * 2}px"></i>`).join('')}</div>
          </button>`;
        }).join('')}
      </div>
    </div>`;
  }

  function renderDetail(id) {
    const s = Core.byId(id), st = Core.stage(id), p = s.progressions[st], n = s.progressions.length, last = Core.done(s);
    const hist = Core.history(id);
    app.innerHTML = `<div class="wrap">
      <button class="back" data-back>← zurück</button>
      <div class="d-title"><span data-t="${Core.esc(s.name.toLowerCase())}">${s.name.toLowerCase()}</span></div>
      <div class="tagline" style="margin-top:18px">${NAME[s.category]} · ${n} stufen</div>
      <div class="stairs-box">
        <h3>die treppe</h3>
        <div class="stairs">
          ${s.progressions.map((q, k) => {
            const h = 150 + k * (190 / Math.max(1, n - 1));
            return `<div class="step ${k < st ? 'done' : k === st ? 'cur' : ''}" data-cat="${s.category}" style="height:${h}px" title="${Core.esc(q.name)} — ${Core.target(q)}">
              <b>${k + 1}</b><span>${Core.esc(q.name)}</span>
              ${k === st ? '<div class="climber"><i></i></div>' : ''}${k === n - 1 && !last ? '<div class="flag"></div>' : ''}
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="now">
        <div class="in"><small>${last ? 'oben angekommen' : 'jetzt auf der treppe'}</small><div class="t">${Core.esc(p.name)}</div><div class="g">${Core.target(p)}</div></div>
        <button class="go" data-run>workout starten <b>▶</b></button>
      </div>
      <div class="actions">
        ${!last ? '<button class="ghost" data-master>Stufe / Meisterschaft bestätigen ↑</button>' : ''}
        ${st > 0 || last ? '<button class="ghost" data-down>eine zurück ↓</button>' : ''}
      </div>
      <h3 class="sub">alle stufen</h3>
      <div class="chainlist">${s.progressions.map((q, k) => `<div class="row ${k < st ? 'done' : k === st ? 'cur' : ''}" data-vrow><span>${k + 1}. ${Core.esc(q.name)}</span><span class="g">${Core.short(q)}<button class="vbtn" data-video="${k}">video</button></span></div>`).join('')}</div>
      ${hist.length ? `<h3 class="sub">logbuch</h3><div class="chainlist">${hist.slice().reverse().map(h => `<div class="row done"><span>${h.reset ? '↓ ' : '✓ '}${Core.esc(h.name)}</span><span class="g">${Core.date(h.masteredAt)}</span></div>`).join('')}</div>` : ''}
    </div>`;
    scrollTo(0, 0);
  }

  function confetti(el) {
    const cols = ['#ff5fa2', '#2f45ff', '#c8ff00', '#ffc233', '#fffaf0'];
    for (let i = 0; i < 46; i++) {
      const c = document.createElement('i'); c.className = 'confetti';
      c.style.cssText = `left:${Math.random() * 100}%;background:${cols[i % 5]};animation-duration:${1.6 + Math.random() * 1.6}s;animation-delay:${Math.random() * .5}s;transform:rotate(${Math.random() * 360}deg)`;
      el.appendChild(c);
    }
  }

  function renderRun(r) {
    let el = $('#run');
    if (!el) { el = document.createElement('div'); el.id = 'run'; $('.root').appendChild(el); }
    const b = r.p, isHold = r.isHold;
    const num = r.phase === 'done' ? '✓' : r.phase === 'work' && !isHold ? r.reps : Core.secs(r.left);
    const sig = r.sig();
    if (el.dataset.sig === sig) {
      const nEl = el.querySelector('.n');
      if (nEl.textContent != num) { nEl.textContent = num; nEl.classList.remove('pop'); void nEl.offsetWidth; nEl.classList.add('pop'); }
      return;
    }
    el.dataset.sig = sig; el.className = 'run ' + r.phase;
    const ph = { prep: 'mach dich bereit', work: isHold ? 'halten!' : `ziel: ${b.reps} wdh`, rest: 'verschnaufen', done: r.metTarget() ? 'ziel erreicht!' : 'geschafft!' }[r.phase];
    const checks = Array.from({ length: r.sets }, (_, k) => `<i class="${k < r.logCur.length ? 'on' : k === r.si && r.phase !== 'done' ? 'cur' : ''}">${k < r.logCur.length ? '✓' : ''}</i>`).join('');
    const unit = r.phase === 'done' ? r.log[0].join(' · ') + (r.blocks[0].type === 'hold' ? ' sek' : ' wdh') : r.phase === 'work' && !isHold ? 'wiederholungen' : 'sekunden';
    el.innerHTML = `
      <div class="r-top"><div><div class="a">${r.phase === 'done' ? 'workout komplett' : `${r.skill.name} · ${b.role} ${r.bi + 1}/${r.blocks.length} · satz ${r.si + 1}/${r.sets}`}</div><div class="b">${Core.esc(r.phase === 'done' ? r.skill.name : b.name)}</div>
        ${r.phase !== 'done' ? '<button class="skipb" data-skipblock>übung überspringen →</button>' : ''}</div><button class="x" data-exit>✕</button></div>
      <div class="r-mid">
        <div class="disc"><div class="ph">${ph}</div><div class="n pop">${num}</div><div class="u">${unit}</div></div>
        ${r.phase === 'work' && !isHold ? '<div class="adj"><button data-adj="-1">−</button><button data-adj="1">+</button></div>' : ''}
        ${r.phase === 'done' ? `<div class="rpe">${Core.RPE.map(o => `<button class="${r.rpe === o.id ? 'on' : ''}" data-rpe="${o.id}">${o.label.toLowerCase()}</button>`).join('')}</div>` : `<div class="checks">${checks}</div>`}
        <div class="r-sub">${r.phase === 'done' ? 'bewerte das workout und speichere es.' : r.phase === 'rest' ? (r.si + 1 < r.p.sets ? `gleich: satz ${r.si + 2}` : `gleich: ${Core.esc(r.blocks[r.bi + 1]?.name || 'ende')}`) : Core.target(b)}</div>
      </div>
      ${r.phase === 'done' ? Core.qualityHTML(r) : ''}
      <div class="r-bot">
        ${r.phase === 'work' ? `<button class="rb pri" data-fin>${isHold ? 'früher beenden' : 'satz fertig ✓'}</button>` : ''}
        ${r.phase === 'rest' ? '<button class="rb" data-add>+30s</button><button class="rb pri" data-skip>weiter</button>' : ''}
        ${r.phase === 'prep' ? '<button class="rb pri" data-skip>los!</button>' : ''}
        ${r.phase === 'done' ? '<button class="rb pri" data-save>speichern</button>' : `<button class="rb" data-pause>${r.paused ? 'weiter' : 'pause'}</button>`}
      </div>`;
    if (r.phase === 'done') confetti(el);
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
    if (runner && Core.act(runner, ds)) return;
    if (ds.filter) { filter = ds.filter; renderList(); }
    else if (ds.open) { Core.setHash(ds.open); route(); }
    else if ('back' in ds) { Core.setHash(null); route(); }
    else if ('run' in ds) { runner = Core.runner(Core.byId(id), Core.stage(id), renderRun); runner.start(); }
    else if ('master' in ds) { saving = true; await Core.master(Core.byId(id)); renderDetail(id); }
    else if ('down' in ds) { saving = true; if (await Core.downgrade(Core.byId(id))) renderDetail(id); }
    else if ('save' in ds) { saving = true; await Core.saveWorkout(runner); closeRun(); renderDetail(id); }
    else if ('exit' in ds) closeRun();
    else if ('video' in ds) Core.toggleVideo(t, Core.byId(id).progressions[+ds.video].name);
    } catch (error) { window.alert(`Nicht gespeichert: ${error.message}`); } finally { saving = false; }
  };
  const onKey = e => { if (e.key === 'Escape') closeRun(); };
  const onQuality = e => Core.qualityInput(runner,e.target);
  sr.addEventListener('input',onQuality);
  const stopProgress = Core.subscribe(() => { if (!runner) route(); });
  sr.addEventListener('click', onClick);
  addEventListener('keydown', onKey);
  route();

  return () => { stopProgress(); sr.removeEventListener('input',onQuality); closeRun(); sr.removeEventListener('click', onClick); removeEventListener('keydown', onKey); };
}

export default {
  id: 'c', name: 'Riso Climb', hint: 'Hell · Risodruck-Zine & Treppe',
  swatch: ['#f2ecdc', '#ff5fa2', '#2f45ff'], bg: '#f2ecdc',
  fonts: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Fragment+Mono&display=swap',
  mount,
};
