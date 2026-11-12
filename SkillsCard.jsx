import { useEffect, useRef, useState } from 'react';
import ExerciseVideo from './ExerciseVideo.jsx';
import PersistenceStatus from './PersistenceStatus.jsx';
import { ChevronLeft, ChevronRight, Lock, Check, Circle, Play, Pause, Flag, Trophy, ArrowUp, ArrowDown, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { SKILLS } from './data/catalog.js';
import { progressStore } from './data/store.js';
import { useProgress } from './data/useProgress.js';
import { toHostWorkout } from './data/workoutCompletion.js';
import { attachNav, neighborId, orderedIds } from './navigation.js';
import { createRunner } from './runner/engine.js';
import { buildWorkoutBlocks } from './runner/blocks.js';
import { attachRunnerLifecycle } from './runner/lifecycle.js';
import { runnerView } from './runner/view.js';
export { SKILLS, buildWorkoutBlocks };

const SKILL_ORDER = orderedIds(SKILLS);

const CATEGORY_META = {
  push: { Icon: ArrowUp, label:'Drücken' },
  pull: { Icon: ArrowDown, label:'Ziehen' },
  core: { Icon: Activity, label:'Rumpf' },
  legs: { Icon: Activity, label:'Beine' },
  balance: { Icon: Activity, label:'Balance' },
};

// Eigenständiges Hash-Query-Param `skill=<id>` — bewusst nicht über App.jsx's
// zentralen parseHashRoute/buildHashRoute geführt (der kennt nur tab/subTab +
// date), um dessen Session-Routing nicht anzufassen. Segment/Query-Teil vor
// dem `?` bleibt beim Setzen unangetastet.
function getSkillIdFromHash() {
  if (typeof window === 'undefined') return null;
  const [, queryPart = ''] = window.location.hash.split('?');
  return new URLSearchParams(queryPart).get('skill');
}

function setSkillIdInHash(skillId) {
  if (typeof window === 'undefined') return;
  const [pathPart = '', queryPart = ''] = window.location.hash.replace(/^#\/?/, '').split('?');
  const params = new URLSearchParams(queryPart);
  if (skillId) params.set('skill', skillId);
  else params.delete('skill');
  const query = params.toString();
  window.history.replaceState(null, '', `#${pathPart}${query ? `?${query}` : ''}`);
}

function loadActiveRunner() { return progressStore.runner(); }
function clearActiveRunner() { progressStore.saveRunner(null).catch(() => {}); }

function SkillRow({ skill, progress, onOpen, isLast }) {
  const stage = progress[skill.id]?.stage ?? 0;
  const done = progress[skill.id]?.mastered === true;
  return (
    <button
      data-nav-row
      onClick={() => onOpen(skill.id)}
      className="w-full flex items-center justify-between gap-3 px-1 py-3 text-left transition-colors hover:opacity-80"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--line)' }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-fit-ink truncate">{skill.name}</span>
        </div>
        <div className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--dim)' }}>
          {done ? 'Gemeistert' : `Stufe ${stage + 1}/${skill.progressions.length} · ${skill.progressions[stage].name}`}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {done && <Trophy size={13} style={{ color: 'var(--accent)' }} />}
        <ChevronRight size={15} style={{ color: 'var(--dim)', opacity: 0.5 }} />
      </div>
    </button>
  );
}

function CategoryGroup({ category, skills, progress, onOpen }) {
  const meta = CATEGORY_META[category];
  return (
    <div className="mb-4">
      <div className="mb-1 px-1">
        <span className="flex items-center gap-2 text-xs"><meta.Icon size={11} style={{ color: 'var(--dim)', opacity: 0.5 }} /> {meta.label}</span>
      </div>
      <div className="rounded-2xl px-3" style={{ background: 'var(--bg2)' }}>
        {skills.map((skill, i) => (
          <SkillRow key={skill.id} skill={skill} progress={progress} onOpen={onOpen} isLast={i === skills.length - 1} />
        ))}
      </div>
    </div>
  );
}

