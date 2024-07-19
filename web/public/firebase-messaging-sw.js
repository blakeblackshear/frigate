// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries
// are not available in the service worker.
importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js");

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
const fbConfig = await (
  await fetch(`${window.location.href}/firebase-config.json`)
).json();

firebase.initializeApp(fbConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  // Customize notification here
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.data.imageUrl,
    tag: payload.data.id, // ensure that the notifications for same items are written over
  };

  self.registration.showNotification(
    payload.notification.title,
    notificationOptions
  );
});
