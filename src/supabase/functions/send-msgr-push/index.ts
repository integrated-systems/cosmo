// send-msgr-push — 2026-08-30. msgr_messages-д шинэ мвр (зурвас)
// INSERT хийгдмэгц (trg_notify_msgr_message trigger-ээс) дуудагдаж,
// ЗӨВХВН зохих ХЯМД хүлээн авагчид (dir='in'-ийн үед STAFF, dir='out'-
// ийн үед тухайн ОДООГИЙН ганц owner) push мэдэгдэл илгээнэ. Send-
// voting-push-той ижил Web Push протокол (VAPID) ашиглана.
//
// ШААРДЛАГАТАЙ Edge Function secrets: send-voting-push-тэй адил
// (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT) — аль хэдийн
// тохируулагдсан тул дахин хийх шаардлагагүй.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

Deno.serve(async (req) => {
  try {
    const { message_id } = await req.json();

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

    const { data: msg } = await supabase
      .from('msgr_messages')
      .select('id, list_id, tenant_id, dir, body, agent')
      .eq('id', message_id)
      .single();
    if (!msg) return new Response(JSON.stringify({ skipped: 'message not found' }), { status: 200 });

    const { data: list } = await supabase
      .from('msgr_list')
      .select('owner_id')
      .eq('id', msg.list_id)
      .single();

    let targetUserIds = [];
    let title = 'Шинэ зурвас';
    let url = `/cosmo/#/${msg.tenant_id}/msgr`;

    if (msg.dir === 'in') {
      // Owner бичсэн — STAFF (tenant_admin) бүгдэд мэдэгдэнэ.
      const { data: staffRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('tenant_id', msg.tenant_id)
        .eq('role', 'tenant_admin');
      targetUserIds = (staffRoles ?? []).map((r) => r.user_id);
      title = 'Сууц өмчлөгчөөс шинэ зурвас';
    } else {
      // Staff бичсэн — ТУХАЙН ГАНЦ owner-т мэдэгдэнэ.
      if (list?.owner_id) {
        const { data: owner } = await supabase.from('owners').select('user_id').eq('id', list.owner_id).single();
        if (owner?.user_id) targetUserIds = [owner.user_id];
      }
      title = msg.agent ? `${msg.agent}-ээс шинэ зурвас` : 'СӨХ-оос шинэ зурвас';
      url = `/cosmo/#/${msg.tenant_id}/userapp-msgr`;
    }

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ skipped: 'no target users' }), { status: 200 });
    }

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth_key')
      .in('user_id', targetUserIds);

    const payload = JSON.stringify({ title, body: msg.body || '📎 Хавсралт', url });

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
