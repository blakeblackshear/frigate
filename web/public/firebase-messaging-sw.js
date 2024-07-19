// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries
// are not available in the service worker.
importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js");

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
firebase.initializeApp({
  apiKey: "AIzaSyCoweRLtvai8iNwhsoT-GH_CH_0pckqMmA",
  authDomain: "frigate-ed674.firebaseapp.com",
  projectId: "frigate-ed674",
  storageBucket: "frigate-ed674.appspot.com",
  messagingSenderId: "76314288339",
  appId: "1:76314288339:web:090e170610d3bf0966f426",
  measurementId: "G-GZ1JKNDJZK",
});

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
    icon: '/images/maskable-icon.png',
  };

  self.registration.showNotification(
    payload.notification.title,
    notificationOptions
  );
});
