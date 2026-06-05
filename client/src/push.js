import { api } from './api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// Текущее состояние: 'unsupported' | 'denied' | 'on' | 'off'
export async function pushStatus() {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return 'off';
    const sub = await reg.pushManager.getSubscription();
    return sub ? 'on' : 'off';
  } catch {
    return 'off';
  }
}

// Включить уведомления: разрешение + подписка + сохранение на сервере
export async function enablePush() {
  if (!pushSupported()) throw new Error('Уведомления не поддерживаются этим браузером');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Доступ к уведомлениям не выдан');

  const reg = await navigator.serviceWorker.ready;
  const { key } = await api.getPushKey();
  if (!key) throw new Error('Сервер не настроил уведомления');

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key)
    });
  }
  await api.subscribePush(sub.toJSON());
  return true;
}

// Выключить уведомления
export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    try {
      await api.unsubscribePush(sub.endpoint);
    } catch {
      /* игнор */
    }
    await sub.unsubscribe();
  }
}
