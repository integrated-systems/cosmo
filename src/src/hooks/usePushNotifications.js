import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';

// 2026-08-27, дэвшилтэт зүйл #7 — Push notification. VAPID public key
// нь нууц биш (client-д ил гардаг ердийн зүйл), .env-д тохируулна.
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications(tenantId) {
  const { user } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [supported] = useState('serviceWorker' in navigator && 'PushManager' in window);

  useEffect(() => {
    if (!supported || !user) return;
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    });
  }, [supported, user]);

  const subscribe = useCallback(async () => {
    if (!supported || !user || !VAPID_PUBLIC_KEY) return;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const reg = await navigator.serviceWorker.register('/cosmo/sw.js');
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    const json = sub.toJSON();
    await supabase.from('push_subscriptions').insert({
      user_id: user.id,
      tenant_id: tenantId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth_key: json.keys.auth,
    });
    setSubscribed(true);
  }, [supported, user, tenantId]);

  const unsubscribe = useCallback(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      await sub.unsubscribe();
    }
    setSubscribed(false);
  }, []);

  return { supported: supported && !!VAPID_PUBLIC_KEY, subscribed, subscribe, unsubscribe };
}
