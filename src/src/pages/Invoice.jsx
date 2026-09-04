import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { fetchAllRows } from '../lib/fetchAllRows';
import { formatMoney } from '../lib/format';
import { useGridSpots, sumLinkedSqm } from '../hooks/useGridSpots';
import { useAlert } from '../hooks/useAlert';

// "Нэхэмжлэх" (/invoice, САНХүү бүлэг) — 2026-09-04 (7) хэрэглэгчийн
// тодруулгаар: нэхэмжлэл үүсгэх нь Нягтлан бодогчийн (accounting)
// ажил тул зөвхөн "Төлбөр төлөлт" (үНДСЭН, ЕРӨӨНХИЙ бүлэг)-д БИШ,
// харин "САНХүү" бүлгийн ЯГ үүнд зориулагдсан "Нэхэмжлэх" линк дор л
// байх ёстой гэдгийг олж, "Төлбөр төлөлт"-ээс энд шилжүүлэв.
// "Тариф -> Нэхэмжлэл" урсгалыг хэрэгжүүлнэ (Төлбөр тааруулалт, НББ
// журнал зэрэг дараагийн үе шат). Аюулгүйн үүднээс АВТОМАТ cron БИШ,
// staff өөрвө дарж үүсгэдэг ГАР ТОВЧ хэлбэрээр эхлүүлнэ (тооцооллыг
// батлах хүртэл).


// 2026-09-04 (8): Хэрэглэгчийн шүүмжлэлээр "applies_to" баганыг
// арилгасны дараа - тооцооллын логикыг ФИКС нэрээр (СӨХ-ны төлбөр/
// Зогсоол/Агуулах) шууд танихаар шинэчлэв. Эдгээр 3 нэр ХЭЗЭЭ Ч
// өөрчлөгдөхгүй тул нэрээр таних нь аюулгүй, найдвартай.
function calcOwnerItems(owner, tariffItems, gridStorageSpots) {
  const items = [];
  tariffItems.filter((t) => t.active).forEach((t) => {
    if (t.name === 'Зогсоол') {
      const qty = (owner.grid_parkings || []).length;
      if (qty > 0) items.push({ tariff_item_id: t.id, description: t.name, quantity: qty, unit_price: t.amount, amount: qty * t.amount });
    } else if (t.name === 'Агуулах') {
      if (t.calc_method === 'area') {
        const sqm = sumLinkedSqm(owner.grid_storages, gridStorageSpots) || 0;
        if (sqm > 0) items.push({ tariff_item_id: t.id, description: t.name, quantity: sqm, unit_price: t.amount, amount: sqm * t.amount });
      } else {
        const qty = (owner.grid_storages || []).length;
        if (qty > 0) items.push({ tariff_item_id: t.id, description: t.name, quantity: qty, unit_price: t.amount, amount: qty * t.amount });
      }
    } else if (t.name === 'СӨХ-ны төлбөр' && t.calc_method === 'area') {
      const sqm = owner.sqm || 0;
      if (sqm > 0) items.push({ tariff_item_id: t.id, description: t.name, quantity: sqm, unit_price: t.amount, amount: sqm * t.amount });
    } else {
      // "СӨХ-ны төлбөр" (тоо/тогтмол) БОЛОН бусад бүх идэвхтэй мвр -
      // энгийн, нэг удаагийн тогтмол хураамж.
      items.push({ tariff_item_id: t.id, description: t.name, quantity: 1, unit_price: t.amount, amount: t.amount });
    }
  });
  return items;
}

function calcClientItems(client, tariffItems, gridStorageSpots) {
  const items = [];
  tariffItems.filter((t) => t.active).forEach((t) => {
    if (t.name === 'Зогсоол') {
      const qty = (client.grid_parkings || []).length;
      if (qty > 0) items.push({ tariff_item_id: t.id, description: t.name, quantity: qty, unit_price: t.amount, amount: qty * t.amount });
    } else if (t.name === 'Агуулах') {
      if (t.calc_method === 'area') {
        const sqm = sumLinkedSqm(client.grid_storages, gridStorageSpots) || 0;
        if (sqm > 0) items.push({ tariff_item_id: t.id, description: t.name, quantity: sqm, unit_price: t.amount, amount: sqm * t.amount });
      } else {
        const qty = (client.grid_storages || []).length;
        if (qty > 0) items.push({ tariff_item_id: t.id, description: t.name, quantity: qty, unit_price: t.amount, amount: qty * t.amount });
      }
    } else if (t.name === 'СӨХ-ны төлбөр' && t.calc_method === 'area') {
      // client.sqm нь үүсгэх үед аль хэдийн sumLinkedSqm(grid_land_plots)-
      // ээр автоматаар дүүргэгдсэн байдаг (EditClientModal.jsx).
      const sqm = client.sqm || 0;
      if (sqm > 0) items.push({ tariff_item_id: t.id, description: t.name, quantity: sqm, unit_price: t.amount, amount: sqm * t.amount });
    } else {
      items.push({ tariff_item_id: t.id, description: t.name, quantity: 1, unit_price: t.amount, amount: t.amount });
    }
  });
  return items;
}

