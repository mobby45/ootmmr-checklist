const CACHE = 'ootmm-images-v1';

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only cache images
  if (!url.pathname.includes('/images/') || !url.pathname.endsWith('.png')) return;

  event.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        });
      })
    )
  );
});
