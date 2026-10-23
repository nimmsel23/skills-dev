import { SKILLS } from './catalog.js';
import { projectProgress, validateEvent } from './model.js';
import * as local from './local.js';
import * as cloud from './cloud.js';
let state = { owner: 'guest', user: null, ready: false, progress: {}, pending: 0, status: 'Lokaler Speicher wird geladen …', error: '', storageWarning: '', revision: 0 };
let rows = [], runner = null, started = false, stopCloud, epoch = 0, queue = Promise.resolve();
const listeners = new Set(), uploads = new Set();
function emit(patch = {}) {
  state = { ...state, ...patch, revision: state.revision+1, progress: projectProgress(rows.map(r => r.event),SKILLS), pending: rows.filter(r => !r.synced).length };
  listeners.forEach(fn => fn());
}
function serial(task) {
  const operation = queue.then(task);
  queue = operation.catch(error => emit({error: error.message}));
  return operation;
}
function backup() {
  try { local.mirror(state.owner,rows); } catch { emit({ storageWarning: 'localStorage nicht verfügbar; Daten liegen in IndexedDB. Wiederherstellung aus localStorage derzeit nicht möglich.' }); }
}
async function persistRow(row) {
  // Publish only after IndexedDB commits; preserve the input on write failure.
  await local.saveRow(row);
  rows = [...rows.filter(r => r.key !== row.key),row];
  backup();
}
function flush() {
  if (!state.user || !state.ready) return;
  const uid = state.owner;
  for (const row of rows.filter(r => !r.synced)) {
    const key = row.key;
    if (uploads.has(key)) continue;
    uploads.add(key);
    cloud.uploadEvent(uid,row.event).then(() => serial(async () => {
      if (uid !== state.owner) return;
      await persistRow({...row,synced:true});
      emit({status:'Mit Firestore synchronisiert',error:''});
    })).catch(error => {
      if (uid === state.owner) emit({status:'Lokal gespeichert · Sync ausstehend',error:`Firestore: ${error.code || error.message}`});
    }).finally(() => uploads.delete(key));
  }
}
async function switchOwner(user) {
  const generation = ++epoch;
  stopCloud?.(); stopCloud = null;
  emit({ready:false,user,owner:user?.uid || 'guest',error:''});
  rows = await local.loadRows(state.owner);
  runner = await local.loadRunner(state.owner);
  emit({ready:true,status:user ? 'Firestore wird verbunden …' : 'Auf diesem Gerät gespeichert · für Sync anmelden'});
  if (!user) return;
  const uid = user.uid;
  stopCloud = cloud.watchEvents(uid,(events,metadata) => {
    serial(async () => {
      if (generation !== epoch) return;
      for (const event of events) {
        validateEvent(event,SKILLS);
        const old = rows.find(r => r.event.id === event.id);
        const synced = old?.synced || (!metadata.fromCache && !metadata.hasPendingWrites);
        await persistRow({key:`${uid}:${event.id}`,owner:uid,event,synced:!!synced});
      }
      emit({status: metadata.fromCache ? 'Lokal verfügbar · warte auf Firestore' : 'Mit Firestore verbunden'});
    });
  },error => { if (generation === epoch) emit({error:`Firestore: ${error.code}`,status:'Lokal gespeichert · Sync ausstehend'}); });
  flush();
}
export const progressStore = {
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  getSnapshot() { return state; },
  start() {
    if (started) return;
    started = true;
    serial(async () => {
      await local.seedCatalog();
      const warning = await local.migrateLegacy();
      if (warning) emit({storageWarning:warning});
      await switchOwner(null);
    });
    cloud.watchAuth(user => serial(() => switchOwner(user)));
    window.addEventListener('online',flush);
    window.addEventListener('storage',event => {
      if (event.key === 'skills:v1:'+state.owner) serial(async () => { rows = await local.loadRows(state.owner); emit(); flush(); });
    });
    navigator.serviceWorker?.addEventListener('message',event => { if (event.data?.type === 'SKILLS_SYNC_REQUEST') flush(); });
  },
  record(type,skillId,stageId,payload) {
    const owner = state.owner;
    if (!state.ready) return Promise.reject(new Error('Speicher noch nicht bereit'));
    const event = validateEvent({id:crypto.randomUUID(),schemaVersion:1,catalogVersion:1,type,skillId,stageId,at:new Date().toISOString(),payload:JSON.parse(JSON.stringify(payload))},SKILLS);
    return serial(async () => {
      if (owner !== state.owner) throw new Error('Konto gewechselt; bitte erneut speichern');
      await persistRow({key:`${owner}:${event.id}`,owner,event,synced:false});
      emit({error:'',status:'Auf diesem Gerät gespeichert'});
      navigator.serviceWorker?.ready.then(registration => registration.sync?.register('skills-progress-sync')).catch(() => {});
      flush();
      return event;
    });
  },
  runner() { return runner; },
  saveRunner(value, owner = state.owner) {
    if (owner !== state.owner) return Promise.resolve();
    runner = value;
    return serial(() => local.saveRunner(owner,value));
  },
  importGuest() {
    return serial(async () => {
      if (!state.user) return;
      const guest = await local.loadRows('guest');
      for (const row of guest) {
        if (!rows.some(r => r.event.id === row.event.id)) await persistRow({...row,key:`${state.owner}:${row.event.id}`,owner:state.owner,synced:false});
      }
      emit({error:''}); flush();
    });
  },
  retry() { return serial(async () => { if (!state.ready) { await local.seedCatalog(); await local.migrateLegacy(); } await switchOwner(cloud.auth.currentUser); flush(); }); },
  login: cloud.login,
  logout: cloud.logout,
};
