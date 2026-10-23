import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { indexedDB } from 'fake-indexeddb';
const catalog = JSON.parse(await readFile(new URL('../public/skills-catalog.v1.json',import.meta.url),'utf8'));
test('built worker precaches bundles and catalogue, seeds IndexedDB and serves catalogue offline',async () => {
  const source = await readFile(new URL('../dist/sw.js',import.meta.url),'utf8');
  const handlers = {}, stores = new Map();
  const key = request => typeof request === 'string' ? request : request instanceof URL ? request.href : request.url;
  const open = async name => {
    if (!stores.has(name)) stores.set(name,new Map());
    const map = stores.get(name);
    return {addAll:async urls => { for (const u of urls) map.set(key(u),new Response(u.endsWith('.json') ? JSON.stringify(catalog) : 'asset')); },put:async (request,response) => map.set(key(request),response),match:async request => map.get(key(request))?.clone()};
  };
  let network = true;
  const scope = 'https://skills.test/app/';
  vm.runInNewContext(source,{
    indexedDB, URL, Response, setTimeout, clearTimeout,
    fetch:async () => {if (!network) throw new Error('offline'); return new Response(JSON.stringify(catalog));},
    caches:{open,keys:async () => [...stores.keys()],delete:async name => stores.delete(name),match:async req => {for (const name of stores.keys()) {const found = await (await open(name)).match(req);if(found)return found;} }},
    self:{registration:{scope},location:{origin:'https://skills.test'},skipWaiting(){},clients:{claim:async () => {},matchAll:async () => []},addEventListener:(name,handler) => (handlers[name] ||= []).push(handler)},
  });
  const waits = [];
  handlers.install.forEach(handler => handler({waitUntil:p => waits.push(p)}));
  await Promise.all(waits);
  const cached = [...stores.values()].flatMap(s => [...s.keys()]);
  assert(cached.some(u => u.includes('/assets/') && u.endsWith('.js')));
  assert(cached.some(u => u.includes('/assets/') && u.endsWith('.css')));
  assert(cached.includes(scope+'skills-catalog.v1.json'));
  const db = await new Promise(resolve => {const r=indexedDB.open('skills-progression-v1',1);r.onsuccess=() => resolve(r.result);});
  const stored = await new Promise(resolve => {const r=db.transaction('catalog').objectStore('catalog').get('calisthenics-v1');r.onsuccess=() => resolve(r.result);});
  assert.equal(stored.skills.length,14);
  network = false;
  let response;
  handlers.fetch.forEach(handler => handler({request:{method:'GET',url:scope+'skills-catalog.v1.json',mode:'cors'},respondWith:p => { assert(!response,'only one handler responds'); response=p; }}));
  assert.equal((await (await response).json()).skills.length,14);
  db.close();
});
