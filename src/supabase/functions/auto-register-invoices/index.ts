// 2026-09-30: "Санхүү тохиргоо" > НББ > "Нэхэмжлэх" дэд табын
// `invoice_register_day`-д тохируулсан өдөр, pg_cron-оор (cron_auto_
// register_invoices) өдөр бүр дуудагдана. Invoice.jsx хуудасны
// "Нэхэмжлэх үүсгэх" (computePreview) + "үүсгэсэн нэхэмжлэхийг
// илгээх" (commitPreview) ХОЁР товчийг АВТОМАТААР, ЯГ ТЭР ЛОГИКООР
// (Rule of two — client/Invoice.jsx-той ижил тооцоолол) гүйцэтгэнэ.
// Тохирох tenant тус бүрт тухайн сарын (Монголын цагаар) нэхэмжлэхийг
// тооцоолж, шууд status='sent'-ээр хадгалж, журналын бичилт (Дт
// Авлага / Кт Орлого) үүсгэнэ.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const FIXED_NAMES = ['СӨХ-ны төлбөр', 'Зогсоол', 'Агуулах'];
const PET_FEE_NAME = 'Гэрийн тэжээвэр амьтны хураамж';

function extractGridItemUuid(gridId) {
  if (!gridId || typeof gridId !== 'string') return null;
  const parts = gridId.split(':');
  const uuid = parts.length > 1 ? parts[1] : parts[0];
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(uuid) ? uuid : null;
}

function sumLinkedSqm(gridItems, liveList) {
  if (!gridItems || gridItems.length === 0) return null;
  const liveMap = new Map(liveList.map((l) => [l.id, l]));
  let sum = 0;
  let found = false;
  (gridItems || []).forEach((it) => {
    const live = liveMap.get(it.id);
    if (live?.sqm != null) { sum += live.sqm; found = true; }
  });
  return found ? sum : null;
}

// src/hooks/useGridSpots.js-ийн toStorageSpots()-той ижил (Rule of two).
function buildGridStorageSpots(basementFloors) {
  const storage = [];
  (basementFloors || []).forEach((f) => {
    (f.layout_json?.slots || []).forEach((s) => {
      if (!s.label) return;
      if (s.kind === 'warehouse') storage.push({ id: `${f.floor_key}:${s.id}`, sqm: s.sqm ?? null });
    });
  });
  return storage;
}

// src/pages/Invoice.jsx-ийн calcOwnerItems()/calcClientItems()-той ЯГ
// ИЖИЛ (isOwner=true үед л PET_FEE_NAME мөрийг тооцно).
function calcItems(entity, tariffItems, gridStorageSpots, isOwner) {
  const items = [];
  const warnings = [];
  tariffItems.filter((t) => t.active).forEach((t) => {
    if (t.name === 'Зогсоол') {
      const qty = (entity.grid_parkings || []).length;
      if (qty > 0) items.push({ tariff_item_id: t.id, description: t.name, quantity: qty, unit_price: t.amount, amount: qty * t.amount });
    } else if (t.name === 'Агуулах') {
      const qty = (entity.grid_storages || []).length;
      if (qty > 0) {
        if (t.calc_method === 'area') {
          const sqm = sumLinkedSqm(entity.grid_storages, gridStorageSpots);
          if (sqm != null && sqm > 0) {
            items.push({ tariff_item_id: t.id, description: t.name, quantity: sqm, unit_price: t.amount, amount: sqm * t.amount });
          } else {
            warnings.push(`${t.name}: ${qty} агуулахын м² бүртгэгдээгүй тул тариф тооцоологдсонгүй`);
          }
        } else {
          items.push({ tariff_item_id: t.id, description: t.name, quantity: qty, unit_price: t.amount, amount: qty * t.amount });
        }
      }
    } else if (isOwner && t.name === PET_FEE_NAME) {
      const qty = entity.pet_count || 0;
      if (qty > 0) items.push({ tariff_item_id: t.id, description: t.name, quantity: qty, unit_price: t.amount, amount: qty * t.amount });
    } else if (t.name === 'СӨХ-ны төлбөр' && t.calc_method === 'area') {
      const sqm = entity.sqm || 0;
      if (sqm > 0) items.push({ tariff_item_id: t.id, description: t.name, quantity: sqm, unit_price: t.amount, amount: sqm * t.amount });
    } else {
      items.push({ tariff_item_id: t.id, description: t.name, quantity: 1, unit_price: t.amount, amount: t.amount });
    }
  });
  return { items, warnings };
}

