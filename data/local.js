import { catalog, SKILLS } from './catalog.js';
import { legacyEvents } from './model.js';
export const DB_NAME = 'skills-progression-v1';
const prefix = 'skills:v1:';
let database;
export function openDatabase() {
  if (!database) database = new Promise((resolve,reject) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      db.createObjectStore('events', { keyPath: 'key' });
      db.createObjectStore('catalog', { keyPath: 'id' });
      db.createObjectStore('runner', { keyPath: 'owner' });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error('IndexedDB blockiert'));
  });
  return database;
}
export async function transaction(store, mode, action) {
  const db = await openDatabase();
  return new Promise((resolve,reject) => {
    const tx = db.transaction(store, mode);
    const request = action(tx.objectStore(store));
    tx.oncomplete = () => resolve(request?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Speichern abgebrochen'));
  });
}
export function readMirror(owner) {
  try { const data = JSON.parse(localStorage.getItem(prefix + owner) || '[]'); return Array.isArray(data) ? data : []; } catch { return []; }
}
export function mirror(owner, rows) {
  localStorage.setItem(prefix + owner, JSON.stringify(rows));
}
export async function loadRows(owner) {
  const local = readMirror(owner);
  const indexed = (await transaction('events','readonly',s => s.getAll())).filter(r => r.owner === owner);
  const all = [...new Map([...local, ...indexed].map(row => [row.event.id,row])).values()];
  // Reconstitute IndexedDB after eviction from the localStorage recovery copy.
  for (const row of local) if (!indexed.some(r => r.key === row.key)) await transaction('events','readwrite',s => s.put(row));
  return all;
}
export async function saveRow(row) {
  await transaction('events','readwrite',s => s.put(row));
}
export async function seedCatalog() {
  await transaction('catalog','readwrite',s => s.put(catalog));
  localStorage.setItem(prefix + 'catalog', JSON.stringify(catalog));
}
export async function migrateLegacy() {
  if (localStorage.getItem(prefix+'legacy-migrated')) return;
  let old, runner;
  try {
    old = JSON.parse(localStorage.getItem('fitness-skills-progress-v1') || '{}');
    runner = JSON.parse(localStorage.getItem('fitness-skills-active-runner-v1') || 'null');
  } catch { return 'Alte lokale Daten sind beschädigt; Original bleibt erhalten. Neue Trainings können gespeichert werden.'; }
  for (const event of legacyEvents(old, SKILLS)) await saveRow({ key: `guest:${event.id}`, owner: 'guest', event, synced: false });
  if (runner && SKILLS.some(skill => skill.id === runner.skillId && skill.progressions[runner.stage]) && Array.isArray(runner.log)) await saveRunner('guest',runner);
  localStorage.setItem(prefix+'legacy-migrated','true');
  // Never delete the originals; unknown historical data remains recoverable.
}
export async function saveRunner(owner, state) {
  // Runner is device-local, never replayed on another device through Firestore.
  if (state === null) localStorage.removeItem(prefix+owner+':runner');
  else localStorage.setItem(prefix+owner+':runner',JSON.stringify(state));
  await transaction('runner','readwrite',s => s.put({owner,state}));
}
export async function loadRunner(owner) {
  const row = await transaction('runner','readonly',s => s.get(owner));
  if (row) return row.state;
  return JSON.parse(localStorage.getItem(prefix+owner+':runner') || 'null');
}
