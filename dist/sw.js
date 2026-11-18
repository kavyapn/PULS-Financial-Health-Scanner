// Retire the previous demo's offline worker on the next online visit.
self.addEventListener("install", event => event.waitUntil(self.skipWaiting()));

self.addEventListener("activate", event => {
  const prefix = `next-move:${self.registration.scope}:`;
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(prefix)).map(name => caches.delete(name)));
    await self.registration.unregister();
  })());
});