// Том tenant (олон зуун мөр)-д дараалсан боловсруулалт Edge
// Function-ий ажиллах хугацааны хязгаарт (wall-clock timeout) тулгарч
// дутуу зогсох эрсдэлтэй тул batch-параллель (concurrency=20) ашиглана.
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

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Монголын цагийн бүс (UTC+8) — send-monthly-report-news-тэй ижил арга.
    const nowUtc = new Date();
    const mn = new Date(nowUtc.getTime() + 8 * 60 * 60 * 1000);
    const todayDay = mn.getUTCDate();
    const year = mn.getUTCFullYear();
    const month = mn.getUTCMonth() + 1;

    const { data: settingsRows, error: settingsErr } = await supabase
      .from('fin_settings')
      .select('tenant_id')
      .eq('invoice_register_day', todayDay);
    if (settingsErr) throw settingsErr;

    const results = [];
    for (const { tenant_id: hoaId } of settingsRows || []) {
      const [tariffItems, owners, clientele, unitLayoutsFull, basementFloors] = await Promise.all([
        fetchAll(supabase.from('tariff_items').select('*').eq('tenant_id', hoaId).eq('active', true)),
        fetchAll(supabase.from('owners').select('*').eq('tenant_id', hoaId)),
        fetchAll(supabase.from('clientele').select('*').eq('tenant_id', hoaId)),
        fetchAll(supabase.from('unit_layouts').select('id, building_no, floor, door_no').eq('tenant_id', hoaId)),
        fetchAll(supabase.from('basement_floors').select('floor_key, layout_json').eq('tenant_id', hoaId)),
      ]);
      const gridStorageSpots = buildGridStorageSpots(basementFloors);
      const ownerTariffs = tariffItems.filter((t) => t.category === 'owner');
      const clientTariffs = tariffItems.filter((t) => t.category === 'client');
      const spotOnlyTariffs = tariffItems.filter((t) => t.category === 'spot_only');

      const rows = [];
      owners.forEach((o) => {
        const applicableTariffs = o.building_no ? ownerTariffs : spotOnlyTariffs;
        const { items: lineItems } = calcItems(o, applicableTariffs, gridStorageSpots, true);
        if (lineItems.length === 0) return;
        const matchedUnit = unitLayoutsFull.find((u) => u.building_no === o.building_no && u.floor === o.floor && u.door_no === o.door_no);
        const ownerParkingUuid = !matchedUnit && o.has_grid_parking && Array.isArray(o.grid_parkings) && o.grid_parkings.length > 0 ? extractGridItemUuid(o.grid_parkings[0]?.id) : null;
        const ownerStorageUuid = !matchedUnit && !ownerParkingUuid && o.has_grid_storage && Array.isArray(o.grid_storages) && o.grid_storages.length > 0 ? extractGridItemUuid(o.grid_storages[0]?.id) : null;
        rows.push({
          target_type: 'owner',
          target_id: matchedUnit?.id || ownerParkingUuid || ownerStorageUuid || o.id,
          isUnit: !!matchedUnit,
          items: lineItems,
          total: lineItems.reduce((s, li) => s + li.amount, 0),
        });
      });
      clientele.forEach((c) => {
        const { items: lineItems } = calcItems(c, clientTariffs, gridStorageSpots, false);
        if (lineItems.length === 0) return;
        const gridLandUuid = c.has_grid_land && Array.isArray(c.grid_land_plots) && c.grid_land_plots.length > 0 ? extractGridItemUuid(c.grid_land_plots[0]?.id) : null;
        const clientParkingUuid = !gridLandUuid && c.has_grid_parking && Array.isArray(c.grid_parkings) && c.grid_parkings.length > 0 ? extractGridItemUuid(c.grid_parkings[0]?.id) : null;
        const clientStorageUuid = !gridLandUuid && !clientParkingUuid && c.has_grid_storage && Array.isArray(c.grid_storages) && c.grid_storages.length > 0 ? extractGridItemUuid(c.grid_storages[0]?.id) : null;
        rows.push({
          target_type: 'client',
          target_id: gridLandUuid || clientParkingUuid || clientStorageUuid || c.id,
          isUnit: false,
          items: lineItems,
          total: lineItems.reduce((s, li) => s + li.amount, 0),
        });
      });

      let created = 0;
      let skipped = 0;
      let failed = 0;
      let unitReceivableTotal = 0;
      let spotOnlyReceivableTotal = 0;
      let clientReceivableTotal = 0;
      await processBatch(rows, async (r) => {
        const { data: inv, error } = await supabase.from('invoices')
          .insert({ tenant_id: hoaId, target_type: r.target_type, target_id: r.target_id, period_year: year, period_month: month, total_amount: r.total, status: 'sent', sent_at: new Date().toISOString() })
          .select().single();
        if (error) { skipped++; return; }
        const { error: itemsError } = await supabase.from('invoice_items').insert(r.items.map((li) => ({ ...li, invoice_id: inv.id })));
        if (itemsError) {
          await supabase.from('invoices').delete().eq('id', inv.id);
          failed++;
          return;
        }
        created++;
        if (r.target_type === 'client') clientReceivableTotal += Number(r.total) || 0;
        else if (r.isUnit) unitReceivableTotal += Number(r.total) || 0;
        else spotOnlyReceivableTotal += Number(r.total) || 0;
      });

      // Орлого хүлээн зөвшөөрөх журналын бичилт — Invoice.jsx-ийн
      // commitPreview()-той ЯГ ИЖИЛ (account_code-үүд адил).
      const journalLines = [];
      if (unitReceivableTotal > 0) journalLines.push({ account_code: '1210', debit: unitReceivableTotal, credit: 0 });
      if (spotOnlyReceivableTotal > 0) journalLines.push({ account_code: '1240', debit: spotOnlyReceivableTotal, credit: 0 });
      if (clientReceivableTotal > 0) journalLines.push({ account_code: '1220', debit: clientReceivableTotal, credit: 0 });
      const totalIncome = unitReceivableTotal + spotOnlyReceivableTotal + clientReceivableTotal;
      if (journalLines.length > 0 && totalIncome > 0) {
        journalLines.push({ account_code: '5110', debit: 0, credit: totalIncome });
        const { data: entry, error: entryErr } = await supabase.from('journal_entries').insert({
          tenant_id: hoaId,
          entry_date: mn.toISOString().slice(0, 10),
          description: `${year} оны ${month}-р сарын нэхэмжлэх (автомат, ${created} ширхэг)`,
          source_type: 'invoice_sent',
          created_by: null,
        }).select().single();
        if (!entryErr && entry) {
          await supabase.from('journal_entry_lines').insert(journalLines.map((l) => ({ ...l, entry_id: entry.id })));
        }
      }

      results.push({ tenant_id: hoaId, created, skipped, failed });
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
