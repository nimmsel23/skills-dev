import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
const memory = new Map();
globalThis.localStorage = {getItem:k => memory.get(k) ?? null,setItem:(k,v) => memory.set(k,v),removeItem:k => memory.delete(k)};
globalThis.window = new EventTarget();
let authChanged, receive, cloudUser = null, writes = [], deleteFails = false;
const pending = [];
mock.module('../data/cloud.js',{namedExports:{
  auth:{get currentUser() {return cloudUser;}},
  watchAuth:fn => { authChanged = fn; },
  watchEvents:(_uid,fn) => { receive = fn; return () => {}; },
  uploadEvent:(uid,event) => { writes.push({uid,event}); return new Promise(resolve => pending.push(resolve)); },
  login:async () => {}, logout:async () => {},
  deleteSkillsData:async () => { if (deleteFails) throw new Error('permission-denied'); },
}});
const { progressStore:store } = await import('../data/store.js');
const { loadRows } = await import('../data/local.js');
const waitFor = predicate => new Promise((resolve,reject) => {
  if (predicate(store.getSnapshot())) return resolve();
  const timeout = setTimeout(() => {stop();reject(new Error('State timeout'));},3000);
  const stop = store.subscribe(() => { if (predicate(store.getSnapshot())) {clearTimeout(timeout);stop();resolve();} });
});
test('offline-first controller saves before upload, merges remote events, isolates accounts and imports guests idempotently',async () => {
  store.start(); await waitFor(s => s.ready);
  const guest = await store.record('hold','front-lever','front-lever/tuck-front-lever',{duration:1234});
  assert.equal(writes.length,0);
  assert.equal((await loadRows('guest')).length,1);
  cloudUser = {uid:'alice'}; authChanged(cloudUser);
  await waitFor(s => s.owner === 'alice' && s.ready);
  assert.deepEqual(store.getSnapshot().progress,{});
  await store.importGuest(); await store.importGuest();
  assert.equal(store.getSnapshot().progress['front-lever'].holds.length,1);
  assert.equal(writes.length,1,'an unresolved offline upload does not duplicate on retry');
  const saved = await store.record('hold','front-lever','front-lever/tuck-front-lever',{duration:2500});
  assert.equal((await loadRows('alice')).length,2,'write completes while cloud promises remain pending');
  assert.equal(store.getSnapshot().pending,2);
  receive([guest,saved],{fromCache:true,hasPendingWrites:true});
  await store.retry();
  assert.equal(store.getSnapshot().pending,2,'cache is not a server acknowledgement');
  pending.splice(0).forEach(resolve => resolve());
  await waitFor(s => s.pending === 0);
  const remote = {...saved,id:'other-device',payload:{duration:5000}};
  receive([guest,saved,remote],{fromCache:false,hasPendingWrites:false});
  await waitFor(s => s.progress['front-lever']?.holds.length === 3);
  cloudUser = {uid:'bob'}; authChanged(cloudUser);
  await waitFor(s => s.owner === 'bob' && s.ready);
  assert.deepEqual(store.getSnapshot().progress,{});
  cloudUser = {uid:'alice'}; authChanged(cloudUser);
  await waitFor(s => s.owner === 'alice' && s.ready);
  assert.equal(store.getSnapshot().progress['front-lever'].holds.length,3);
  assert.equal(store.getSnapshot().pending,0);
});

test('session Save retries and concurrent taps keep one immutable locally committed event',async () => {
  const payload = {sessionId:'session-retry-test',timestamp:'2026-11-05T10:00:00.000Z',exercises:[{name:'Tuck Front Lever',type:'hold',setsCompleted:[12,10]}]};
  const [first,second] = await Promise.all([
    store.record('session','front-lever','front-lever/tuck-front-lever',payload),
    store.record('session','front-lever','front-lever/tuck-front-lever',payload),
  ]);
  assert.equal(first.id,'session-session-retry-test');
  assert.deepEqual(second,first);
  assert.equal(first.at,payload.timestamp);
  const reordered = {exercises:payload.exercises,timestamp:payload.timestamp,sessionId:payload.sessionId};
  assert.deepEqual(await store.record('session','front-lever','front-lever/tuck-front-lever',reordered),first);
  assert.equal((await loadRows('alice')).filter(row => row.event.id === first.id).length,1);
  assert.equal(writes.filter(row => row.event.id === first.id).length,1);
  await assert.rejects(store.record('session','front-lever','front-lever/tuck-front-lever',{...payload,exercises:[{setsCompleted:[99]}]}),/bereits mit anderen Werten/);
  assert.deepEqual((await loadRows('alice')).find(row => row.event.id === first.id).event,first);
  await assert.rejects(store.record('session','front-lever','front-lever/tuck-front-lever',{...payload,sessionId:'../unsafe'}),/Trainings-ID/);
});

test('runner checkpoints clone input and refuse stale-owner writes or clearing another session',async () => {
  const snapshot = {sessionId:'draft-a',log:[[12]]};
  const save = store.saveRunner(snapshot,'alice');
  snapshot.log[0].push(99);
  await save;
  assert.deepEqual(store.runner().log,[[12]]);
  await assert.rejects(store.saveRunner(null,'alice','draft-b'),/anderer Trainingsentwurf/);
  assert.equal(store.runner().sessionId,'draft-a');
  cloudUser = {uid:'bob'}; authChanged(cloudUser);
  // Queued after the switch but called while Alice is still the visible owner.
  await assert.rejects(store.saveRunner({sessionId:'wrong-owner'},'alice'),/Konto gewechselt/);
  await waitFor(s => s.owner === 'bob' && s.ready);
  assert.equal(store.runner(),null);
  cloudUser = {uid:'alice'}; authChanged(cloudUser);
  await waitFor(s => s.owner === 'alice' && s.ready);
  assert.equal(store.runner().sessionId,'draft-a');
  await store.saveRunner(null,'alice','draft-a');
  assert.equal(store.runner(),null);
});

test('skills data deletion removes that account\'s cloud and device data but keeps guest data',async () => {
  cloudUser = null; authChanged(null); await waitFor(s => s.owner === 'guest' && s.ready);
  const guestBefore = (await loadRows('guest')).length;
  cloudUser = {uid:'carol'}; authChanged(cloudUser);
  await waitFor(s => s.owner === 'carol' && s.ready);
  await store.record('hold','front-lever','front-lever/tuck-front-lever',{duration:4321});
  assert.equal((await loadRows('carol')).length,1);
  deleteFails = true;
  await assert.rejects(store.deleteSkillsData(),/permission-denied/);
  assert.equal((await loadRows('carol')).length,1,'cloud failure must not erase local data');
  deleteFails = false;
  await store.deleteSkillsData();
  assert.equal(store.getSnapshot().owner,'guest');
  assert.equal((await loadRows('carol')).length,0);
  assert.equal((await loadRows('guest')).length,guestBefore,'guest data stays');
});
