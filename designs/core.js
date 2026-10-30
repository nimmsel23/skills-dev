// All designs use the Skills event store; there is no design-specific progress copy.
import { SKILLS, buildWorkoutBlocks } from '../SkillsCard.jsx';
import { videoForExercise } from '../ExerciseVideo.jsx';
import { designProgress } from '../data/designProgress.js';
import { progressStore } from '../data/store.js';
import { attachNav } from '../navigation.js';
const PREP_MS = 3000;
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
  stage: id => entry(id).stage ?? 0,
  history: id => entry(id).history ?? [],
  sessions: id => entry(id).sessions ?? [],
  done: s => entry(s.id).mastered === true,
  target: p => (p.type === 'hold' ? `${p.sets}×${p.seconds}s halten` : `${p.sets}×${p.reps} Wdh`),
  short: p => (p.type === 'hold' ? `${p.sets}×${p.seconds}s` : `${p.sets}×${p.reps}`),
  pad: n => String(n).padStart(2, '0'),
  secs: ms => Math.ceil(Math.max(0, ms) / 1000),
  date: iso => new Date(iso).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: '2-digit' }),

  // Skill-URL: gleicher Hash-Param wie die Original-Karte (#?skill=<id>)
  hash() { const q = new URLSearchParams(location.hash.split('?')[1] || ''); return q.get('skill'); },
  setHash(id) {
    const [path = ''] = location.hash.replace(/^#\/?/, '').split('?');
    history.replaceState(null, '', `#${path}${id ? `?skill=${id}` : ''}`);
  },

  // Wischen + Tastatur (siehe navigation.js); `enabled` sperrt sie während eines Workouts.
  nav: (root, route, enabled) => attachNav({
    skills: SKILLS, root, rows: '[data-open]', current: Core.hash, enabled,
    go: id => { Core.setHash(id); route(); if (id) scrollTo(0, 0); },
  }),

  master: skill => designProgress.master(skill),
  downgrade: skill => designProgress.downgrade(skill),
  saveWorkout: r => designProgress.saveWorkout(r.skill,r.stage,r.sessionData(),r.quality),
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
    if (!r || !target.dataset.quality) return;
    r.quality ||= {};
    r.quality[target.dataset.quality] = target.type === 'checkbox' ? target.checked : target.value;
    r.persist?.();
  },
  subscribe: designProgress.subscribe,

  // Runner: prep → work → rest über Primär/Sekundär/Conditioning-Blöcke (wie WorkoutRunner)
  runner(skill, stage, onUpdate) {
    const blocks = buildWorkoutBlocks(skill, stage);
    const owner = progressStore.getSnapshot().owner;
    const saved = progressStore.runner();
    const resume = saved?.skillId === skill.id && saved?.stage === stage ? saved : null;
    const r = { skill, stage, blocks, bi: 0, si: 0, phase: 'prep', total: PREP_MS, left: PREP_MS, workMs: 0, paused: false, rpe: null, startedAt: Date.now(), log: blocks.map(() => []), reps: blocks[0].type === 'reps' ? blocks[0].reps : 0 };
    if (resume) {
      Object.assign(r,{bi:resume.blockIndex,si:resume.setIndex,phase:resume.phase === 'done' ? 'done' : 'prep',log:resume.log,rpe:resume.rpe,startedAt:resume.startedAt,quality:resume.quality || {}});
      r.reps = resume.actualReps ?? (blocks[r.bi].reps || 0);
    }
    let lastSnapshot = '';
    r.persist = () => {
      const snapshot = {skillId:skill.id,stage,stageId:skill.progressions[stage].id,blockIndex:r.bi,setIndex:r.si,phase:r.phase,log:r.log,rpe:r.rpe,startedAt:r.startedAt,actualReps:r.reps,quality:r.quality || {}};
      const serialized = JSON.stringify(snapshot);
      if (serialized !== lastSnapshot) {
        lastSnapshot = serialized;
        progressStore.saveRunner(snapshot,owner).catch(() => {});
      }
    };
    const renderUpdate = onUpdate;
    onUpdate = value => {r.persist();renderUpdate(value);};
    Object.defineProperties(r, {
      p: { get: () => r.blocks[r.bi] },
      set: { get: () => r.si + 1 },
      sets: { get: () => r.blocks[r.bi].sets },
      logCur: { get: () => r.log[r.bi] },
      isHold: { get: () => r.blocks[r.bi].type === 'hold' },
    });
    let iv = null;
    const buzz = () => { try { navigator.vibrate?.(60); } catch { /* egal */ } };
    const go = (phase, ms) => { r.phase = phase; r.total = ms; r.left = ms; r.workMs = 0; if (phase === 'work') r.reps = r.p.type === 'reps' ? r.p.reps : 0; buzz(); };
    const finish = () => { r.phase = 'done'; r.left = 0; clearInterval(iv); iv = null; buzz(); };
    function nextSetOrBlock() {
      if (r.si + 1 < r.p.sets) { r.si++; go('prep', PREP_MS); return; }
      if (r.bi + 1 < r.blocks.length) { r.bi++; r.si = 0; go('prep', PREP_MS); return; }
      finish();
    }
    r.finishSet = () => {
      if (r.phase !== 'work') return;
      r.log[r.bi].push(r.isHold ? Math.min(r.p.seconds, Math.round(r.workMs / 1000)) : r.reps);
      const lastOfAll = r.si + 1 >= r.p.sets && r.bi + 1 >= r.blocks.length;
      if (lastOfAll) finish(); else go('rest', r.p.restSeconds * 1000);
      onUpdate(r);
    };
    r.skip = () => { if (r.phase === 'prep') go('work', r.isHold ? r.p.seconds * 1000 : 0); else if (r.phase === 'rest') nextSetOrBlock(); onUpdate(r); };
    r.skipBlock = () => {
      if (r.phase === 'done') return;
      if (r.bi + 1 >= r.blocks.length) finish(); else { r.bi++; r.si = 0; go('prep', PREP_MS); }
      onUpdate(r);
    };
    r.addRest = () => { if (r.phase === 'rest') { r.left += 30000; r.total += 30000; onUpdate(r); } };
    r.adj = d => { if (r.phase === 'work' && !r.isHold) { r.reps = Math.max(0, r.reps + d); onUpdate(r); } };
    r.pause = () => { r.paused = !r.paused; onUpdate(r); };
    r.setRpe = id => { r.rpe = r.rpe === id ? null : id; onUpdate(r); };
    r.sig = () => [r.phase, r.bi, r.si, r.log.map(l => l.length).join('.'), r.paused, r.rpe].join();
    r.metTarget = () => {
      const b = r.blocks[0], l = r.log[0] || [];
      return l.length >= b.sets && l.every(v => (b.type === 'hold' ? v >= b.seconds : v >= b.reps));
    };
    r.sessionData = () => ({
      timestamp: new Date().toISOString(), skillId: skill.id, progressionStage: stage,
      totalDurationSeconds: Math.round((Date.now() - r.startedAt) / 1000), rpe: r.rpe, metTarget: r.metTarget(),
      exercises: r.blocks.map((b, i) => ({ name: b.name, role: b.role, type: b.type, setsCompleted: r.log[i] })),
    });
    r.start = () => { iv = setInterval(tick, 100); announce(true); onUpdate(r); };
    r.stop = () => { clearInterval(iv); iv = null; announce(false); };
    function tick() {
      if (r.paused || r.phase === 'done') return;
      if (r.phase === 'work') {
        r.workMs += 100;
        if (r.isHold) { r.left = Math.max(0, r.p.seconds * 1000 - r.workMs); if (r.left === 0) { r.finishSet(); return; } }
      } else {
        r.left -= 100;
        if (r.left <= 0) { if (r.phase === 'prep') go('work', r.isHold ? r.p.seconds * 1000 : 0); else nextSetOrBlock(); }
      }
      onUpdate(r);
    }
    return r;
  },
  // gemeinsame Runner-Buttons; true = behandelt
  act(r, ds) {
    if ('fin' in ds) r.finishSet();
    else if ('skip' in ds) r.skip();
    else if ('pause' in ds) r.pause();
    else if ('add' in ds) r.addRest();
    else if ('adj' in ds) r.adj(+ds.adj);
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