export default function Invoice() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const { gridStorageSpots } = useGridSpots(hoaId);
  const { alert, AlertDialog } = useAlert();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [generating, setGenerating] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [names, setNames] = useState({}); // {`${type}-${id}`: name}
  const [expanded, setExpanded] = useState(null);
  const [items, setItems] = useState([]);

  async function loadInvoices() {
    setLoading(true);
    const { data } = await fetchAllRows(() =>
      supabase.from('invoices').select('*').eq('tenant_id', hoaId).eq('period_year', year).eq('period_month', month).order('created_at', { ascending: false })
    );
    setInvoices(data || []);
    setLoading(false);
  }
  useEffect(() => { if (hoaId) loadInvoices(); }, [hoaId, year, month]);

  useEffect(() => {
    if (invoices.length === 0) return;
    (async () => {
      const ownerIds = invoices.filter((i) => i.target_type === 'owner').map((i) => i.target_id);
      const clientIds = invoices.filter((i) => i.target_type === 'client').map((i) => i.target_id);
      const map = {};
      if (ownerIds.length) {
        const { data } = await supabase.from('owners').select('id, firstname, lastname, building_no, door_no').in('id', ownerIds);
        (data || []).forEach((o) => { map[`owner-${o.id}`] = `${o.firstname || ''} ${o.lastname || ''} (${o.building_no || ''} ${o.door_no || ''})`.trim(); });
      }
      if (clientIds.length) {
        const { data } = await supabase.from('clientele').select('id, legal_entity_name').in('id', clientIds);
        (data || []).forEach((c) => { map[`client-${c.id}`] = c.legal_entity_name; });
      }
      setNames(map);
    })();
  }, [invoices]);

  async function generate() {
    setGenerating(true);
    try {
      const { data: tariffItems } = await fetchAllRows(() =>
        supabase.from('tariff_items').select('*').eq('tenant_id', hoaId).eq('active', true)
      );
      const ownerTariffs = (tariffItems || []).filter((t) => t.category === 'owner');
      const clientTariffs = (tariffItems || []).filter((t) => t.category === 'client');

      const { data: owners } = await fetchAllRows(() => supabase.from('owners').select('*').eq('tenant_id', hoaId));
      const { data: clientele } = await fetchAllRows(() => supabase.from('clientele').select('*').eq('tenant_id', hoaId));

      let created = 0, skipped = 0;
      for (const o of owners || []) {
        const lineItems = calcOwnerItems(o, ownerTariffs, gridStorageSpots);
        if (lineItems.length === 0) continue;
        const total = lineItems.reduce((s, li) => s + li.amount, 0);
        const { data: inv, error } = await supabase.from('invoices')
          .insert({ tenant_id: hoaId, target_type: 'owner', target_id: o.id, period_year: year, period_month: month, total_amount: total, status: 'draft' })
          .select().single();
        if (error) { skipped++; continue; } // давхардсан (unique constraint) — алгасна
        await supabase.from('invoice_items').insert(lineItems.map((li) => ({ ...li, invoice_id: inv.id })));
        created++;
      }
      for (const c of clientele || []) {
        const lineItems = calcClientItems(c, clientTariffs, gridStorageSpots);
        if (lineItems.length === 0) continue;
        const total = lineItems.reduce((s, li) => s + li.amount, 0);
        const { data: inv, error } = await supabase.from('invoices')
          .insert({ tenant_id: hoaId, target_type: 'client', target_id: c.id, period_year: year, period_month: month, total_amount: total, status: 'draft' })
          .select().single();
        if (error) { skipped++; continue; }
        await supabase.from('invoice_items').insert(lineItems.map((li) => ({ ...li, invoice_id: inv.id })));
        created++;
      }
      alert(`${created} нэхэмжлэл үүсгэлээ${skipped ? `, ${skipped} аль хэдийн байсан тул алгаслаа` : ''}.`);
      loadInvoices();
    } finally {
      setGenerating(false);
    }
  }

  async function toggleExpand(invoiceId) {
    if (expanded === invoiceId) { setExpanded(null); return; }
    const { data } = await supabase.from('invoice_items').select('*').eq('invoice_id', invoiceId);
    setItems(data || []);
    setExpanded(invoiceId);
  }

  const totalSum = invoices.reduce((s, i) => s + Number(i.total_amount), 0);

  return (
    <>
      <div className="mb-3">
        <div className="text-[11.5px] text-mutedtext">СӨХ төлбөрийн нэхэмжлэх үүсгэх, харах</div>
      </div>

      <div className="ds-card p-4 mb-4 flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-[11px] text-mutedtext mb-1">Он</label>
          <input type="number" className="ds-input" style={{ width: 100 }} value={year} onChange={(e) => setYear(+e.target.value || now.getFullYear())} />
        </div>
        <div>
          <label className="block text-[11px] text-mutedtext mb-1">Сар</label>
          <select className="ds-input" value={month} onChange={(e) => setMonth(+e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <button className="ds-btn-primary" onClick={generate} disabled={generating}>
          {generating ? 'үүсгэж байна...' : 'Энэ сарын нэхэмжлэл бүртгэх'}
        </button>
        <span className="text-[11px] text-mutedtext ml-auto">Нийт: {invoices.length} нэхэмжлэл, {formatMoney(totalSum)}₮</span>
      </div>

      <div className="ds-card p-4">
        <table className="ds-table w-full">
          <thead>
            <tr>
              <th className="py-2 px-2"></th>
              <th className="py-2 px-2">ХЭН</th>
              <th className="py-2 px-2">ТөРөЛ</th>
              <th className="py-2 px-2">Дүн</th>
              <th className="py-2 px-2">СТАТУС</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
            {loading ? (
              <tr><td colSpan={5} className="py-8 text-center text-mutedtext">Ачаалж байна...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-mutedtext">Энэ сард нэхэмжлэл үүсгэгдээгүй байна</td></tr>
            ) : invoices.map((inv) => (
              <>
                <tr key={inv.id} className="cursor-pointer" onClick={() => toggleExpand(inv.id)}>
                  <td className="py-2 px-2 text-mutedtext">{expanded === inv.id ? '▼' : '▶'}</td>
                  <td className="py-2 px-2 text-slate-900 dark:text-white">{names[`${inv.target_type}-${inv.target_id}`] || '...'}</td>
                  <td className="py-2 px-2 text-mutedtext">{inv.target_type === 'owner' ? 'Сууц өмчлөгч' : 'Талбай өмчлөгч'}</td>
                  <td className="py-2 px-2 font-medium">{formatMoney(inv.total_amount)}₮</td>
                  <td className="py-2 px-2">
                    <span className={`text-[11px] font-medium ${inv.status === 'paid' ? 'text-customGreen' : inv.status === 'overdue' || inv.status === 'at_risk' ? 'text-customRed' : 'text-mutedtext'}`}>
                      {inv.status === 'draft' ? 'Ноорог' : inv.status === 'sent' ? 'Илгээсэн' : inv.status === 'paid' ? 'Төлсөн' : inv.status === 'overdue' ? 'Хугацаа хэтэрсэн' : 'Эрсдэлтэй'}
                    </span>
                  </td>
                </tr>
                {expanded === inv.id && (
                  <tr key={`${inv.id}-detail`}>
                    <td colSpan={5} className="py-2 px-4" style={{ background: 'rgba(0,0,0,0.15)' }}>
                      <table className="w-full text-[11.5px]">
                        <tbody>
                          {items.map((li) => (
                            <tr key={li.id}>
                              <td className="py-1 text-mutedtext">{li.description}</td>
                              <td className="py-1 text-right text-mutedtext">{li.quantity} x {formatMoney(li.unit_price)}₮</td>
                              <td className="py-1 text-right font-medium" style={{ width: 120 }}>{formatMoney(li.amount)}₮</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
      <AlertDialog />
    </>
  );
}
