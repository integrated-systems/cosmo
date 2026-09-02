// send-news-push — 2026-08-31. news-д "Шуурхай"/"Сэрэмжлүүлэг"/
// "Ноцтой" ангилалтай мэдээ НИЙТЛЭГДЭХЭД (trg_notify_urgent_news
// trigger-ээс) дуудагдаж, тухайн tenant-ийн бүх push_subscriptions-той
// хүлээн авагчид (нийтэд зориулсан мэдээ тул owner бүгдэд) мэдэгдэл
// илгээнэ. Send-voting-push-той ижил Web Push протокол ашиглана.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

Deno.serve(async (req) => {
  try {
    const { news_id } = await req.json();

    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:noreply@example.com';
    if (!vapidPublic || !vapidPrivate) {
      return new Response(JSON.stringify({ skipped: 'VAPID keys not configured' }), { status: 200 });
    }
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: newsRow } = await supabase
      .from('news')
      .select('id, tenant_id, title, urgent, warning, critical')
      .eq('id', news_id)
      .single();
    if (!newsRow) return new Response(JSON.stringify({ skipped: 'news not found' }), { status: 200 });

    const level = newsRow.critical ? 'Ноцтой' : newsRow.warning ? 'Сэрэмжлүүлэг' : 'Шуурхай';

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth_key')
      .eq('tenant_id', newsRow.tenant_id);

    const payload = JSON.stringify({
      title: `${level} мэдээ`,
      body: newsRow.title,
      url: `/cosmo/#/${newsRow.tenant_id}/news`,
    });

    const results = await Promise.allSettled(
      (subs ?? []).map((s) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
          payload
        )
      )
    );

    return new Response(JSON.stringify({ sent: results.length }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
