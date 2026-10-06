// 2026-09-30: "Санхүү тохиргоо" > НББ > "Нэхэмжлэх" дэд табын
// `invoice_send_day`-д тохируулсан өдөр, pg_cron-оор (cron_send_
// invoice_notifications) өдөр бүр дуудагдана. Тухайн сард status=
// 'sent' боловч ХАРАХАН мэдэгдээгүй (notified_at IS NULL) нэхэмжлэхийг
// олж, тохируулсан сувгаар (одоогоор зөвхөн Мессенжер — Мэйл/СМС
// дараа нэмэгдэнэ) эзэмшигчид мэдэгдэнэ. Мессенжерийн шинэ мессеж
// (msgr_messages INSERT) үүсэх үед trg_notify_msgr_message trigger нь
// send-msgr-push-ийг ӨӨРӨӨ дуудаж push илгээдэг тул энд дахин
// дуудах шаардлагагүй (Rule of two — Msgr.jsx-тэй ижил зарчим).
import { createClient } from 'jsr:@supabase/supabase-js@2';

function extractGridItemUuid(gridId) {
  if (!gridId || typeof gridId !== 'string') return null;
  const parts = gridId.split(':');
  const uuid = parts.length > 1 ? parts[1] : parts[0];
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(uuid) ? uuid : null;
}

// Том tenant (олон зуун эзэмшигч)-д дараалсан боловсруулалт Edge
// Function-ий ажиллах хугацааны хязгаарт тулгарч дутуу зогсох
// эрсдэлтэй тул batch-параллель (concurrency=20) ашиглана.
async function processBatch(items, worker, batchSize = 20) {
  for (let i = 0; i < items.length; i += batchSize) {
    await Promise.all(items.slice(i, i + batchSize).map(worker));
  }
}

async function fetchAll(baseQuery) {
  const rows = [];
  let from = 0;
  const pageSize = 1000;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await baseQuery.range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

function formatMoney(n) {
  return Math.round(Number(n) || 0).toLocaleString('mn-MN');
}

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const nowUtc = new Date();
    const mn = new Date(nowUtc.getTime() + 8 * 60 * 60 * 1000);
    const todayDay = mn.getUTCDate();
    const year = mn.getUTCFullYear();
    const month = mn.getUTCMonth() + 1;

    const { data: settingsRows, error: settingsErr } = await supabase
      .from('fin_settings')
      .select('tenant_id, invoice_due_day, notify_mail, notify_sms, notify_messenger')
      .eq('invoice_send_day', todayDay);
    if (settingsErr) throw settingsErr;

    const results = [];
    for (const settings of settingsRows || []) {
      const hoaId = settings.tenant_id;
      // 2026-09-30: Одоогоор зөвхөн Мессенжер холбогдсон (Мэйл/СМС-ийн
      // gateway дараа нэмэгдэнэ) — notify_mail/notify_sms асаалттай ч
      // одоохондоо юу ч илгээхгүй (мэдэгдэхгүйгээр notified_at-аа ч
      // тэмдэглэхгүй, ирээдүйд тэдгээр суваг нэмэгдэхэд дахин оролдоно).
      if (!settings.notify_messenger) {
        results.push({ tenant_id: hoaId, skipped_reason: 'notify_messenger идэвхгүй' });
        continue;
      }

      const [ownerInvoices, owners, unitLayoutsFull] = await Promise.all([
        fetchAll(supabase.from('invoices').select('id, target_id, total_amount')
          .eq('tenant_id', hoaId).eq('target_type', 'owner')
          .eq('period_year', year).eq('period_month', month).is('notified_at', null)),
        fetchAll(supabase.from('owners').select('id, user_id, building_no, floor, door_no, has_grid_parking, grid_parkings, has_grid_storage, grid_storages').eq('tenant_id', hoaId)),
        fetchAll(supabase.from('unit_layouts').select('id, building_no, floor, door_no').eq('tenant_id', hoaId)),
      ]);

      let sent = 0;
      let unresolved = 0;
      const errorSamples = [];
      // Owner_id-гаар msgr_list-ийг нэг удаа bulk унших үед урьдчилан
      // Map болгож бэлдэж, давталт бүрт дахин select явуулахгүй болгоно.
      const { data: existingLists } = await supabase.from('msgr_list').select('id, owner_id').eq('tenant_id', hoaId);
      const listByOwner = new Map((existingLists || []).map((l) => [l.owner_id, l.id]));

      await processBatch(ownerInvoices, async (inv) => {
        // Invoice.jsx-ийн "names" effect-тэй ижил эргүүлэн хайлт
        // (Rule of two): эхлээд unit_layouts-аар, олдохгүй бол
        // grid_parkings/grid_storages дотроос.
        const unit = unitLayoutsFull.find((u) => u.id === inv.target_id);
        let owner = unit ? owners.find((o) => o.building_no === unit.building_no && o.floor === unit.floor && o.door_no === unit.door_no) : null;
        if (!owner) {
          owner = owners.find((o) =>
            (Array.isArray(o.grid_parkings) && o.grid_parkings.some((p) => extractGridItemUuid(p?.id) === inv.target_id)) ||
            (Array.isArray(o.grid_storages) && o.grid_storages.some((p) => extractGridItemUuid(p?.id) === inv.target_id)));
        }
        if (!owner) { owner = owners.find((o) => o.id === inv.target_id); }
        if (!owner) { unresolved++; if (errorSamples.length < 5) errorSamples.push({ invoice_id: inv.id, reason: 'owner_not_found' }); return; }

        let listId = listByOwner.get(owner.id);
        if (!listId) {
          const { data: newList, error: listErr } = await supabase.from('msgr_list').insert({ tenant_id: hoaId, owner_id: owner.id }).select('id').single();
          if (listErr) { unresolved++; if (errorSamples.length < 5) errorSamples.push({ invoice_id: inv.id, reason: 'list_insert_error', detail: listErr.message }); return; }
          listId = newList.id;
          listByOwner.set(owner.id, listId);
        }

        const dueNote = settings.invoice_due_day ? ` ${settings.invoice_due_day}-ны дотор төлнө үү.` : '';
        const body = `${year} оны ${month}-р сарын СӨХ-ийн нэхэмжлэх: ${formatMoney(inv.total_amount)}₮.${dueNote}`;
        const { error: msgErr } = await supabase.from('msgr_messages').insert({ tenant_id: hoaId, list_id: listId, dir: 'out', body, agent: 'Систем (автомат)' });
        if (msgErr) { unresolved++; if (errorSamples.length < 5) errorSamples.push({ invoice_id: inv.id, reason: 'message_insert_error', detail: msgErr.message }); return; }

        await supabase.from('invoices').update({ notified_at: new Date().toISOString() }).eq('id', inv.id);
        sent++;
      });

      results.push({ tenant_id: hoaId, sent, unresolved, errorSamples });
    }

    return new Response(JSON.stringify({ ok: true, year, month, processed: results.length, results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
