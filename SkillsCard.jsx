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
    <button data-nav-row onClick={() => onOpen(skill.id)} className="skills-row" style={isLast ? { borderBottom: 'none' } : undefined}>
      <span className="min-w-0">
        <span className="skills-row-name">{skill.name}</span>
        <span className="skills-row-meta">
          {done ? 'Gemeistert' : `Stufe ${stage + 1}/${skill.progressions.length} · ${skill.progressions[stage].name}`}
        </span>
      </span>
      <span className="skills-row-side">
        {done && <Trophy size={15} style={{ color: 'var(--accent)' }} />}
        <ChevronRight size={16} style={{ color: 'var(--dim)' }} />
      </span>
    </button>
  );
}

function CategoryGroup({ category, skills, progress, onOpen }) {
  const meta = CATEGORY_META[category];
  return (
    <div className="skills-group">
      <div className="skills-group-label"><meta.Icon size={14} /> {meta.label}</div>
      <div className="skills-list">
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
    <div className="skills-hold">
      <div className="skills-kicker">Hold-Timer · {stageName}</div>
      <div className="skills-hold-top">
        <div className="skills-hold-time">{formatHoldTime(elapsedMs)}</div>
        <div className="skills-hold-actions">
          <button onClick={toggle} className="skills-icon-btn" aria-label={running ? 'Pause' : 'Start'}>
            {running ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button onClick={logHold} disabled={elapsedMs <= 0} className="skills-icon-btn is-quiet" aria-label="Hold speichern">
            <Flag size={15} />
          </button>
        </div>
      </div>
      {holdsForStage.length > 0 && (
        <div>
          {holdsForStage.slice().reverse().slice(0, 5).map((h, i) => {
            const isBest = h.duration === bestMs;
            return (
              <div key={h.at} className={isBest ? 'skills-hold-log is-best' : 'skills-hold-log'}>
                <span>
                  {isBest && <Trophy size={12} style={{ color: 'var(--accent)' }} />} Versuch {holdsForStage.length - i}
                </span>
                <span>{formatHoldTime(h.duration)}</span>
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

  const nextPreviewLabel = (() => {
    if (phase !== 'rest') return null;
    if (setIndex + 1 < block.sets) return `Satz ${setIndex + 2}/${block.sets} ${block.name}`;
    if (nextBlock) return `${nextBlock.role}: ${nextBlock.name}`;
    return 'Letzter Satz — danach fertig';
  })();
  return (
    <div className="skills-runner">
      {runner.persistenceError && <p className="skills-alert" role="alert">Nicht gesichert: {runner.persistenceError}</p>}
      {runner.paused && phase !== 'done' && <p role="status" className="skills-hint">{runner.interruption || 'Pausiert'} · Weiter zum Fortsetzen</p>}
      {phase !== 'done' && (
        <>
          <div className="skills-phase">{view.blockLabel} · {block.role}</div>
          <div className="skills-phase skills-phase-accent">{view.phaseLabel} · {view.setLabel}</div>
          <div className="skills-exercise">{block.name}</div>
          {phase !== 'rest' && <ExerciseVideo key={block.name} name={block.name} autoPlay />}

          {phase === 'prep' && (
            <>
              <p className="skills-hint">{view.hint}</p>
              <button onClick={skipRest} className="skills-btn"><Play size={16} /> Start</button>
            </>
          )}

          {phase === 'work' && (
            <>
              <div className={view.reached ? 'skills-timer is-met' : 'skills-timer'}>
                {view.hold ? `${view.value}s` : `${view.value}×`}
              </div>
              <div className="skills-hint">
                {view.hold ? 'Mindestziel' : 'Ziel'} {view.target} {view.hold ? 's' : 'Wdh'}{!view.hold && ` · Laufzeit ${formatHoldTime(runner.workMs)}`}
              </div>
              <p className="skills-hint" style={{ color: view.reached ? 'var(--accent)' : undefined }}>{view.hint}</p>
              <button onClick={() => runner.finishSet()} className="skills-btn">
                <Check size={16} /> {view.primaryButton}
              </button>
            </>
          )}

          {phase === 'rest' && (
            <>
              <div className={view.restReached ? 'skills-timer is-met' : 'skills-timer'}>{view.elapsed}s</div>
              <div className="skills-hint">Pause · empfohlen {view.restTarget}s</div>
              {view.slider && (
                <label className="skills-slider">
                  <span>
                    Letzter Satz: {view.slider.value} {view.unit}{view.slider.reachedTarget ? ' · Ziel erreicht' : ` · Ziel ${view.target} ${view.unit}`}
                  </span>
                  <input
                    type="range"
                    min={view.slider.min}
                    max={view.slider.max}
                    step={view.slider.step}
                    value={view.slider.value}
                    onChange={event => correctLastSet(event.target.value)}
                    className="skills-reps-slider"
                    style={{ width: '100%' }}
                    aria-label="Ergebnis des letzten Satzes anpassen"
                  />
                </label>
              )}
              {nextPreviewLabel && <div className="skills-hint">Als Nächstes: {nextPreviewLabel}</div>}
              <button onClick={skipRest} className="skills-btn">{view.primaryButton}</button>
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
        <div className="skills-runner-actions">
          <button onClick={handleExit} className="skills-btn-quiet">Später fortsetzen</button>
          <button className="skills-btn-quiet" onClick={() => runner.pause()}>{runner.paused ? 'Weiter' : 'Pause'}</button>
          <button className="skills-btn-quiet" onClick={() => runner.endEarly()}>Training beenden</button>
          {blockIndex >= 0 && (
            <button onClick={skipBlock} className="skills-btn-quiet">{block.role} überspringen →</button>
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
    <div className="skills-summary">
      <div className="skills-summary-head">
        <Trophy size={26} style={{ color: 'var(--accent)' }} />
        <div className="skills-exercise">{partial ? 'Teiltraining abgeschlossen' : 'Training abgeschlossen'}</div>
        <div className="skills-hint">
          Gesamtzeit {formatSeconds(totalSeconds)} · {sumType('hold')} Sek. Haltearbeit · {sumType('reps')} Wiederholungen
        </div>
        {metTarget && <div className="skills-chip">Zielwerte erreicht</div>}
        {exp && (
          <div className="skills-hint" style={{ color: 'var(--accent)' }}>
            +{exp.session} % EXP · Stand {exp.after} %{exp.after >= 100 ? ' — nächste Stufe wird freigeschaltet' : ''}
          </div>
        )}
      </div>
      <div>
        {blocks.map((b, i) => (
          <div key={i} className="skills-block">
            <div className="skills-block-role">{b.role}</div>
            <div className="skills-block-row">
              <span>{b.name}</span>
              <span className="skills-mono">{log[i].join(' | ')}{b.type === 'hold' ? 's' : ''}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="skills-section">
        <div className="skills-section-label" style={{ textAlign: 'center' }}>Wie hart war's?</div>
        <div className="skills-rpe">
          {RPE_OPTIONS.map(opt => (
            <button key={opt.id} onClick={() => onSetRpe(opt.id)} className={rpe === opt.id ? 'is-on' : undefined}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <button onClick={onSave} className="skills-btn"><Check size={16} /> Workout speichern</button>
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
    <div className="skills-section">
      <div className="skills-section-label">Archiv · {sessions.length} Workout{sessions.length === 1 ? '' : 's'}</div>
      {sorted.map((s, i) => {
        const isOpen = openId === i;
        const volume = type => (s.exercises || []).filter(ex => ex.type === type).reduce((sum, ex) => sum + (ex.setsCompleted || []).reduce((a, b) => a + b, 0), 0);
        return (
          <div key={s.timestamp || i} className="skills-archive-item">
            <button onClick={() => setOpenId(isOpen ? null : i)} className="skills-block-row">
              <span>
                <span className="skills-row-name">{formatMasteredAt(s.timestamp || s.at)}</span>
                <span className="skills-row-meta">
                  {formatSeconds(s.totalDurationSeconds || 0)} · {volume('hold')} s · {volume('reps')} Wdh {s.rpe ? `· ${RPE_OPTIONS.find(o => o.id === s.rpe)?.label ?? s.rpe}` : ''}
                </span>
              </span>
              <ChevronRight size={16} style={{ color: 'var(--dim)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 160ms ease' }} />
            </button>
            {isOpen && (
              <div style={{ padding: '0 12px 12px' }}>
                {(s.exercises || []).map((ex, j) => (
                  <div key={j} className="skills-hold-log">
                    <span>
                      <span className="skills-block-role">{ex.role}</span>
                      <span className="skills-row-name">{ex.name}</span>
                    </span>
                    <span className="skills-mono">{(ex.setsCompleted || []).join(' | ')}{ex.type === 'hold' ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
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
    <div data-no-swipe className="skills-chart">
      <div className="skills-section-label">Progression über Zeit</div>
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
            isAnimationActive={false}
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
      <div className="skills-chart">
        <div className="skills-section-label">Trainingsvolumen</div>
        <div className="skills-hint">Für {selectedExercise}: Noch nicht genug Trainingsdaten vorhanden.</div>
      </div>
    );
  }

  const volumeUnit = sessions[0]?.exercises?.[0]?.type === 'hold' ? 's' : 'Wdh';

  return (
    <div data-no-swipe className="skills-chart">
      <div className="skills-section-label">Trainingsvolumen</div>
      <select
        value={selectedExercise}
        onChange={(e) => setSelectedExercise(e.target.value)}
        className="skills-select"
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
            isAnimationActive={false}
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
      <div className="skills-detail-bar">
        <button onClick={onBack} className="skills-back"><ChevronLeft size={18} /> Skills</button>
        <div className="skills-pager">
          <button onClick={() => onStep(-1)} disabled={runnerActive || position.index <= 0} aria-label="Vorheriger Skill" title="Vorheriger Skill (←)" className="skills-icon-btn">
            <ChevronLeft size={18} />
          </button>
          {position.index + 1}/{position.total}
          <button onClick={() => onStep(1)} disabled={runnerActive || position.index >= position.total - 1} aria-label="Nächster Skill" title="Nächster Skill (→)" className="skills-icon-btn">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <h3 className="skills-skill-name">{skill.name}</h3>
      <div className="skills-skill-meta">
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
            <div className="skills-resume">
              <div className="skills-kicker">Unterbrochenes Workout gefunden</div>
              <div className="skills-hint">
                Übung {resumeState.blockIndex + 1}, Satz {resumeState.setIndex + 1} — bisherige Sätze bleiben erhalten.
              </div>
              <div className="skills-resume-actions">
                <button onClick={() => setRunnerActive(true)} className="skills-btn"><Play size={16} /> Fortsetzen</button>
                <button onClick={() => { clearActiveRunner(); setResumeState(null); }} className="skills-btn-secondary">Verwerfen</button>
              </div>
            </div>
          )}
          <div className="skills-now">
            <div className="skills-now-kicker">Jetzt</div>
            <div className="skills-now-title">{stageInfo.name}</div>
            <div className="skills-hint">{formatTarget(stageInfo)}</div>
            <p className="skills-hint">{stageInfo.technique.join(' ')} · Pause {stageInfo.restSeconds}s</p>
            <ExerciseVideo key={stageInfo.name} name={stageInfo.name} />
            <button
              onClick={() => {
                if (resumeState) { clearActiveRunner(); setResumeState(null); }
                setRunnerActive(true);
              }}
              className="skills-btn"
            >
              <Play size={16} /> {resumeState ? 'Neues Workout starten' : 'Workout starten'}
            </button>
          </div>
        </>
      )}

      <WorkoutArchive sessions={sessions} />

      <SkillLevelChart history={history} />
      <VolumeChart sessions={sessions} />

      {next && <div className="skills-hint" style={{ textAlign: 'center', marginBottom: 18 }}>Als Nächstes: {next.name}</div>}

      {stageInfo.type === 'hold' && (
        <SkillHoldTimer
          stageName={stageInfo.name}
          holdsForStage={holds.filter(h => h.stage === stage)}
          onLog={(duration) => onLogHold(stage, duration)}
        />
      )}

      <div className="skills-section" role="group" aria-label="EXP">
        <div className="skills-exp-top">
          <span>EXP {mastered ? 100 : expPercent} %</span>
          <span>{mastered ? skill.name + ' gemeistert' : next ? `Bei 100 % wird „${next.name}“ freigeschaltet` : 'Bei 100 % ist der Skill gemeistert'}</span>
        </div>
        <div className="skills-exp-track">
          <div className="skills-exp-fill" style={{ width: `${mastered ? 100 : expPercent}%` }} />
        </div>
        <p className="skills-hint">
          Jeder Satz mit mindestens {stageInfo.advancement.minimumValue} {stageInfo.type === 'hold' ? 's' : 'Wdh'} bringt vollen EXP-Anteil, Mehrleistung zählt als Bonus.
        </p>
      </div>

      <div className="skills-section">
        <div className="skills-section-label">Kette</div>
        {skill.progressions.map((p, i) => {
          const locked = i > frontier && !mastered;
          return (
            <div key={p.name}>
              <div className={`skills-chain-row${i === stage ? ' is-current' : ''}${locked ? ' is-locked' : ''}`}>
                <button type="button" disabled={locked || runnerActive} onClick={() => setPicked(i)} aria-label={locked ? `${p.name} gesperrt` : `${p.name} trainieren`} className="skills-chain-main">
                  {locked ? <Lock size={14} />
                    : i < frontier || mastered ? <Check size={15} color="var(--green)" />
                    : <Circle size={15} style={{ color: 'var(--accent)' }} />}
                  <span className={i === stage ? 'skills-chain-name is-current' : 'skills-chain-name'}>{p.name}</span>
                </button>
                <button type="button" onClick={() => setExpandedVideo(value => value === p.name ? null : p.name)} aria-expanded={expandedVideo === p.name} aria-label={`Video zu ${p.name}`} className="skills-video-btn">{formatTarget(p)} · Video</button>
              </div>
              {expandedVideo === p.name && <ExerciseVideo key={p.name} name={p.name} />}
            </div>
          );
        })}
      </div>

      {history.length > 0 && (
        <div className="skills-section">
          <div className="skills-section-label">Verlauf</div>
          {history.slice().reverse().map((h, i) => (
            <div key={`${h.stage}-${h.masteredAt}-${i}`} className="skills-history-row">
              <span>
                {h.reset ? <ArrowDown size={14} style={{ color: 'var(--orange)' }} /> : <Check size={14} color="var(--green)" />}
                {' '}{h.reset ? `Zurückgesetzt auf: ${h.name}` : h.name}
              </span>
              <span className="skills-mono">{formatMasteredAt(h.masteredAt)}</span>
            </div>
          ))}
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
    <section className="skills-classic">
      <div className="skills-head">
        <div className="skills-kicker">Calisthenics</div>
        <h3 className="skills-title">Skills</h3>
      </div>

      {actionError && <p role="alert" className="skills-alert">{actionError}</p>}
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

      <footer className="skills-footer">
        <PersistenceStatus />
      </footer>
    </section>
  );
}
