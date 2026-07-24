import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { httpsCallable } from 'firebase/functions';
import { app, functions } from '../firebase';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';

const FCM_VAPID_KEY = import.meta.env?.VITE_FCM_VAPID_KEY || '';

let messagingInstance: any = null;
let lastRegisteredToken: string | null = null;

// Web messaging init (only for web platform)
const initPromise = isSupported()
    .then((supported) => {
        if (supported) {
            messagingInstance = getMessaging(app);
        }
        return messagingInstance;
    })
    .catch((e) => {
        console.warn('FCM not supported on this browser:', e);
        return null;
    });

async function getMessagingInstance(): Promise<any> {
    return initPromise;
}

// ── Native registration (Capacitor Android/iOS) ──
async function registerNativeToken(): Promise<string | null> {
    try {
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
        }
        if (permStatus.receive !== 'granted') {
            console.warn('[FCM] Native push permission denied');
            return null;
        }

        await PushNotifications.register();

        // Wait for the registration listener to deliver the device token.
        // Capacitor's register() is async; the token arrives via the
        // 'registration' event. We bridge that to a Promise here.
const token: string = await new Promise((resolve, reject) => {
            let settled = false;
            let regHandler: any = null;
            let errHandler: any = null;
            const cleanup = () => {
                if (regHandler?.remove) try { regHandler.remove(); } catch { /* noop */ }
                if (errHandler?.remove) try { errHandler.remove(); } catch { /* noop */ }
            };
            const onRegistration = (event: Token) => {
                if (settled) return;
                settled = true;
                cleanup();
                resolve(event.value);
            };
            const onRegistrationError = (err: any) => {
                if (settled) return;
                settled = true;
                cleanup();
                reject(err);
            };
            // Safety timeout ÃÂ¢ don't hang forever
            setTimeout(() => {
                if (!settled) {
                    settled = true;
                    cleanup();
                    reject(new Error('Native token registration timed out'));
                }
            }, 10000);

            PushNotifications.addListener('registration', onRegistration).then(h => { regHandler = h; });
            PushNotifications.addListener('registrationError', onRegistrationError).then(h => { errHandler = h; });
        });

        return token;
    } catch (e) {
        console.error('[FCM] Native registration failed:', e);
        return null;
    }
}

// ── Web registration (Firebase Messaging + VAPID) ──
async function registerWebToken(): Promise<string | null> {
    const messaging = await getMessagingInstance();
    if (!messaging) return null;
    if (typeof Notification === 'undefined') return null;
    if (!FCM_VAPID_KEY) {
        console.warn('[FCM] VITE_FCM_VAPID_KEY not set; FCM token registration skipped.');
        return null;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return null;

        const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        const token = await getToken(messaging, {
            vapidKey: FCM_VAPID_KEY,
            serviceWorkerRegistration: swReg,
        });

        return token;
    } catch (e) {
        console.error('[FCM] Web token registration failed:', e);
        return null;
    }
}

export const pushNotificationService = {
    async registerToken(): Promise<string | null> {
        // Pick the right path based on platform.
        const token = Capacitor.isNativePlatform()
            ? await registerNativeToken()
            : await registerWebToken();

        if (!token) return null;

        // Dedup: skip CF write if token unchanged since last registration
        if (token === lastRegisteredToken) return token;
        lastRegisteredToken = token;

        if (functions) {
            try {
                const registerFn = httpsCallable(functions, 'registerFcmToken');
                await registerFn({
                    token,
                    platform: Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web',
                });
            } catch (e) {
                console.error('[FCM] Token upload to Firestore failed:', e);
            }
        }

        return token;
    },

    async onMessage(callback: (payload: any) => void): Promise<(() => void) | null> {
        // Native: capacitor 'pushNotificationReceived' event fires in foreground.
        if (Capacitor.isNativePlatform()) {
            try {
                await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
                    callback({
                        notification: {
                            title: notification.title,
                            body: notification.body,
                        },
                        data: notification.data,
                    });
                });
                return () => { /* listener cleanup best-effort */ };
            } catch (e) {
                console.warn('[FCM] Native onMessage listener failed:', e);
                return null;
            }
        }
        // Web: firebase/messaging onMessage
        const messaging = await getMessagingInstance();
        if (!messaging) return null;
        return onMessage(messaging, callback);
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
                console.warn('[FCM] Local notification failed:', e);
            }
        }
    },
};