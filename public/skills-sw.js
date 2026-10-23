// App-owned worker extension. No Auth tokens or user writes in a fetch queue.
// The SDK owns Firestore transport; the worker persists the offline catalogue
// and wakes open clients on supported Background Sync implementations.
function skillsDatabase() {
  return new Promise((resolve,reject) => {
    const request = indexedDB.open('skills-progression-v1',1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('events',{keyPath:'key'});
      db.createObjectStore('catalog',{keyPath:'id'});
      db.createObjectStore('runner',{keyPath:'owner'});
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
self.addEventListener('install',event => event.waitUntil((async () => {
  const url = new URL('./skills-catalog.v1.json',self.registration.scope);
  const response = await fetch(url);
  if (!response.ok) throw new Error('Skill catalogue unavailable');
  const catalog = await response.clone().json();
  const cache = await caches.open(CACHE);
  await cache.put(url,response);
  const db = await skillsDatabase();
  try {
    await new Promise((resolve,reject) => {
      const tx = db.transaction('catalog','readwrite');
      tx.objectStore('catalog').put(catalog);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
})()));
self.addEventListener('fetch',event => {
  const url = new URL(event.request.url);
  if (event.request.method === 'GET' && url.href === new URL('./skills-catalog.v1.json',self.registration.scope).href) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(event.request)) || fetch(event.request)));
  }
});
self.addEventListener('sync',event => {
  if (event.tag === 'skills-progress-sync') event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients => {
    clients.forEach(client => client.postMessage({type:'SKILLS_SYNC_REQUEST'}));
  }));
});
