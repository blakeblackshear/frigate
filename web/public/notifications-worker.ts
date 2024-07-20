// Notifications Worker

self.addEventListener("push", function (event) {
  // @ts-expect-error we know this exists
  if (event.data) {
    // @ts-expect-error we know this exists
    const data = event.data.json();
    // @ts-expect-error we know this exists
    self.registration.showNotification(data.title, {
      body: data.message,
      icon: "/images/maskable-icon.png",
      image: data.image,
      badge: "/images/maskable-badge.png",
      tag: data.id,
      data: { id: data.id, link: data.direct_url },
    });
  } else {
    // pass
    // This push event has no data
  }
});

self.addEventListener("notificationclick", (event) => {
  // @ts-expect-error we know this exists
  if (event.notification) {
    // @ts-expect-error we know this exists
    event.notification.close();

    // @ts-expect-error we know this exists
    if (event.notification.data) {
      // @ts-expect-error we know this exists
      const url = event.notification.data.link;

      // @ts-expect-error we know this exists
      clients.matchAll({ type: "window" }).then((windowClients) => {
        // Check if there is already a window/tab open with the target URL
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          // If so, just focus it.
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
        }
        // If not, then open the target URL in a new window/tab.
        // @ts-expect-error we know this exists
        if (clients.openWindow) {
          // @ts-expect-error we know this exists
          return clients.openWindow(url);
        }
      });
    }
  }
});