function SkillListScreen({ progress, onOpen }) {
  const categories = ['push', 'pull', 'core', 'legs', 'balance'].filter(c => SKILLS.some(s => s.category === c));
  return (
    <div>
      {categories.map(category => (
        <CategoryGroup
          key={category}
          category={category}
          skills={SKILLS.filter(s => s.category === category)}
          progress={progress}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

function formatSeconds(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatMasteredAt(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// Zehntelsekunden — Skill-Holds (Front Lever, Planche, L-Sit …) sind oft
// unter 10s, da zählt die Nachkommastelle.
function formatHoldTime(ms) {
  const totalTenths = Math.floor(Math.max(0, ms) / 100);
  return `${Math.floor(totalTenths / 10)}.${totalTenths % 10}s`;
}

// Eingebetteter Hold-Timer je Skill-Stufe — geloggte Attempts landen direkt
// in der Skill-Progress-Struktur (progress[skillId].holds), gefiltert nach
// aktueller Stufe angezeigt. Eigenständige, freie Stoppuhr bleibt daneben in
// WorkoutTimerCard.jsx bestehen, das hier ist bewusst an den Skill gebunden.
function SkillHoldTimer({ stageName, holdsForStage, onLog }) {
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!running) return undefined;
    const interval = window.setInterval(() => setElapsedMs(ms => ms + 100), 100);
    return () => window.clearInterval(interval);
  }, [running]);

  function toggle() {
    setRunning(r => !r);
  }

  function logHold() {
    if (elapsedMs <= 0) return;
    setRunning(false);
    Promise.resolve(onLog(elapsedMs)).then(saved => { if (saved) setElapsedMs(0); });
  }

  const bestMs = holdsForStage.length ? Math.max(...holdsForStage.map(h => h.duration)) : null;

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--bg2)', border: '1px solid var(--line)' }}>
      <div className="text-[10px] font-black uppercase tracking-[0.15em] mb-2" style={{ color: 'var(--dim)' }}>
        Hold-Timer · {stageName}
      </div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-3xl font-black tabular-nums text-fit-ink">{formatHoldTime(elapsedMs)}</div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent)', color: '#000' }}
          >
            {running ? <Pause size={15} strokeWidth={3} /> : <Play size={15} strokeWidth={3} />}
          </button>
          <button
            onClick={logHold}
            disabled={elapsedMs <= 0}
            className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-30"
            style={{ background: 'var(--card)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          >
            <Flag size={14} strokeWidth={2.7} />
          </button>
        </div>
      </div>

      {holdsForStage.length > 0 && (
        <div className="flex flex-col gap-1">
          {holdsForStage.slice().reverse().slice(0, 5).map((h, i) => {
            const isBest = h.duration === bestMs;
            return (
              <div key={h.at} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg" style={{ background: isBest ? 'var(--accent-glow, rgba(200,255,0,0.1))' : 'var(--card)' }}>
                <div className="flex items-center gap-1.5">
                  {isBest && <Trophy size={11} style={{ color: 'var(--accent)' }} />}
                  <span className="text-[10px] font-bold" style={{ color: 'var(--dim)' }}>
                    Versuch {holdsForStage.length - i}
                  </span>
                </div>
                <span className="text-xs font-black tabular-nums" style={{ color: isBest ? 'var(--accent)' : 'var(--ink)' }}>
                  {formatHoldTime(h.duration)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatTarget(p) {
  return p.type === 'hold' ? `${p.sets}× ${p.seconds}s halten` : `${p.sets}× ${p.reps} Wdh`;
}

const RPE_OPTIONS = [
  { id: 'easy', label: 'Leicht' },
  { id: 'optimal', label: 'Optimal' },
  { id: 'limit', label: 'Am Limit' },
];

function WorkoutRunner({ skill, stage, resumeState, onFinish, onExit }) {
  const [, refresh] = useState(0);
  const [runner] = useState(() => {
    const owner = progressStore.getSnapshot().owner;
    const engine = createRunner({ skill, stage, blocks: buildWorkoutBlocks(skill, stage), resume: resumeState,
      onUpdate: () => refresh(n => n + 1),
      onPersist: snapshot => progressStore.saveRunner(snapshot, owner),
    });
    engine.owner = owner;
    return engine;
  });
  useEffect(() => {
    runner.start();
    const detach = attachRunnerLifecycle(runner);
    window.dispatchEvent(new CustomEvent('skills-runner', { detail: true }));
    return () => {
      detach(); runner.stop({ persist: false });
      window.dispatchEvent(new CustomEvent('skills-runner', { detail: false }));
    };
  }, [runner]);
  const { blocks, phase, log, rpe, startedAt, bi: blockIndex, si: setIndex } = runner;
  const view = runnerView(runner, progressStore.getSnapshot().progress?.[skill.id]?.exp || 0);
  const block = runner.p, nextBlock = blocks[blockIndex + 1];
  const skipRest = () => runner.skip();
  const skipBlock = () => runner.skipBlock();
  const setRpe = value => runner.setRpe(value);
  const correctLastSet = value => runner.correctSet(blockIndex, setIndex, Number(value));
  const metTarget = runner.metTarget();
  function handleExit() { runner.suspend('later'); onExit(runner.snapshot()); }
  function saveWorkout() {
    if (runner.owner !== progressStore.getSnapshot().owner) return;
    return onFinish(runner.sessionData());
  }

  const phaseColor = phase === 'rest' ? '#38bdf8' : 'var(--accent)';
  const nextPreviewLabel = (() => {
    if (phase !== 'rest') return null;
    if (setIndex + 1 < block.sets) return `Satz ${setIndex + 2}/${block.sets} ${block.name}`;
    if (nextBlock) return `${nextBlock.role}: ${nextBlock.name}`;
    return 'Letzter Satz — danach fertig';
  })();
  const bigStyle = { color: view.reached ? 'var(--accent)' : undefined };

  return (
    <div
      className="rounded-2xl px-5 py-8 mb-4 text-center transition-colors duration-500"
      style={{ background: phase === 'rest' ? 'rgba(56,189,248,0.1)' : 'var(--accent-glow, rgba(0,0,0,0.05))', border: `1px solid ${phase === 'rest' ? 'rgba(56,189,248,0.35)' : 'var(--line)'}` }}
    >
      {runner.persistenceError && <p role="alert">Nicht gesichert: {runner.persistenceError}</p>}
      {runner.paused && phase !== 'done' && <p role="status" className="text-xs mb-2">{runner.interruption || 'Pausiert'} · Weiter zum Fortsetzen</p>}
      {phase !== 'done' && (
        <>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--dim)' }}>
            {view.blockLabel} · {block.role}
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: phaseColor }}>
            {view.phaseLabel} · {view.setLabel}
          </div>
          <div className="text-lg font-black text-fit-ink mb-3">{block.name}</div>
          {phase !== 'rest' && <ExerciseVideo key={block.name} name={block.name} autoPlay />}

          {phase === 'prep' && (
            <>
              <p className="text-xs mb-4" style={{ color: 'var(--dim)' }}>{view.hint}</p>
              <button onClick={skipRest} className="w-full min-h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-black uppercase tracking-[0.16em]" style={{ background: 'var(--accent)', color: '#fff' }}>
                <Play size={16} strokeWidth={3} /> Start
              </button>
            </>
          )}

          {phase === 'work' && (
            <>
              {/* Holds: Stoppuhr zählt hoch. Wiederholungen: Zielwert, echte Zahl folgt per Slider. */}
              <div className="text-5xl font-black tabular-nums text-fit-ink" style={bigStyle}>
                {view.hold ? `${view.value}s` : `${view.value}×`}
              </div>
              <div className="text-[11px] font-bold mt-1 mb-1" style={{ color: 'var(--dim)' }}>
                {view.hold ? 'Mindestziel' : 'Ziel'} {view.target} {view.hold ? 's' : 'Wdh'}{!view.hold && ` · Laufzeit ${formatHoldTime(runner.workMs)}`}
              </div>
              <p className="text-xs mb-4" style={{ color: view.reached ? 'var(--accent)' : 'var(--dim)' }}>{view.hint}</p>
              <button
                onClick={() => runner.finishSet()}
                className="w-full min-h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-black uppercase tracking-[0.16em]"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                <Check size={16} strokeWidth={3} /> {view.primaryButton}
              </button>
            </>
          )}

          {phase === 'rest' && (
            <>
              <div className="text-5xl font-black tabular-nums text-fit-ink mb-1" style={{ color: view.restReached ? 'var(--accent)' : undefined }}>{view.elapsed}s</div>
              <div className="text-[11px] font-bold mb-3" style={{ color: 'var(--dim)' }}>Pause · empfohlen {view.restTarget}s</div>
              {view.slider && (
                <label className="block text-left mb-4">
                  <span className="block text-xs font-bold text-fit-ink mb-2">
                    Letzter Satz: {view.slider.value} {view.unit}{view.slider.reachedTarget ? ' · Ziel erreicht' : ` · Ziel ${view.target} ${view.unit}`}
                  </span>
                  <input
                    type="range"
                    min={view.slider.min}
                    max={view.slider.max}
                    step={view.slider.step}
                    value={view.slider.value}
                    onChange={event => correctLastSet(event.target.value)}
                    className="skills-reps-slider w-full"
                    aria-label="Ergebnis des letzten Satzes anpassen"
                  />
                </label>
              )}
              {nextPreviewLabel && (
                <div className="text-[11px] font-bold mb-4" style={{ color: 'var(--dim)' }}>Als Nächstes: {nextPreviewLabel}</div>
              )}
              <button
                onClick={skipRest}
                className="w-full min-h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-black uppercase tracking-[0.16em]"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {view.primaryButton}
              </button>
            </>
          )}
        </>
      )}

      {phase === 'done' && (
        <SessionSummary
          blocks={blocks}
          log={log}
          startedAt={startedAt}
          durationSeconds={runner.sessionData().totalDurationSeconds}
          partial={runner.sessionData().status === 'partial'}
          rpe={rpe}
          onSetRpe={setRpe}
          onSave={saveWorkout}
          metTarget={metTarget}
          exp={view.exp}
        />
      )}

      {phase !== 'done' && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <button onClick={handleExit} className="text-[11px] font-bold" style={{ color: 'var(--dim)' }}>
            Später fortsetzen
          </button>
          <button className="min-h-12 px-3" onClick={() => runner.pause()}>{runner.paused ? 'Weiter' : 'Pause'}</button>
          <button className="min-h-12 px-3" onClick={() => runner.endEarly()}>Training beenden</button>
          {blockIndex >= 0 && (
            <button onClick={skipBlock} className="text-[11px] font-bold" style={{ color: 'var(--dim)' }}>
              {block.role} überspringen →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SessionSummary({ blocks, log, startedAt, durationSeconds, partial, rpe, onSetRpe, onSave, metTarget, exp }) {
  const totalSeconds = durationSeconds ?? Math.round((Date.now() - startedAt) / 1000);
  const sumType = type => blocks.reduce((sum, b, i) => sum + (b.type === type ? log[i].reduce((s, v) => s + v, 0) : 0), 0);

  return (
    <div className="text-left">
      <div className="text-center mb-4">
        <Trophy size={28} style={{ color: 'var(--accent)' }} className="mx-auto mb-2" />
        <div className="text-lg font-black text-fit-ink">{partial ? 'Teiltraining abgeschlossen' : 'Training abgeschlossen'}</div>
        <div className="text-[11px] font-bold mt-1" style={{ color: 'var(--dim)' }}>
          Gesamtzeit {formatSeconds(totalSeconds)} · {sumType('hold')} Sek. Haltearbeit · {sumType('reps')} Wiederholungen
        </div>
        {metTarget && (
          <div className="text-[11px] font-black mt-2 px-3 py-1.5 rounded-lg inline-block" style={{ background: 'var(--accent-glow, rgba(200,255,0,0.12))', color: 'var(--accent)' }}>
            ✓ Zielwerte erreicht
          </div>
        )}
        {exp && (
          <div className="text-[11px] font-black mt-2" style={{ color: 'var(--accent)' }}>
            +{exp.session} % EXP · Stand {exp.after} %{exp.after >= 100 ? ' — nächste Stufe wird freigeschaltet' : ''}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {blocks.map((b, i) => (
          <div key={i} className="px-3 py-2.5 rounded-xl" style={{ background: 'var(--bg2)' }}>
            <div className="text-[10px] font-black uppercase tracking-[0.1em] mb-0.5" style={{ color: 'var(--dim)' }}>{b.role}</div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-fit-ink">{b.name}</span>
              <span className="text-xs font-mono" style={{ color: 'var(--dim)' }}>
                {log[i].join(' | ')}{b.type === 'hold' ? 's' : ''}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <div className="text-[10px] font-black uppercase tracking-[0.15em] mb-2 text-center" style={{ color: 'var(--dim)' }}>Wie hart war's?</div>
        <div className="flex items-center justify-center gap-2">
          {RPE_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => onSetRpe(opt.id)}
              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-[0.1em]"
              style={{
                background: rpe === opt.id ? 'var(--accent)' : 'var(--bg2)',
                color: rpe === opt.id ? '#fff' : 'var(--ink)',
                border: rpe === opt.id ? 'none' : '1px solid var(--line)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onSave}
        className="w-full min-h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-black uppercase tracking-[0.16em]"
        style={{ background: 'var(--accent)', color: '#fff' }}
      >
        <Check size={16} strokeWidth={3} /> Workout speichern
      </button>
    </div>
  );
}

// Read-only Archiv der Workout-Historie eines Skills — einmal gespeicherte
// Sessions werden nirgends im Code nachträglich editiert (kein update()/
// delete() für sessions[]), auch ein späterer Downgrade rührt sie nicht an.
function WorkoutArchive({ sessions }) {
  const [openId, setOpenId] = useState(null);
  if (sessions.length === 0) return null;
  const sorted = sessions.slice().reverse();

  return (
    <div className="mb-6">
      <div className="text-[10px] font-black uppercase tracking-[0.15em] mb-2" style={{ color: 'var(--dim)' }}>
        Archiv · {sessions.length} Workout{sessions.length === 1 ? '' : 's'}
      </div>
      <div className="flex flex-col gap-1.5">
        {sorted.map((s, i) => {
          const isOpen = openId === i;
          const volume = type => (s.exercises || []).filter(ex => ex.type === type).reduce((sum, ex) => sum + (ex.setsCompleted || []).reduce((a, b) => a + b, 0), 0);
          return (
            <div key={s.timestamp || i} className="rounded-lg overflow-hidden" style={{ background: 'var(--bg2)' }}>
              <button
                onClick={() => setOpenId(isOpen ? null : i)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left"
              >
                <div>
                  <div className="text-sm font-bold text-fit-ink">{formatMasteredAt(s.timestamp || s.at)}</div>
                  <div className="text-[10px] font-bold" style={{ color: 'var(--dim)' }}>
                    {formatSeconds(s.totalDurationSeconds || 0)} · {volume('hold')} s · {volume('reps')} Wdh {s.rpe ? `· ${RPE_OPTIONS.find(o => o.id === s.rpe)?.label ?? s.rpe}` : ''}
                  </div>
                </div>
                <ChevronRight size={14} style={{ color: 'var(--dim)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>
              {isOpen && (
                <div className="px-3 pb-3 flex flex-col gap-1.5">
                  {(s.exercises || []).map((ex, j) => (
                    <div key={j} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--card, var(--bg))' }}>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.08em]" style={{ color: 'var(--dim)' }}>{ex.role}</div>
                        <span className="text-xs font-bold text-fit-ink">{ex.name}</span>
                      </div>
                      <span className="text-[11px] font-mono" style={{ color: 'var(--dim)' }}>
                        {(ex.setsCompleted || []).join(' | ')}{ex.type === 'hold' ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SkillLevelChart({ history }) {
  if (!history || history.length < 2) return null;

  // Baue kumulativen Verlauf: stage über Zeit
  let currentStage = 0;
  const data = [];
  const sortedHistory = history.slice().sort((a, b) => new Date(a.masteredAt) - new Date(b.masteredAt));

  for (const entry of sortedHistory) {
    if (entry.reset) {
      currentStage = entry.stage;
    } else {
      currentStage = entry.stage + 1;
    }
    const date = new Date(entry.masteredAt);
    const dateStr = date.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' });
    data.push({ date: dateStr, stage: currentStage });
  }

  return (
    <div data-no-swipe className="rounded-2xl p-4 mb-4" style={{ background: 'var(--bg2)', border: '1px solid var(--line)' }}>
      <div className="text-[10px] font-black uppercase tracking-[0.15em] mb-3" style={{ color: 'var(--dim)' }}>
        Progression über Zeit
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 15, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--dim)' }} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--dim)' }} />
          <Tooltip
            contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: '8px' }}
            labelStyle={{ color: 'var(--ink)' }}
            formatter={(value) => `Stufe ${value}`}
            labelFormatter={(label) => `Datum: ${label}`}
          />
          <Line
            type="stepAfter"
            dataKey="stage"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ fill: 'var(--accent)', r: 4 }}
            activeDot={{ r: 6 }}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function VolumeChart({ sessions }) {
  // Extrahiere alle distinct Übungsnamen
  const exerciseNames = new Set();
  for (const session of sessions) {
    if (session.exercises) {
      for (const exercise of session.exercises) {
        if (exercise.name) {
          exerciseNames.add(exercise.name);
        }
      }
    }
  }

  const exerciseList = Array.from(exerciseNames).sort();
  const [selection, setSelectedExercise] = useState(null);
  const selectedExercise = exerciseList.includes(selection) ? selection : exerciseList[0];

  if (!selectedExercise) return null;

  // Filtere Sessions + berechne Volumen für die gewählte Übung
  const chartData = [];
  for (const session of sessions) {
    const exercises = session.exercises || [];
    const matchingExercises = exercises.filter(ex => ex.name === selectedExercise);

    if (matchingExercises.length > 0) {
      let volume = 0;
      for (const ex of matchingExercises) {
        const setValues = ex.setsCompleted || [];
        volume += setValues.reduce((sum, val) => sum + val, 0);
      }

      const date = new Date(session.timestamp);
      const dateStr = date.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' });
      chartData.push({ date: dateStr, volume });
    }
  }

  if (chartData.length < 2) {
    return (
      <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--bg2)', border: '1px solid var(--line)' }}>
        <div className="text-[10px] font-black uppercase tracking-[0.15em] mb-3" style={{ color: 'var(--dim)' }}>
          Trainingsvolumen
        </div>
        <div className="text-xs" style={{ color: 'var(--dim)' }}>
          Für {selectedExercise}: Noch nicht genug Trainingsdaten vorhanden.
        </div>
      </div>
    );
  }

  const volumeUnit = sessions[0]?.exercises?.[0]?.type === 'hold' ? 's' : 'Wdh';

  return (
    <div data-no-swipe className="rounded-2xl p-4 mb-4" style={{ background: 'var(--bg2)', border: '1px solid var(--line)' }}>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: 'var(--dim)' }}>
          Trainingsvolumen
        </div>
      </div>

      <select
        value={selectedExercise}
        onChange={(e) => setSelectedExercise(e.target.value)}
        className="w-full mb-3 px-3 py-2 rounded-lg text-xs font-bold"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}
      >
        {exerciseList.map(name => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 5, right: 15, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--dim)' }} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--dim)' }} label={{ value: volumeUnit, angle: -90, position: 'insideLeft', style: { color: 'var(--dim)', fontSize: 11 } }} />
          <Tooltip
            contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: '8px' }}
            labelStyle={{ color: 'var(--ink)' }}
            formatter={(value) => `${value} ${volumeUnit}`}
            labelFormatter={(label) => `Datum: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="volume"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ fill: 'var(--accent)', r: 4 }}
            activeDot={{ r: 6 }}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function SkillDetailScreen({ skill, stage: frontier, mastered, exp, history, holds, sessions, position, stepDir, onStep, onRunnerActive, onBack, onLogHold, onLogWorkout }) {
  // `frontier` is the highest unlocked stage. Only unlocked stages can be trained;
  // the next stage stays locked until the frontier reaches 100 % EXP.
  const [picked, setPicked] = useState(frontier);
  const stage = Math.min(picked, frontier);
  const stageInfo = skill.progressions[stage];
  const next = skill.progressions[frontier + 1];
  const expPercent = Math.min(100, Math.round(exp));
  const [runnerActive, setRunnerActive] = useState(false);
  const [expandedVideo, setExpandedVideo] = useState(null);
  const [resumeState, setResumeState] = useState(() => {
    const saved = loadActiveRunner();
    return saved && saved.skillId === skill.id && saved.stage === stage ? saved : null;
  });
  // Wischen/Pfeiltasten wechseln den Skill nicht, solange ein Workout läuft.
  useEffect(() => { onRunnerActive(runnerActive); return () => onRunnerActive(false); }, [runnerActive]);

  return (
    <div className={stepDir ? (stepDir > 0 ? 'skill-step-next' : 'skill-step-prev') : undefined}>
      <div className="flex items-center justify-between mb-5">
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-bold" style={{ color: 'var(--accent)' }}>
          <ChevronLeft size={18} /> Skills
        </button>
        <div className="flex items-center gap-1 text-[11px] font-bold tabular-nums" style={{ color: 'var(--dim)' }}>
          <button
            onClick={() => onStep(-1)}
            disabled={runnerActive || position.index <= 0}
            aria-label="Vorheriger Skill"
            title="Vorheriger Skill (←)"
            className="p-1.5 rounded-lg disabled:opacity-25"
            style={{ color: 'var(--accent)' }}
          >
            <ChevronLeft size={18} />
          </button>
          {position.index + 1}/{position.total}
          <button
            onClick={() => onStep(1)}
            disabled={runnerActive || position.index >= position.total - 1}
            aria-label="Nächster Skill"
            title="Nächster Skill (→)"
            className="p-1.5 rounded-lg disabled:opacity-25"
            style={{ color: 'var(--accent)' }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <h3 className="text-xl font-black text-fit-ink mb-1">{skill.name}</h3>
      <div className="text-[11px] font-bold mb-5" style={{ color: 'var(--dim)' }}>
        Stufe {stage + 1} von {skill.progressions.length}{stage < frontier ? ' · bereits freigeschaltet' : ''}
      </div>

      {runnerActive ? (
        <WorkoutRunner
          skill={skill}
          stage={stage}
          resumeState={resumeState}
          onExit={snapshot => { setResumeState(snapshot); setRunnerActive(false); }}
          onFinish={async (sessionData) => {
            const saved = await onLogWorkout(stage, sessionData);
            if (!saved) return;
            setResumeState(null);
            setRunnerActive(false);
          }}
        />
      ) : (
        <>
          {resumeState && (
            <div
              className="rounded-2xl px-5 py-4 mb-4"
              style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.35)' }}
            >
              <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: '#38bdf8' }}>Unterbrochenes Workout gefunden</div>
              <div className="text-xs font-bold mb-3" style={{ color: 'var(--dim)' }}>
                Übung {resumeState.blockIndex + 1}, Satz {resumeState.setIndex + 1} — bisherige Sätze bleiben erhalten.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRunnerActive(true)}
                  className="flex-1 min-h-11 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.12em]"
                  style={{ background: '#38bdf8', color: '#000' }}
                >
                  <Play size={14} strokeWidth={3} /> Fortsetzen
                </button>
                <button
                  onClick={() => { clearActiveRunner(); setResumeState(null); }}
                  className="px-4 min-h-11 rounded-xl text-xs font-black uppercase tracking-[0.12em]"
                  style={{ background: 'var(--bg2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
                >
                  Verwerfen
                </button>
              </div>
            </div>
          )}
          <div
            className="rounded-2xl px-5 py-6 mb-4 text-center"
            style={{ background: 'var(--accent-glow, rgba(0,0,0,0.05))', border: '1px solid var(--line)' }}
          >
            <div className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--accent)' }}>Jetzt</div>
            <div className="text-2xl font-black text-fit-ink mt-2">{stageInfo.name}</div>
            <div className="text-[11px] font-bold mt-1" style={{ color: 'var(--dim)' }}>{formatTarget(stageInfo)}</div>
            <p className="text-xs mt-2" style={{color:'var(--dim)'}}>{stageInfo.technique.join(' ')} · Pause {stageInfo.restSeconds}s</p>
            <ExerciseVideo key={stageInfo.name} name={stageInfo.name} />
            <button
              onClick={() => {
                if (resumeState) { clearActiveRunner(); setResumeState(null); }
                setRunnerActive(true);
              }}
              className="w-full mt-4 min-h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-black uppercase tracking-[0.16em]"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              <Play size={16} strokeWidth={3} /> {resumeState ? 'Neues Workout starten' : 'Workout starten'}
            </button>
          </div>
        </>
      )}

      <WorkoutArchive sessions={sessions} />

      <SkillLevelChart history={history} />
      <VolumeChart sessions={sessions} />

      {next && (
        <div className="text-center text-[11px] font-bold mb-5" style={{ color: 'var(--dim)', opacity: 0.8 }}>
          Als Nächstes: {next.name}
        </div>
      )}

      {stageInfo.type === 'hold' && (
        <SkillHoldTimer
          stageName={stageInfo.name}
          holdsForStage={holds.filter(h => h.stage === stage)}
          onLog={(duration) => onLogHold(stage, duration)}
        />
      )}

      <div className="mb-4" role="group" aria-label="EXP">
        <div className="flex justify-between text-[11px] font-bold mb-1" style={{ color: 'var(--dim)' }}>
          <span>EXP {mastered ? 100 : expPercent} %</span>
          <span>{mastered ? '🏆 ' + skill.name + ' gemeistert' : next ? `Bei 100 % wird „${next.name}“ freigeschaltet` : 'Bei 100 % ist der Skill gemeistert'}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg2)' }}>
          <div className="h-full" style={{ width: `${mastered ? 100 : expPercent}%`, background: 'var(--accent)' }} />
        </div>
        <p className="text-[11px] mt-2" style={{ color: 'var(--dim)' }}>
          Jeder Satz mit mindestens {stageInfo.advancement.minimumValue} {stageInfo.type === 'hold' ? 's' : 'Wdh'} bringt vollen EXP-Anteil, Mehrleistung zählt als Bonus.
        </p>
      </div>

      <div className="mt-6">
        <div className="text-[10px] font-black uppercase tracking-[0.15em] mb-2" style={{ color: 'var(--dim)' }}>Kette</div>
        <div className="flex flex-col gap-1.5">
          {skill.progressions.map((p, i) => {
            const locked = i > frontier && !mastered;
            return (
            <div key={p.name}>
            <div className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg2)', opacity: locked ? 0.45 : 1, outline: i === stage ? '1px solid var(--accent)' : 'none' }}>
              <button type="button" disabled={locked || runnerActive} onClick={() => setPicked(i)} aria-label={locked ? `${p.name} gesperrt` : `${p.name} trainieren`} className="flex items-center gap-2 text-left min-w-0">
                {locked ? <Lock size={12} style={{ color: 'var(--dim)' }} />
                  : i < frontier || mastered ? <Check size={14} color="#22c55e" strokeWidth={3} />
                  : <Circle size={14} style={{ color: 'var(--accent)' }} fill="var(--accent)" />}
                <span className="text-sm truncate" style={{ color: i === stage ? 'var(--ink)' : 'var(--dim)', fontWeight: i === stage ? 700 : 500 }}>{p.name}</span>
              </button>
              <button type="button" onClick={() => setExpandedVideo(value => value === p.name ? null : p.name)} aria-expanded={expandedVideo === p.name} aria-label={`Video zu ${p.name}`} className="text-[10px] font-mono shrink-0" style={{ color: 'var(--dim)', opacity: 0.7 }}>{formatTarget(p)} · Video</button>
            </div>
            {expandedVideo === p.name && <ExerciseVideo key={p.name} name={p.name} />}
            </div>
            );
          })}
        </div>
      </div>

      {history.length > 0 && (
        <div className="mt-6">
          <div className="text-[10px] font-black uppercase tracking-[0.15em] mb-2" style={{ color: 'var(--dim)' }}>Verlauf</div>
          <div className="flex flex-col gap-1.5">
            {history.slice().reverse().map((h, i) => (
              <div key={`${h.stage}-${h.masteredAt}-${i}`} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'var(--bg2)' }}>
                <div className="flex items-center gap-2">
                  {h.reset
                    ? <ArrowDown size={13} style={{ color: '#f59e0b' }} strokeWidth={3} />
                    : <Check size={13} color="#22c55e" strokeWidth={3} />}
                  <span className="text-sm" style={{ color: 'var(--ink)' }}>{h.reset ? `Zurückgesetzt auf: ${h.name}` : h.name}</span>
                </div>
                <span className="text-[11px] font-mono" style={{ color: 'var(--dim)' }}>{formatMasteredAt(h.masteredAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SkillsCard({ onWorkoutComplete, embedded = false, route, onRouteChange } = {}) {
  const { progress, owner, ready } = useProgress();
  const [openSkillId, setOpenSkillIdState] = useState(() => (embedded ? (route || null) : getSkillIdFromHash()));
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [techniqueConfirmed, setTechniqueConfirmed] = useState(false);
  const [bothSidesConfirmed, setBothSidesConfirmed] = useState(false);
  const [assistance, setAssistance] = useState('');
  const [addedLoadKg, setAddedLoadKg] = useState('');
  const [stepDir, setStepDir] = useState(0);
  const runnerActiveRef = useRef(false);
  const shownRoute = useRef(openSkillId);
  useEffect(() => { setTechniqueConfirmed(false); setBothSidesConfirmed(false); setAssistance(''); setAddedLoadKg(''); },[owner]);
  // Shell owns the route. Echoes of the same id must not reset the form.
  useEffect(() => {
    if (!embedded) return;
    const next = route || null;
    if (shownRoute.current === next) return;
    shownRoute.current = next;
    setOpenSkillIdState(next);
    setStepDir(0);
    setTechniqueConfirmed(false); setBothSidesConfirmed(false);
    setAssistance(''); setAddedLoadKg('');
  }, [embedded, route]);
  // dir ≠ 0: Wechsel per Wischen/Pfeil/Pager — Slide-Richtung merken und nach oben scrollen.
  function setOpenSkillId(id, dir = 0) {
    setStepDir(dir); if (dir) window.scrollTo(0, 0);
    const next = id || null;
    shownRoute.current = next;
    setOpenSkillIdState(next);
    if (embedded) onRouteChange?.(next || '');
    else setSkillIdInHash(id);
    setTechniqueConfirmed(false); setBothSidesConfirmed(false);
    setAssistance(''); setAddedLoadKg('');
  }
  async function action(operation) {
    if (busy) return;
    setBusy(true); setActionError('');
    try { await operation(); return true; } catch (e) { setActionError(e.message); return false; } finally { setBusy(false); }
  }
  function logHold(skillId, stage, duration) {
    return action(() => progressStore.record('hold',skillId,SKILLS.find(s => s.id === skillId).progressions[stage].id,{duration}));
  }
  function logWorkout(skillId, stage, sessionData) {
    const skill = SKILLS.find(s => s.id === skillId);
    const stageId = skill.progressions[stage].id;
    return action(async () => {
      const day = new Date(sessionData.timestamp);
      const trainingDay = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
      await progressStore.record('session',skillId,stageId,{
        ...sessionData, trainingDay, techniqueConfirmed, bothSidesConfirmed, assistance,
        addedLoadKg:Number(addedLoadKg) || 0,
        exercises:sessionData.exercises.map((ex,i) => ({...ex,...(i === 0 ? {stageId} : {})})),
      });
      await progressStore.saveRunner(null, owner, sessionData.sessionId);
      setTechniqueConfirmed(false); setBothSidesConfirmed(false);
      // Optional host integration runs after Skills has saved its own record.
      try { onWorkoutComplete?.(toHostWorkout(skill, stage, sessionData)); }
      catch (error) { setActionError(`Skills gespeichert; Host-Übergabe fehlgeschlagen: ${error.message}`); }
    });
  }

  const openSkill = openSkillId ? SKILLS.find(s => s.id === openSkillId) : null;

  // Der Listener wird einmal registriert und liest den aktuellen Stand über die Ref.
  const nav = useRef();
  nav.current = { id: openSkillId, open: setOpenSkillId, idle: ready && !busy };
  useEffect(() => attachNav({
    skills: SKILLS, root: document, rows: '[data-nav-row]',
    current: () => nav.current.id,
    go: (id, dir) => nav.current.open(id, dir),
    enabled: () => nav.current.idle && !runnerActiveRef.current,
  }), []);
  const stepSkill = dir => {
    const id = neighborId(SKILL_ORDER, openSkillId, dir);
    if (id && !busy && !runnerActiveRef.current) setOpenSkillId(id, dir);
  };

  // Standalone färbt die ganze Seite. Eingebettet bleibt das Theme am
  // Container von SkillsEmbed — documentElement gehört der Shell.
  useEffect(() => {
    if (embedded) return undefined;
    const root = document.documentElement;
    const previous = root.getAttribute('data-theme');
    root.setAttribute('data-theme', 'skills');
    return () => {
      if (previous) root.setAttribute('data-theme', previous);
      else root.removeAttribute('data-theme');
    };
  }, [embedded]);

  return (
    <section
      className="rounded-[2rem] p-5 sm:p-6"
      style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))', border: '1px solid var(--line)' }}
    >
      <div className="mb-5">
        <div className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: 'var(--dim)', opacity: 0.7 }}>Calisthenics</div>
        <h3 className="text-xl sm:text-2xl font-black text-fit-ink mt-1">Skills</h3>
      </div>

      {actionError && <p role="alert" className="text-sm mb-3">{actionError}</p>}
      <fieldset disabled={!ready || busy} style={{minWidth:0}}>
      {ready && (openSkill ? (
        <SkillDetailScreen
          key={`${owner}:${openSkill.id}`}
          skill={openSkill}
          mastered={progress[openSkill.id]?.mastered === true}
          stage={progress[openSkill.id]?.stage ?? 0}
          exp={progress[openSkill.id]?.exp ?? 0}
          history={progress[openSkill.id]?.history ?? []}
          holds={progress[openSkill.id]?.holds ?? []}
          sessions={progress[openSkill.id]?.sessions ?? []}
          position={{ index: SKILL_ORDER.indexOf(openSkill.id), total: SKILL_ORDER.length }}
          stepDir={stepDir}
          onStep={stepSkill}
          onRunnerActive={active => { runnerActiveRef.current = active; }}
          onBack={() => setOpenSkillId(null)}
          onLogHold={(stage, duration) => logHold(openSkill.id, stage, duration)}
          onLogWorkout={(stage, sessionData) => logWorkout(openSkill.id, stage, sessionData)}
        />
      ) : (
        <SkillListScreen progress={progress} onOpen={setOpenSkillId} />
      ))}
      </fieldset>

      <footer className="mt-6 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
        <PersistenceStatus />
      </footer>
    </section>
  );
}
