// send-voting-push — 2026-08-27, дэвшилтэт зүйл #7. voting_polls.status
// "active" болмогц (trg_notify_voting_poll_opened trigger-ээс) дуудагдаж,
// тухайн tenant-ийн push_subscriptions-той бүх хэрэглэгчид мэдэгдэл
// илгээнэ. Web Push протокол ашиглана (VAPID).
//
// ШААРДЛАГАТАЙ Edge Function secrets (Supabase dashboard → Edge
// Functions → Secrets-ээс нэг удаа гараар тохируулна):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (жиш: mailto:admin@example.com)
import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

Deno.serve(async (req) => {
  try {
    const { poll_id, tenant_id, title } = await req.json();

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

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth_key')
      .eq('tenant_id', tenant_id);

    const payload = JSON.stringify({
      title: 'Шинэ санал асуулга',
      body: title,
      url: `/cosmo/#/${tenant_id}/voting/${poll_id}/results`,
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
