import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { httpsCallable } from 'firebase/functions';
import { app, functions } from '../firebase';
import { Capacitor } from '@capacitor/core';

let messagingInstance: any = null;

try {
    messagingInstance = getMessaging(app);
} catch (e) {
    console.error('FCM init failed:', e);
}

export const pushNotificationService = {
    // Request permission and get FCM token
    async registerToken(): Promise<string | null> {
        if (!messagingInstance) return null;

        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return null;

            const vapidKey = 'BEl62iUYgUivxI0q5Z5vJzYN7w7p3Y5n5Z5vJzYN7w7p3Y5n5Z5vJzYN7w7p3Y5n5Z5vJzYN';
            const token = await getToken(messagingInstance, {
                vapidKey: 'BEl62iUYgUivxI0q5Z5vJzYN7w7p3Y5n5Z5vJzYN7w7p3Y5n5Z5vJzYN7w7p3Y5n5Z5vJzYN',
                serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js'),
            });

            if (token && functions) {
                const registerFn = httpsCallable(functions, 'registerFcmToken');
                await registerFn({
                    token,
                    platform: Capacitor.isNativePlatform() ? 'capacitor' : 'web',
                });
            }

            return token;
        } catch (e) {
            console.error('FCM token registration failed:', e);
            return null;
        }
    },

    // Listen for foreground messages
    onMessage(callback: (payload: any) => void): (() => void) | null {
        if (!messagingInstance) return null;
        return onMessage(messagingInstance, callback);
    },

    // Show a local notification (fallback for when FCM isn't available)
    showLocalNotification(title: string, body: string, data?: any): void {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body,
                icon: '/icons3d/logo.png',
                data,
            });
        }
    },
};
