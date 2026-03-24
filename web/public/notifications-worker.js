// Notifications Worker

self.addEventListener("push", function (event) {
  // @ts-expect-error we know this exists
  if (event.data) {
    // @ts-expect-error we know this exists
    const data = event.data.json();

    let actions = [];

    switch (data.type ?? "unknown") {
      case "alert":
        actions = [
          {
            action: "markReviewed",
            title: "Mark as Reviewed",
          },
        ];
        break;
    }

    const notificationOptions = {
      body: data.message,
      icon: "/images/maskable-icon.png",
      image: data.image,
      badge: "/images/maskable-badge.png",
      tag: data.id,
      data: { id: data.id, link: data.direct_url },
      actions,
    };

    // iOS Safari does not auto-coalesce notifications by tag (WebKit bug #258922).
    // On iOS 18.3+ close() works, so we manually close duplicates before showing.
    // On other platforms, tag-based replacement works natively — skip the extra work.
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !self.MSStream;

    const show = () =>
      // @ts-expect-error we know this exists
      self.registration.showNotification(data.title, notificationOptions);

    // event.waitUntil is required on iOS Safari — without it, the browser
    // may consider this a "silent push" and revoke the subscription after 3 occurrences.
    event.waitUntil(
      isIOS
        ? // @ts-expect-error we know this exists
          self.registration
            .getNotifications({ tag: data.id })
            .then((existing) => {
              for (const n of existing) {
                n.close();
              }
            })
            .then(show)
        : show(), // eslint-disable-line comma-dangle
    );
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

    switch (event.action ?? "default") {
      case "markReviewed":
        if (event.notification.data) {
          event.waitUntil(
            fetch("/api/reviews/viewed", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": 1,
              },
              body: JSON.stringify({ ids: [event.notification.data.id] }),
            }), // eslint-disable-line comma-dangle
          );
        }
        break;
      default:
        // @ts-expect-error we know this exists
        if (event.notification.data) {
          const url = event.notification.data.link;
          // eslint-disable-next-line no-undef
          if (clients.openWindow) {
            // eslint-disable-next-line no-undef
            event.waitUntil(clients.openWindow(url));
          }
        }
    }
  }
});
