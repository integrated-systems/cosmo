// send-official-notice-push — 2026-09-13. official_notice_recipients-д
// шинэ мвр INSERT хийгдмэгц (trg_official_notice_push trigger-ээс)
// дуудагдаж, тухайн ганц owner-т (client бол push мэдэгдэл хараахан
// байхгүй, учир нь одоогоор Talbai-д зориулсан UserApp огт байхгүй) push
// мэдэгдэл илгээнэ. send-msgr-push-той ЯГ ИЖИЛ Web Push (VAPID)
// протокол ашиглана.
//
// ШААРДЛАГАТАЙ Edge Function secrets: send-msgr-push-той адил
// (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT) — аль хэдийн
// тохируулагдсан тул дахин хийх шаардлагагүй.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

Deno.serve(async (req) => {
  try {
    const { recipient_id } = await req.json();

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

    const { data: recipient } = await supabase
      .from('official_notice_recipients')
      .select('id, notice_id, tenant_id, owner_id')
      .eq('id', recipient_id)
      .single();
    if (!recipient) return new Response(JSON.stringify({ skipped: 'recipient not found' }), { status: 200 });
    if (!recipient.owner_id) return new Response(JSON.stringify({ skipped: 'no owner (client recipient, UserApp not available yet)' }), { status: 200 });

    const { data: notice } = await supabase
      .from('official_notices')
      .select('title, content, notice_type')
      .eq('id', recipient.notice_id)
      .single();
    if (!notice) return new Response(JSON.stringify({ skipped: 'notice not found' }), { status: 200 });

    const { data: owner } = await supabase.from('owners').select('user_id').eq('id', recipient.owner_id).single();
    if (!owner?.user_id) return new Response(JSON.stringify({ skipped: 'owner has no user account' }), { status: 200 });

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth_key')
      .eq('user_id', owner.user_id);

    const payload = JSON.stringify({
      title: notice.notice_type || 'Албан мэдэгдэл',
      body: notice.title || notice.content || 'Шинэ мэдэгдэл',
      url: `/cosmo/#/${recipient.tenant_id}/userapp-notices`,
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
