import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
const memory = new Map();
globalThis.localStorage = {getItem:k => memory.get(k) ?? null,setItem:(k,v) => memory.set(k,v),removeItem:k => memory.delete(k)};
globalThis.window = new EventTarget();
let authChanged, receive, cloudUser = null, writes = [];
const pending = [];
mock.module('../data/cloud.js',{exports:{
  auth:{get currentUser() {return cloudUser;}},
  watchAuth:fn => { authChanged = fn; },
  watchEvents:(_uid,fn) => { receive = fn; return () => {}; },
  uploadEvent:(uid,event) => { writes.push({uid,event}); return new Promise(resolve => pending.push(resolve)); },
  login:async () => {}, logout:async () => {},
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
