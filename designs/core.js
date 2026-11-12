// All designs use the Skills event store; there is no design-specific progress copy.
import { SKILLS } from '../data/catalog.js';
import { buildWorkoutBlocks } from '../runner/blocks.js';
import { createRunner } from '../runner/engine.js';
import { attachRunnerLifecycle } from '../runner/lifecycle.js';
import { runnerView } from '../runner/view.js';
import { videoForExercise } from '../ExerciseVideo.jsx';
import { designProgress } from '../data/designProgress.js';
import { progressStore } from '../data/store.js';
import { attachNav } from '../navigation.js';
const PREP_MS = 3000;
// Embedded hosts own the skill route. While a bridge is installed, hash reads
// and writes stay off location/history. Standalone leaves the bridge unset.
let routeBridge = null;
const routeWatchers = new Set();

export function bindEmbeddedRoute(bridge) {
  const previous = routeBridge;
  routeBridge = bridge || null;
  return () => { if (routeBridge === bridge) routeBridge = previous; };
}

export function notifyEmbeddedRoute() {
  for (const fn of [...routeWatchers]) fn();
}
// Der Design-Switcher blendet sich aus, solange ein Workout läuft.
const announce = active => window.dispatchEvent(new CustomEvent('skills-runner', { detail: active }));
const entry = id => designProgress.entry(id);

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const Core = {
  skills: SKILLS,
  CATS: designProgress.categories,
  RPE: [{ id: 'easy', label: 'Leicht' }, { id: 'optimal', label: 'Optimal' }, { id: 'limit', label: 'Am Limit' }],
  esc,
  byId: id => SKILLS.find(s => s.id === id),
  // `stage` is the unlocked frontier; `trainStage` may point at any already unlocked stage.
  stage: id => entry(id).stage ?? 0,
  trainStage(id) { return Math.min(Core.selected[id] ?? Core.stage(id), Core.stage(id)); },
  setTrain(id, k) { if (Number.isInteger(k) && k >= 0 && k <= Core.stage(id)) Core.selected[id] = k; },
  selected: {},
  runView: r => runnerView(r, entry(r.skill.id).exp || 0),
  runNum(r) { const v = Core.runView(r); return v.phase === 'done' ? '✓' : v.value; },
  exp: id => entry(id).exp || 0,
  // Live text while the stopwatch runs: target reached / extra performance.
  paintLive(el, r) {
    const v = Core.runView(r), sub = el.querySelector('.r-sub');
    if (v.phase === 'work' && sub) sub.textContent = v.hint;
    el.classList.toggle('target-reached', v.reached);
  },
  history: id => entry(id).history ?? [],
  sessions: id => entry(id).sessions ?? [],
  done: s => entry(s.id).mastered === true,
  target: p => (p.type === 'hold' ? `${p.sets}×${p.seconds}s halten` : `${p.sets}×${p.reps} Wdh`),
  short: p => (p.type === 'hold' ? `${p.sets}×${p.seconds}s` : `${p.sets}×${p.reps}`),
  pad: n => String(n).padStart(2, '0'),
  secs: ms => Math.ceil(Math.max(0, ms) / 1000),
  date: iso => new Date(iso).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: '2-digit' }),

  // Skill-URL: gleicher Hash-Param wie die Original-Karte (#?skill=<id>).
  // Eingebettet liest und schreibt das die Shell-Route, nicht den Hash.
  hash() {
    if (routeBridge) return routeBridge.get() || null;
    const q = new URLSearchParams(location.hash.split('?')[1] || '');
    return q.get('skill');
  },
  setHash(id) {
    if (routeBridge) { routeBridge.set(id || ''); return; }
    const [path = ''] = location.hash.replace(/^#\/?/, '').split('?');
    history.replaceState(null, '', `#${path}${id ? `?skill=${id}` : ''}`);
  },
  watchRoute(fn) {
    routeWatchers.add(fn);
    return () => routeWatchers.delete(fn);
  },

  // Wischen + Tastatur (siehe navigation.js); `enabled` sperrt sie während eines Workouts.
  // Externe Routenwechsel (Shell) laufen über denselben Abbau, solange kein Workout läuft.
  nav(root, route, enabled) {
    const stopRoute = Core.watchRoute(() => { if (enabled()) route(); });
    const detach = attachNav({
      skills: SKILLS, root, rows: '[data-open]', current: Core.hash, enabled,
      go: id => { Core.setHash(id); route(); if (id) scrollTo(0, 0); },
    });
    return () => { stopRoute(); detach(); };
  },

  // EXP bar for the unlocked frontier; the next stage stays locked until 100 %.
  expHTML(id) {
    const s = Core.byId(id), e = entry(id), st = e.stage ?? 0, next = s.progressions[st + 1];
    const pct = Math.min(100, Math.round(e.exp || 0));
    const note = e.mastered ? 'Skill gemeistert' : next ? `Noch ${100 - pct} % bis „${esc(next.name)}“ – bis dahin gesperrt` : 'Noch nicht gemeistert – 100 % EXP für die Meisterschaft';
    return `<div class="exp" role="group" aria-label="EXP"><div style="display:flex;justify-content:space-between;font:700 12px system-ui"><span>EXP ${pct} %</span><span>${note}</span></div>
      <div style="height:8px;border-radius:4px;background:rgba(127,127,127,.28);margin-top:6px;overflow:hidden"><div style="height:100%;width:${pct}%;background:currentColor"></div></div></div>`;
  },
  saveWorkout: r => designProgress.saveWorkout(r.skill,r.stage,r.sessionData(),r.quality,r.owner),
  qualityHTML(r) {
    const q = r.quality || {};
    return `<fieldset style="display:grid;gap:8px;padding:12px;font:12px system-ui">
      <label><input type="checkbox" data-quality="techniqueConfirmed" ${q.techniqueConfirmed ? 'checked' : ''}> Technik sauber eingehalten</label>
      ${r.blocks[0].sidePolicy === 'both' ? `<label><input type="checkbox" data-quality="bothSidesConfirmed" ${q.bothSidesConfirmed ? 'checked' : ''}> Zielwerte auf beiden Seiten erreicht; schwächere Seite geloggt</label>` : ''}
      <label>Unterstützung / Band <input data-quality="assistance" value="${esc(q.assistance || '')}" style="color:#111"></label>
      <label>Zusatzgewicht (kg) <input type="number" min="0" step="0.5" data-quality="addedLoadKg" value="${esc(q.addedLoadKg || '')}" style="color:#111"></label>
    </fieldset>`;
  },
  qualityInput(r,target) {
    if (!r) return;
    if (target.dataset.result !== undefined) { r.correctSet(r.bi,r.si,Number(target.value),{live:true}); const out = target.parentElement?.querySelector('[data-result-out]'); if (out) out.textContent = target.value; return; }
    if (!target.dataset.quality) return;
    r.quality ||= {};
    r.quality[target.dataset.quality] = target.type === 'checkbox' ? target.checked : target.value;
    r.persist?.();
  },
  resultHTML(r) {
    const v = Core.runView(r);
    if (!v.slider) return '';
    return `<label style="display:block;padding:12px;font:700 13px system-ui">Letzter Satz: <output data-result-out>${v.slider.value}</output> ${v.unit}${v.slider.reachedTarget ? ' · Ziel erreicht' : ` · Ziel ${v.target} ${v.unit}`}
      <input data-result type="range" min="${v.slider.min}" max="${v.slider.max}" step="${v.slider.step}" value="${v.slider.value}" aria-label="Ergebnis des letzten Satzes anpassen" style="width:100%;min-height:44px"></label>`;
  },
  subscribe: designProgress.subscribe,

  // Runner: prep → work → rest über Primär/Sekundär/Conditioning-Blöcke (wie WorkoutRunner)
  runner(skill, stage, onUpdate) {
    const owner = progressStore.getSnapshot().owner;
    const saved = progressStore.runner();
    const resume = saved?.skillId === skill.id && saved?.stage === stage ? saved : null;
    const r = createRunner({ skill, stage, blocks: buildWorkoutBlocks(skill,stage), resume,
      onUpdate, onPersist: snapshot => progressStore.saveRunner(snapshot,owner) });
    r.owner = owner;
    const start = r.start, stop = r.stop;
    let detach;
    r.start = () => { detach?.(); detach = attachRunnerLifecycle(r); start(); announce(true); };
    r.stop = (options) => { detach?.(); stop(options); announce(false); };
    return r;
  },
  // gemeinsame Runner-Buttons; true = behandelt
  act(r, ds) {
    if ('fin' in ds) r.finishSet();
    else if ('skip' in ds) r.skip();
    else if ('pause' in ds) r.pause();
    else if ('add' in ds) r.addRest();
    else if ('adj' in ds) r.adj(+ds.adj);
    else if ('end' in ds) r.endEarly();
    else if ('skipblock' in ds) r.skipBlock();
    else if ('rpe' in ds) r.setRpe(ds.rpe);
    else return false;
    return true;
  },

  // Übungsvideos: gleiche Zuordnung/Prüfung wie ExerciseVideo.jsx
  videoHTML(name) {
    const v = videoForExercise(name);
    if (!v) return `<p class="vnote">Für ${esc(name)} ist noch kein Video hinterlegt.</p>`;
    const orig = v.source || `https://www.youtube.com/watch?v=${v.youtubeId}`;
    const media = v.kind === 'demo'
      ? `<video src="${esc(v.url)}" autoplay muted loop playsinline controls preload="metadata"></video>`
      : `<iframe src="https://www.youtube-nocookie.com/embed/${v.youtubeId}?rel=0&playsinline=1&mute=1&loop=1&playlist=${v.youtubeId}${v.startSeconds ? `&start=${+v.startSeconds}` : ''}" title="Übungsvideo: ${esc(name)}" allow="encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    return `${media}<p class="vnote">${esc(v.note || v.title || '')} <a href="${esc(orig)}" target="_blank" rel="noopener noreferrer">Original · ${esc(v.author || '')}</a></p>`;
  },
  toggleVideo(trigger, name) {
    const row = trigger.closest('[data-vrow]');
    if (!row) return;
    const next = row.nextElementSibling;
    if (next?.classList.contains('vid')) { next.remove(); return; }
    row.insertAdjacentHTML('afterend', `<div class="vid">${Core.videoHTML(name)}</div>`);
  },
};
export default Core;
