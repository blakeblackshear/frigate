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
      const url = event.notification.data.link;
      // eslint-disable-next-line no-undef
      if (clients.openWindow) {
        // eslint-disable-next-line no-undef
        return clients.openWindow(url);
      }
    }
  }
});
