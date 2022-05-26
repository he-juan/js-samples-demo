var cacheName = 'helloWorld';

self.addEventListener('fetch', function(event) {
    console.warn("event:",event)
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                console.warn("response:",response)
                if (response) {
                    return response;
                }

                var fetchRequest = event.request.clone();

                return fetch(fetchRequest).then(
                    function(fetchResponse) {
                        if(!fetchResponse || fetchResponse.status !== 200) {
                            return fetchResponse;
                        }

                        var responseToCache = fetchResponse.clone();

                        caches.open(cacheName)
                            .then(function(cache) {
                                cache.put(event.request, responseToCache);
                            });

                        return fetchResponse;
                    }
                );
            })
    );
});
