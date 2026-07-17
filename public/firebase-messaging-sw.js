// Firebase Cloud Messaging Service Worker
// Handles background push notifications for web users

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyDmlfHY6Gnf-_kwVTV1yAIG05TzHFhU638",
    authDomain: "axon-8b0a8.firebaseapp.com",
    projectId: "axon-8b0a8",
    storageBucket: "axon-8b0a8.appspot.com",
    messagingSenderId: "1026174975492",
    appId: "1:1026174975492:web:6a6f0c5b7e5e1c3d8e7f0a"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification?.title || 'Axon Update';
    const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/icons3d/logo.png',
        badge: '/icons3d/logo.png',
        data: payload.data || {},
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click — open the app
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const urlToOpen = event.notification.data?.url || '/';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});
