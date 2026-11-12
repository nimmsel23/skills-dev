import test, {mock} from 'node:test';
import assert from 'node:assert/strict';
const events = [], runners = [];
let saved = {stage:0,mastered:false,history:[],holds:[],sessions:[]};
let rejectSave = false, rejectClear = false, owner = 'alice', switchDuringSave = false;
const sessions = new Map();
mock.module('../data/store.js',{namedExports:{progressStore:{
  getSnapshot:() => ({owner,progress:{'front-lever':saved}}),
  subscribe:() => () => {},
  record:async (...args) => {
    if(rejectSave)throw new Error('disk full');
    const id = args[3]?.sessionId;
    if (id && sessions.has(id)) return sessions.get(id);
    events.push(args);
    const event = {payload:args[3]};
    if (id) sessions.set(id,event);
    if (switchDuringSave) owner = 'bob';
    return event;
  },
  saveRunner:async value => {if(rejectClear)throw new Error('clear failed');runners.push(value);},
}}});
const {designProgress:bridge} = await import('../data/designProgress.js');
const skill = bridge.skills.find(s => s.id === 'front-lever');
test('design adapters use stable stage IDs, a fixed progression and durable save before clearing runners',async () => {
  assert.equal(bridge.skills.length,14);
  assert.deepEqual(Object.keys(bridge.categories),['push','pull','core','legs','balance']);
  // The progression is fixed: the adapter offers no manual advancing or downgrading.
  assert.equal(bridge.master,undefined);
  assert.equal(bridge.downgrade,undefined);
  assert.equal(events.length,0);
  const session = {metTarget:true,exercises:[{name:'Tuck Front Lever',type:'hold',setsCompleted:[15,15,15,15]}]};
  const count = events.length;
  await bridge.saveWorkout(skill,1,session,{techniqueConfirmed:true});
  assert.equal(events.length,count+1,'target met does not automatically advance');
  assert.equal(events.at(-1)[0],'session');
  assert.equal(events.at(-1)[3].exercises[0].stageId,skill.progressions[1].id);
  assert.equal(events.at(-1)[3].techniqueConfirmed,true);
  assert.deepEqual(runners,[null]);
  rejectSave = true;
  await assert.rejects(bridge.saveWorkout(skill,1,session),/disk full/);
  assert.deepEqual(runners,[null],'a failed write retains runner state');
});

test('retry after draft cleanup failure reuses saved session and retains its original training day',async () => {
  rejectSave = false; rejectClear = true;
  const data = {sessionId:'stable-save',timestamp:'2026-11-04T12:00:00.000Z',exercises:[{name:'Tuck Front Lever',type:'hold',setsCompleted:[12]}]};
  const before = events.length, cleared = runners.length;
  await assert.rejects(bridge.saveWorkout(skill,0,data,{},'alice'),/clear failed/);
  assert.equal(events.length,before+1);
  assert.equal(runners.length,cleared);
  rejectClear = false;
  await bridge.saveWorkout(skill,0,data,{},'alice');
  assert.equal(events.length,before+1);
  assert.equal(events.at(-1)[3].trainingDay,'2026-11-04');
  assert.equal(runners.length,cleared+1);
});

test('stale runner owner cannot save or clear the next account draft',async () => {
  const data = {sessionId:'owner-switch',timestamp:'2026-11-05T12:00:00.000Z',exercises:[]};
  const before = events.length, cleared = runners.length;
  await assert.rejects(bridge.saveWorkout(skill,0,data,{},'guest'),/Konto gewechselt/);
  assert.equal(events.length,before);
  switchDuringSave = true;
  await assert.rejects(bridge.saveWorkout(skill,0,data,{},'alice'),/Konto vor Abschluss gewechselt/);
  assert.equal(events.length,before+1,'original owner record is durable before the switch');
  assert.equal(runners.length,cleared,'next account draft was not cleared');
  switchDuringSave = false; owner = 'alice';
});

test('host completion carries a stable source session identity for deduplication',async () => {
  const {toHostWorkout,deliverHostWorkout,installEmbeddedWorkoutHandler,SKILLS_WORKOUT_COMPLETE_EVENT} = await import('../data/workoutCompletion.js');
  const data = {sessionId:'host-session',timestamp:'2026-11-05T12:00:00.000Z',totalDurationSeconds:60,exercises:[]};
  const workout = toHostWorkout(skill,0,data);
  assert.equal(workout.id,'skills-host-session');
  assert.equal(workout.sourceSessionId,'host-session');
  assert.equal(workout.runId,'host-session');
  assert.equal(workout.endedAt-workout.startedAt,60000);
  assert.deepEqual(toHostWorkout(skill,0,data),workout);

  const delivered = [];
  const events = [];
  const previousWindow = globalThis.window;
  globalThis.window = {
    dispatchEvent(event) { events.push(event); },
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
  };
  const uninstall = installEmbeddedWorkoutHandler(value => { delivered.push(value.runId); return true; });
  try {
    deliverHostWorkout(workout);
    deliverHostWorkout(toHostWorkout(skill,0,data));
    assert.deepEqual(delivered,['host-session','host-session']);
    assert.equal(events.length,0,'embedded callback suppresses the window event');
    uninstall();
    deliverHostWorkout(toHostWorkout(skill,0,data));
    assert.equal(events.length,1);
    assert.equal(events[0].type,SKILLS_WORKOUT_COMPLETE_EVENT);
    assert.equal(events[0].detail.runId,'host-session');
  } finally {
    uninstall();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('repeated design saves deliver the same runId once per attempt',async () => {
  const {installEmbeddedWorkoutHandler} = await import('../data/workoutCompletion.js');
  const data = {sessionId:'repeat-run',timestamp:'2026-11-12T10:00:00.000Z',exercises:[{name:'Tuck Front Lever',type:'hold',setsCompleted:[12]}]};
  const seen = [];
  const uninstall = installEmbeddedWorkoutHandler(workout => { seen.push(workout.runId); return true; });
  try {
    await bridge.saveWorkout(skill,0,data);
    await bridge.saveWorkout(skill,0,data);
    assert.deepEqual(seen,['repeat-run','repeat-run']);
  } finally { uninstall(); }
});
