import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { fetchAllRows } from '../lib/fetchAllRows';
import { formatMoney } from '../lib/format';
import { useGridSpots, sumLinkedSqm } from '../hooks/useGridSpots';
import { useAlert } from '../hooks/useAlert';

// "Нэхэмжлэх" (/invoice, САНХүү бүлэг) — 2026-09-07 (17): Хэрэглэгчийн
// зурган хүсэлтээр 2 үе шаттай урсгал болгож бүрэн дахин зохион
// байгуулав: (1) "Нэхэмжлэх үүсгэх" - зөвхөн ТООЦООЛОХ (юу ч
// бичихгүй), (2) "үүсгэсэн нэхэмжлэхийг хадгалах" - тэр тооцооллыг
// шалгасны дараа л бодитоор бичнэ. ҮҮгээр Хүннү супермаркетийн
// жишээ шиг тооцооллын алдааг ХАДГАЛАХААС ӨМНӨ олж засах боломжтой.
const FIXED_NAMES = ['СӨХ-ны төлбөр', 'Зогсоол', 'Агуулах'];
const BREAKDOWN_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef5555', '#0a428f', '#ec4899', '#14b8a6'];

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
      const sqm = client.sqm || 0;
      if (sqm > 0) items.push({ tariff_item_id: t.id, description: t.name, quantity: sqm, unit_price: t.amount, amount: sqm * t.amount });
    } else {
      items.push({ tariff_item_id: t.id, description: t.name, quantity: 1, unit_price: t.amount, amount: t.amount });
    }
  });
  return items;
}

// 3 ФИКС нэрийг эхэнд, дараа нь бусдыг дүнгээр нь буурахаар эрэмбэлнэ.
function sortBreakdown(totals) {
  const fixed = FIXED_NAMES.map((name) => ({ name, amount: totals[name] || 0 }));
  const rest = Object.entries(totals)
    .filter(([name]) => !FIXED_NAMES.includes(name))
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
  return [...fixed, ...rest];
}

// Нэг нэхэмжлэлийн задаргааны мврүүдийг харуулах үед мвн 3 ФИКС нэрийг
// эхэнд, бусдыг үүсгэсэн (анхны) дарааллаар нь хэвээр үзүүлнэ.
function sortItems(items) {
  return [...items].sort((a, b) => {
    const ai = FIXED_NAMES.indexOf(a.description);
    const bi = FIXED_NAMES.indexOf(b.description);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return 0;
  });
}

