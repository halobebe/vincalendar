import { soundEffects } from './sound';

export type PushPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export function getPushNotificationStatus(): PushPermissionStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as PushPermissionStatus;
}

export async function requestPushPermission(): Promise<PushPermissionStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const result = await Notification.requestPermission();
    return result as PushPermissionStatus;
  } catch (e) {
    console.error('Error requesting notification permission:', e);
    return 'denied';
  }
}

export function sendBrowserNotification(title: string, options?: NotificationOptions) {
  soundEffects.playNotificationSound();

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'vinuni-course-deadline',
        ...options,
      });
    } catch (e) {
      console.warn('Browser notification blocked or unsupported inside iframe:', e);
    }
  }
}
