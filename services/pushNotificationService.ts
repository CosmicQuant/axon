import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { httpsCallable } from 'firebase/functions';
import { app, functions } from '../firebase';
import { Capacitor } from '@capacitor/core';

const FCM_VAPID_KEY = import.meta.env?.VITE_FCM_VAPID_KEY || '';

let messagingInstance: any = null;

isSupported()
    .then((supported) => {
        if (supported) {
            messagingInstance = getMessaging(app);
        }
    })
    .catch((e) => {
        console.warn('FCM not supported on this browser:', e);
    });

export const pushNotificationService = {
    async registerToken(): Promise<string | null> {
        if (!messagingInstance) return null;
        if (typeof Notification === 'undefined') return null;
        if (!FCM_VAPID_KEY) {
            console.warn('VITE_FCM_VAPID_KEY not set; FCM token registration skipped.');
            return null;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return null;

            const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            const token = await getToken(messagingInstance, {
                vapidKey: FCM_VAPID_KEY,
                serviceWorkerRegistration: swReg,
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

    onMessage(callback: (payload: any) => void): (() => void) | null {
        if (!messagingInstance) return null;
        return onMessage(messagingInstance, callback);
    },

    showLocalNotification(title: string, body: string, data?: any): void {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try {
                new Notification(title, {
                    body,
                    icon: '/icons3d/logo.png',
                    data,
                });
            } catch (e) {
                console.warn('Local notification failed:', e);
            }
        }
    },
};