export default function Invoice() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const { gridStorageSpots } = useGridSpots(hoaId);
  const { alert, AlertDialog } = useAlert();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [search, setSearch] = useState('');
  const [computing, setComputing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invoices, setInvoices] = useState([]); // committed (Supabase-с)
  const [previewRows, setPreviewRows] = useState(null); // тооцоолсон ч хараахан хадгалаагүй
  const [loading, setLoading] = useState(true);
  const [names, setNames] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [items, setItems] = useState([]);
  const [prevTotal, setPrevTotal] = useState(null);

  async function loadInvoices() {
    setLoading(true);
    setPreviewRows(null); // сар/жил солиход тооцоолол дахин эхэлнэ
    const { data } = await fetchAllRows(() =>
      supabase.from('invoices').select('*').eq('tenant_id', hoaId).eq('period_year', year).eq('period_month', month).order('created_at', { ascending: false })
    );
    setInvoices(data || []);
    setLoading(false);

    // өмнөх сартай харьцуулах (өсөлт/бууралт үзүүлэлт)
    const py = month === 1 ? year - 1 : year;
    const pm = month === 1 ? 12 : month - 1;
    const { data: prevData } = await supabase.from('invoices').select('total_amount').eq('tenant_id', hoaId).eq('period_year', py).eq('period_month', pm);
    setPrevTotal((prevData || []).reduce((s, i) => s + Number(i.total_amount), 0));
  }
  useEffect(() => { if (hoaId) loadInvoices(); }, [hoaId, year, month]);

  const committedIds = useMemo(() => ({
    ownerIds: invoices.filter((i) => i.target_type === 'owner').map((i) => i.target_id),
    clientIds: invoices.filter((i) => i.target_type === 'client').map((i) => i.target_id),
  }), [invoices]);

  useEffect(() => {
    if (invoices.length === 0) return;
    (async () => {
      const map = {};
      if (committedIds.ownerIds.length) {
        const { data } = await supabase.from('owners').select('id, firstname, lastname, building_no, door_no').in('id', committedIds.ownerIds);
        (data || []).forEach((o) => { map[`owner-${o.id}`] = { name: `${o.firstname || ''} ${o.lastname || ''}`.trim(), sub: `${o.building_no || ''} ${o.door_no || ''}`.trim() }; });
      }
      if (committedIds.clientIds.length) {
        const { data } = await supabase.from('clientele').select('id, legal_entity_name').in('id', committedIds.clientIds);
        (data || []).forEach((c) => { map[`client-${c.id}`] = { name: c.legal_entity_name, sub: 'Талбай өмчлөгч' }; });
      }
      setNames(map);
    })();
  }, [invoices, committedIds]);

  // ---------------- үе шат 1: ТООЦООЛОХ (юу ч бичихгүй) ----------------
  async function computePreview() {
    setComputing(true);
    try {
      const { data: tariffItems } = await fetchAllRows(() =>
        supabase.from('tariff_items').select('*').eq('tenant_id', hoaId).eq('active', true)
      );
      const ownerTariffs = (tariffItems || []).filter((t) => t.category === 'owner');
      const clientTariffs = (tariffItems || []).filter((t) => t.category === 'client');
      const { data: owners } = await fetchAllRows(() => supabase.from('owners').select('*').eq('tenant_id', hoaId));
      const { data: clientele } = await fetchAllRows(() => supabase.from('clientele').select('*').eq('tenant_id', hoaId));

      const rows = [];
      (owners || []).forEach((o) => {
        const lineItems = calcOwnerItems(o, ownerTariffs, gridStorageSpots);
        if (lineItems.length === 0) return;
        rows.push({
          target_type: 'owner', target_id: o.id,
          name: `${o.firstname || ''} ${o.lastname || ''}`.trim(), sub: `${o.building_no || ''} ${o.door_no || ''}`.trim(),
          items: lineItems, total: lineItems.reduce((s, li) => s + li.amount, 0),
        });
      });
      (clientele || []).forEach((c) => {
        const lineItems = calcClientItems(c, clientTariffs, gridStorageSpots);
        if (lineItems.length === 0) return;
        rows.push({
          target_type: 'client', target_id: c.id,
          name: c.legal_entity_name, sub: 'Талбай өмчлөгч',
          items: lineItems, total: lineItems.reduce((s, li) => s + li.amount, 0),
        });
      });
      setPreviewRows(rows);
    } finally {
      setComputing(false);
    }
  }

  function cancelPreview() {
    setPreviewRows(null);
  }

  // ---------------- үе шат 2: ХАДГАЛАХ (бодитоор бичнэ) ----------------
  async function commitPreview() {
    setSaving(true);
    try {
      let created = 0, skipped = 0;
      for (const row of previewRows) {
        const { data: inv, error } = await supabase.from('invoices')
          .insert({ tenant_id: hoaId, target_type: row.target_type, target_id: row.target_id, period_year: year, period_month: month, total_amount: row.total, status: 'sent', sent_at: new Date().toISOString() })
          .select().single();
        if (error) { skipped++; continue; }
        await supabase.from('invoice_items').insert(row.items.map((li) => ({ ...li, invoice_id: inv.id })));
        created++;
      }
      alert(`${created} нэхэмжлэл үүсгэж илгээлээ${skipped ? `, ${skipped} аль хэдийн байсан тул алгаслаа` : ''}.`);
      setPreviewRows(null);
      loadInvoices();
    } finally {
      setSaving(false);
    }
  }

  async function toggleExpand(id, isPreview) {
    if (expanded === id) { setExpanded(null); return; }
    if (isPreview) {
      setItems(sortItems(previewRows.find((r) => `${r.target_type}-${r.target_id}` === id)?.items || []));
    } else {
      const { data } = await supabase.from('invoice_items').select('*').eq('invoice_id', id);
      setItems(sortItems(data || []));
    }
    setExpanded(id);
  }

  // ---------------- харуулах жагсаалт (тооцоолсон эсвэл хадгалсан) ----------------
  const displayRows = previewRows
    ? previewRows.map((r) => ({ id: `${r.target_type}-${r.target_id}`, name: r.name, sub: r.sub, type: r.target_type, total: r.total, status: null }))
    : invoices.map((inv) => ({ id: inv.id, name: names[`${inv.target_type}-${inv.target_id}`]?.name || '...', sub: names[`${inv.target_type}-${inv.target_id}`]?.sub || '', type: inv.target_type, total: inv.total_amount, status: inv.status }));

  const filteredRows = search.trim()
    ? displayRows.filter((r) => r.name.toLowerCase().includes(search.trim().toLowerCase()))
    : displayRows;

  const totalSum = displayRows.reduce((s, r) => s + Number(r.total), 0);
  const ownerCount = displayRows.filter((r) => r.type === 'owner').length;
  const clientCount = displayRows.filter((r) => r.type === 'client').length;
  const growthPct = prevTotal ? ((totalSum - prevTotal) / prevTotal) * 100 : null;

  const breakdown = useMemo(() => {
    const totals = {};
    if (previewRows) {
      previewRows.forEach((r) => r.items.forEach((li) => { totals[li.description] = (totals[li.description] || 0) + Number(li.amount); }));
    }
    return sortBreakdown(totals);
  }, [previewRows]);
  const [committedBreakdown, setCommittedBreakdown] = useState([]);
  useEffect(() => {
    if (previewRows || invoices.length === 0) { if (!previewRows) setCommittedBreakdown([]); return; }
    (async () => {
      const { data } = await fetchAllRows(() =>
        supabase.from('invoice_items').select('description, amount').in('invoice_id', invoices.map((i) => i.id))
      );
      const totals = {};
      (data || []).forEach((li) => { totals[li.description] = (totals[li.description] || 0) + Number(li.amount); });
      setCommittedBreakdown(sortBreakdown(totals));
    })();
  }, [invoices, previewRows]);
  const activeBreakdown = previewRows ? breakdown : committedBreakdown;

  return (
    <>
      <div className="ds-toolbar">
        <div>
          <input type="number" className="ds-input" style={{ width: 100 }} value={year} onChange={(e) => setYear(+e.target.value || now.getFullYear())} disabled={!!previewRows} />
        </div>
        <div>
          <select className="ds-input" value={month} onChange={(e) => setMonth(+e.target.value)} disabled={!!previewRows}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <input className="ds-input flex-1" style={{ minWidth: 180 }} placeholder="Сууц/Талбай өмчлөгчийн нэрээр хайх..." value={search} onChange={(e) => setSearch(e.target.value)} />
        {!previewRows ? (
          <button className="ds-btn-primary" onClick={computePreview} disabled={computing}>
            {computing ? 'Тооцоолж байна...' : 'Нэхэмжлэх үүсгэх'}
          </button>
        ) : (
          <>
            <button className="ds-btn-secondary" onClick={cancelPreview} disabled={saving}>Цуцлах</button>
            <button className="ds-btn-primary" onClick={commitPreview} disabled={saving}>
              {saving ? 'Илгээж байна...' : 'Үүсгэсэн нэхэмжлэхийг илгээх'}
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-4 gap-[10px]">
        <div className="ds-card p-3">
          <div className="text-[11px] text-mutedtext mb-1.5">Нэхэмжлэхийн тоо</div>
          <div className="text-[19px] font-bold">{displayRows.length}</div>
        </div>
        <div className="ds-card p-3">
          <div className="text-[11px] text-mutedtext mb-1.5">Нэхэмжилсэн дүн</div>
          <div className="text-[19px] font-bold">
            {formatMoney(totalSum)}₮{' '}
            {growthPct !== null && (
              <span className={`text-[11px] font-normal ${growthPct >= 0 ? 'text-customGreen' : 'text-customRed'}`}>
                {growthPct >= 0 ? '▲' : '▼'} {Math.abs(growthPct).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <div className="ds-card p-3">
          <div className="text-[11px] text-mutedtext mb-1.5">Сууц өмчлөгч</div>
          <div className="text-[19px] font-bold">{ownerCount}</div>
        </div>
        <div className="ds-card p-3">
          <div className="text-[11px] text-mutedtext mb-1.5">Талбай өмчлөгч (ААН)</div>
          <div className="text-[19px] font-bold">{clientCount}</div>
        </div>
      </div>

      {activeBreakdown.length > 0 && (
        <div className="ds-card flex flex-wrap divide-x divide-slate-200 dark:divide-bordercol">
          {activeBreakdown.map((b, i) => (
            <div key={b.name} className="flex-1" style={{ minWidth: 150, padding: '12px 16px' }}>
              <div className="flex items-center gap-1.5 text-[11.5px] text-mutedtext">
                <span style={{ width: 7, height: 7, borderRadius: '50%', display: 'inline-block', background: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length] }} />
                {b.name}
              </div>
              <div className="text-[14.5px] font-bold mt-1">{formatMoney(b.amount)}₮</div>
            </div>
          ))}
        </div>
      )}

      <div className="ds-card p-4">
        <table className="ds-table w-full">
          <thead>
            <tr>
              <th className="py-2 px-2"></th>
              <th className="py-2 px-2">ХЭН</th>
              <th className="py-2 px-2">ТӨРӨЛ</th>
              <th className="py-2 px-2">Дүн</th>
              {!previewRows && <th className="py-2 px-2">СТАТУС</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
            {loading ? (
              <tr><td colSpan={5} className="py-8 text-center text-mutedtext">Ачаалж байна...</td></tr>
            ) : filteredRows.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-mutedtext">{previewRows ? 'Тооцоолсон нэхэмжлэл олдсонгүй' : 'Энэ сард нэхэмжлэл үүсгэгдээгүй байна'}</td></tr>
            ) : filteredRows.map((r) => (
              <>
                <tr key={r.id} className="cursor-pointer" onClick={() => toggleExpand(r.id, !!previewRows)}>
                  <td className="py-2 px-2 text-mutedtext">{expanded === r.id ? '▼' : '▶'}</td>
                  <td className="py-2 px-2 text-slate-900 dark:text-white">{r.name}<div className="text-[10.5px] text-mutedtext">{r.sub}</div></td>
                  <td className="py-2 px-2 text-mutedtext">{r.type === 'owner' ? 'Сууц өмчлөгч' : 'Талбай өмчлөгч'}</td>
                  <td className="py-2 px-2 font-medium">{formatMoney(r.total)}₮</td>
                  {!previewRows && (
                    <td className="py-2 px-2">
                      <span className={`text-[11px] font-medium ${r.status === 'paid' ? 'text-customGreen' : r.status === 'overdue' || r.status === 'at_risk' ? 'text-customRed' : 'text-mutedtext'}`}>
                        {r.status === 'draft' ? 'Ноорог' : r.status === 'sent' ? 'Илгээсэн' : r.status === 'paid' ? 'Төлсөн' : r.status === 'overdue' ? 'Хугацаа хэтэрсэн' : 'Эрсдэлтэй'}
                      </span>
                    </td>
                  )}
                </tr>
                {expanded === r.id && (
                  <tr key={`${r.id}-detail`}>
                    <td colSpan={previewRows ? 4 : 5} className="py-2 px-4" style={{ background: 'rgba(0,0,0,0.15)' }}>
                      <table className="w-full text-[11.5px]">
                        <tbody>
                          {items.map((li, idx) => (
                            <tr key={li.id || idx}>
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
