import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { fetchAllRows } from '../lib/fetchAllRows';
import { formatMoney } from '../lib/format';
import { useGridSpots, sumLinkedSqm } from '../hooks/useGridSpots';
import { formatUnitCode } from '../lib/ownersFormat';
import { extractGridItemUuid } from '../lib/spotVehicleFormat';
import { useAlert } from '../hooks/useAlert';

// "Нэхэмжлэх" (/invoice, САНХүү бүлэг) — 2026-09-07 (17): Хэрэглэгчийн
// зурган хүсэлтээр 2 үе шаттай урсгал болгож бүрэн дахин зохион
// байгуулав: (1) "Нэхэмжлэх үүсгэх" - зөвхөн ТООЦООЛОХ (юу ч
// бичихгүй), (2) "үүсгэсэн нэхэмжлэхийг хадгалах" - тэр тооцооллыг
// шалгасны дараа л бодитоор бичнэ. ҮҮгээр Хүннү супермаркетийн
// жишээ шиг тооцооллын алдааг ХАДГАЛАХААС ӨМНӨ олж засах боломжтой.
const FIXED_NAMES = ['СӨХ-ны төлбөр', 'Зогсоол', 'Агуулах'];
const BREAKDOWN_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef5555', '#0a428f', '#ec4899', '#14b8a6'];
// 2026-09-13: module-level тогтмол болгосон — computePreview() (эрт),
// info карт тооцоолол (хожим), 2 хэсэгт хоёуланд нь ашиглагдана.
const SPOT_ONLY_SUB_LABEL = 'Зогсоол, агуулах дангаар өмчлөгч';

function calcOwnerItems(owner, tariffItems, gridStorageSpots) {
  const items = [];
  const warnings = [];
  tariffItems.filter((t) => t.active).forEach((t) => {
    if (t.name === 'Зогсоол') {
      const qty = (owner.grid_parkings || []).length;
      if (qty > 0) items.push({ tariff_item_id: t.id, description: t.name, quantity: qty, unit_price: t.amount, amount: qty * t.amount });
    } else if (t.name === 'Агуулах') {
      // 2026-09-13 БОДИТ АЛДАА ЗАСАВ (2-р шинэчлэл) — хэрэглэгчийн
      // тодруулсны дагуу: calc_method='area' үед м2 олдохгүй бол,
      // ТООГООР "нөөцлөн" тооцож ТӨЛБӨР үүсгэх нь БУРУУ дүнгээр
      // нэхэмжлэх эрсдэлтэй. Иймд одоо төлбөр ОГТ тооцохгүй, харин
      // "warnings"-д тэмдэглэж, admin-д тодорхой ("N эмчлэгчид
      // тариф тооцох боломжгүй") анхааруулга харуулна — гэхдээ энэ
      // эмчлэгч НЭХЭМЖЛЭХЭЭС БҮРЭН АЛГА (info карт, тоолуур) БОЛОХГҮЙ.
      const qty = (owner.grid_storages || []).length;
      if (qty > 0) {
        if (t.calc_method === 'area') {
          const sqm = sumLinkedSqm(owner.grid_storages, gridStorageSpots);
          if (sqm != null && sqm > 0) {
            items.push({ tariff_item_id: t.id, description: t.name, quantity: sqm, unit_price: t.amount, amount: sqm * t.amount });
          } else {
            warnings.push(`${t.name}: ${qty} агуулахын м² бүртгэгдээгүй тул тариф тооцоологдсонгүй`);
          }
        } else {
          items.push({ tariff_item_id: t.id, description: t.name, quantity: qty, unit_price: t.amount, amount: qty * t.amount });
        }
      }
    } else if (t.name === 'СӨХ-ны төлбөр' && t.calc_method === 'area') {
      const sqm = owner.sqm || 0;
      if (sqm > 0) items.push({ tariff_item_id: t.id, description: t.name, quantity: sqm, unit_price: t.amount, amount: sqm * t.amount });
    } else {
      items.push({ tariff_item_id: t.id, description: t.name, quantity: 1, unit_price: t.amount, amount: t.amount });
    }
  });
  return { items, warnings };
}

function calcClientItems(client, tariffItems, gridStorageSpots) {
  const items = [];
  const warnings = [];
  tariffItems.filter((t) => t.active).forEach((t) => {
    if (t.name === 'Зогсоол') {
      const qty = (client.grid_parkings || []).length;
      if (qty > 0) items.push({ tariff_item_id: t.id, description: t.name, quantity: qty, unit_price: t.amount, amount: qty * t.amount });
    } else if (t.name === 'Агуулах') {
      // 2026-09-13 БОДИТ АЛДАА ЗАСАВ (2-р шинэчлэл) — calcOwnerItems-
      // тэй ЯГ ИЖИЛ засвар.
      const qty = (client.grid_storages || []).length;
      if (qty > 0) {
        if (t.calc_method === 'area') {
          const sqm = sumLinkedSqm(client.grid_storages, gridStorageSpots);
          if (sqm != null && sqm > 0) {
            items.push({ tariff_item_id: t.id, description: t.name, quantity: sqm, unit_price: t.amount, amount: sqm * t.amount });
          } else {
            warnings.push(`${t.name}: ${qty} агуулахын м² бүртгэгдээгүй тул тариф тооцоологдсонгүй`);
          }
        } else {
          items.push({ tariff_item_id: t.id, description: t.name, quantity: qty, unit_price: t.amount, amount: qty * t.amount });
        }
      }
    } else if (t.name === 'СӨХ-ны төлбөр' && t.calc_method === 'area') {
      const sqm = client.sqm || 0;
      if (sqm > 0) items.push({ tariff_item_id: t.id, description: t.name, quantity: sqm, unit_price: t.amount, amount: sqm * t.amount });
    } else {
      items.push({ tariff_item_id: t.id, description: t.name, quantity: 1, unit_price: t.amount, amount: t.amount });
    }
  });
  return { items, warnings };
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

// Нэг нэхэмжлэлийн задаргааны мөрүүдийг харуулах үед мөн 3 ФИКС нэрийг
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


// 2026-09-07 (19->20): Хэрэглэгчийн заасны дагуу - "давхар+тоот" формат
// нь Хаягжилт тохиргоо (Constructor)-ийн АНХДАГЧ ЭХ СУРВАЛЖ форматтай
// ЯГ ТОХИРОХ ёстой тул, өөрөө дахин зохион БИЧИХГүй, src/lib/
// ownersFormat.js-ийн formatUnitCode()-ыг шууд дуудна (EditOwnerModal-
// ийн dropdown, useUnitLayouts.js-тэй Rule of two).

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
  const [incompleteRows, setIncompleteRows] = useState([]); // 2026-09-13: м2/дата дутуу тул тариф тооцоологдоогүй эмчлэгчид
  const [loading, setLoading] = useState(true);
  const [names, setNames] = useState({});
  const [structureTypeByBuilding, setStructureTypeByBuilding] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [items, setItems] = useState([]);
  const [prevTotal, setPrevTotal] = useState(null);

  async function loadInvoices() {
    setLoading(true);
    setPreviewRows(null); // сар/жил солиход тооцоолол дахин эхэлнэ
    setIncompleteRows([]);
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

  useEffect(() => {
    if (!hoaId) return;
    (async () => {
      const { data } = await fetchAllRows(() =>
        supabase.from('unit_layouts').select('building_no, structure_type').eq('tenant_id', hoaId).eq('hidden', false)
      );
      const map = {};
      (data || []).forEach((r) => { const key = String(r.building_no || '').trim(); if (!(key in map)) map[key] = r.structure_type; });
      setStructureTypeByBuilding(map);
    })();
  }, [hoaId]);

  const committedIds = useMemo(() => ({
    ownerIds: invoices.filter((i) => i.target_type === 'owner').map((i) => i.target_id),
    clientIds: invoices.filter((i) => i.target_type === 'client').map((i) => i.target_id),
  }), [invoices]);

  useEffect(() => {
    if (invoices.length === 0) return;
    (async () => {
      const map = {};
      // 2026-09-13: target_id одоо eмчлэгчийн ID биш, ТОГТВОРТОЙ нэгжийн
      // (unit_layouts / grid_land_plot) ID тул, тухайн нэгжийг ОДОО
      // эзэмшиж буй eмчлэгчийг эргүүлж хайх шаардлагатай болов.
      if (committedIds.ownerIds.length) {
        const { data: units } = await supabase.from('unit_layouts').select('id, building_no, floor, door_no').in('id', committedIds.ownerIds);
        const { data: ownersData } = await fetchAllRows(() => supabase.from('owners').select('firstname, lastname, building_no, floor, door_no, has_grid_parking, grid_parkings, has_grid_storage, grid_storages').eq('tenant_id', hoaId));
        (units || []).forEach((u) => {
          const owner = (ownersData || []).find((o) => o.building_no === u.building_no && o.floor === u.floor && o.door_no === u.door_no);
          map[`owner-${u.id}`] = {
            name: owner ? `${owner.firstname || ''} ${owner.lastname || ''}`.trim() : 'Эзэнгүй',
            sub: formatUnitCode(u.building_no, structureTypeByBuilding[String(u.building_no || '').trim()], u.floor, null, u.door_no),
          };
        });
        // 2026-09-13: unit_layouts-с олдоогүй target_id-г ("Дан
        // зогсоол, агуулах өмчлөгч"-ийн grid_parkings/grid_storages)
        // эргүүлж хайна.
        committedIds.ownerIds.forEach((tid) => {
          if (map[`owner-${tid}`]) return;
          const owner = (ownersData || []).find((o) =>
            (Array.isArray(o.grid_parkings) && o.grid_parkings.some((p) => extractGridItemUuid(p?.id) === tid)) ||
            (Array.isArray(o.grid_storages) && o.grid_storages.some((p) => extractGridItemUuid(p?.id) === tid))
          );
          map[`owner-${tid}`] = owner
            ? { name: `${owner.firstname || ''} ${owner.lastname || ''}`.trim(), sub: 'Зогсоол, агуулах дангаар өмчлөгч' }
            : { name: 'Эзэнгүй', sub: '—' };
        });
      }
      if (committedIds.clientIds.length) {
        // Эхлээд шууд clientele.id таарч байгааг шалгана (grid
        // талбайгүй, хуучин fallback тохиолдол).
        const { data: directClients } = await supabase.from('clientele').select('id, legal_entity_name').in('id', committedIds.clientIds);
        (directClients || []).forEach((c) => { map[`client-${c.id}`] = { name: c.legal_entity_name, sub: 'Талбай өмчлөгч' }; });
        // Дараа нь тухайн ID grid_land_plots/grid_parkings/
        // grid_storages дотор агуулагдаж буй ОДООГИЙН client-ийг
        // хайна. 2026-09-13 БОДИТ АЛДАА ЗАСАВ — эхлээд зөвхөн
        // grid_land_plots-ыг л шалгаж байсан тул, зөвхөн зогсоол/
        // агуулах эзэмшдэг ААН-ий нэр олдохгүй байсныг олж, 3
        // талбарыг бүгдийг шалгадаг болгов.
        const { data: allClients } = await fetchAllRows(() => supabase.from('clientele').select('id, legal_entity_name, grid_land_plots, grid_parkings, grid_storages').eq('tenant_id', hoaId));
        committedIds.clientIds.forEach((tid) => {
          if (map[`client-${tid}`]) return;
          const client = (allClients || []).find((c) =>
            (Array.isArray(c.grid_land_plots) && c.grid_land_plots.some((p) => extractGridItemUuid(p?.id) === tid)) ||
            (Array.isArray(c.grid_parkings) && c.grid_parkings.some((p) => extractGridItemUuid(p?.id) === tid)) ||
            (Array.isArray(c.grid_storages) && c.grid_storages.some((p) => extractGridItemUuid(p?.id) === tid))
          );
          map[`client-${tid}`] = client ? { name: client.legal_entity_name, sub: 'Талбай өмчлөгч' } : { name: 'Эзэнгүй', sub: 'Талбай өмчлөгч' };
        });
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
      // 2026-09-13 БОДИТ АЛДАА ЗАСАВ — "Зогсоол, агуулах дангаар
      // өмчлөгч" (сууцгүй) хүртэл одоог хүртэл Сууц өмчлөгчтэй ЯГ
      // АДИЛ тариф (ownerTariffs) ашиглаж байсан тул (жиш "СөХ-ны
      // төлбөр" зэрэг сууцтай хүнд л хамаарах мөр буруу тооцогдож
      // болзошгүй), тусдаа "spot_only" категорийн тарифыг нэмэв.
      const spotOnlyTariffs = (tariffItems || []).filter((t) => t.category === 'spot_only');
      const { data: owners } = await fetchAllRows(() => supabase.from('owners').select('*').eq('tenant_id', hoaId));
      const { data: clientele } = await fetchAllRows(() => supabase.from('clientele').select('*').eq('tenant_id', hoaId));
      // 2026-09-13 БОДИТ АРХИТЕКТУРЫН ЗАСВАР — хэрэглэгчийн ажигласны
      // дагуу: өмчлөгч (owners/clientele) бол СОЛИГДДОГ (байраа зарвал
      // өөр хүн орж ирдэг) дата, харин тоот/зогсоол/агуулах/талбай бол
      // СӨХ-д ТОГТМОЛ, огт хөдлөдөггүй дата. Тиймээс нэхэмжлэхийг
      // (target_id) өмчлөгчийн ID рүү биш, ТОГТВОРТОЙ нэгжийн ID рүү
      // холбож, өмчлөгч солигдоход төлбөрийн түүх бүтэн хэвээр үлдэхийг
      // баталгаажуулав.
      const { data: unitLayoutsFull } = await fetchAllRows(() => supabase.from('unit_layouts').select('id, building_no, floor, door_no').eq('tenant_id', hoaId));

      const rows = [];
      const incompleteRows = [];
      (owners || []).forEach((o) => {
        // 2026-09-13 БОДИТ АЛДАА ЗАСАВ — сууцтай (building_no бий)
        // болон Дан зогсоол/агуулах (сууцгүй) эмчлэгчийг ТУСДАА
        // тарифаар тооцоолно. eмнe нь бүгд ownerTariffs ашигладаг
        // байсан тул, "СөХ-ны төлбөр" зэрэг сууцад л хамаарах мөр
        // сууцгүй хүнд буруу тооцогдож болзошгүй байв.
        const applicableTariffs = o.building_no ? ownerTariffs : spotOnlyTariffs;
        const { items: lineItems, warnings } = calcOwnerItems(o, applicableTariffs, gridStorageSpots);
        const ownerName = `${o.firstname || ''} ${o.lastname || ''}`.trim();
        const ownerSub = o.building_no ? formatUnitCode(o.building_no, structureTypeByBuilding[String(o.building_no || '').trim()], o.floor, null, o.door_no) : SPOT_ONLY_SUB_LABEL;
        if (warnings.length > 0) incompleteRows.push({ name: ownerName, sub: ownerSub, warnings });
        if (lineItems.length === 0) return;
        // Сууц eмчлэгчийн хувьд ТОГТВОРТОЙ нэгж бол unit_layouts мөр
        // (байр+давхар+тоотоор тохирно). 2026-09-13: "Дан зогсоол,
        // агуулах eмчлэгч" (сууцгүй) үед unit_layouts тохирохгүй тул,
        // тэдний grid_parkings/grid_storages-ийн 1-р задалсан UUID-г
        // ТОГТВОРТОЙ нэгж болгож ашиглана. Юу ч олдохгүй бол (ховор
        // тохиолдол) хамгийн сүүлд owner.id рүү буцаж холбоно (төлөв
        // алдагдахаас дээр).
        const matchedUnit = (unitLayoutsFull || []).find((u) => u.building_no === o.building_no && u.floor === o.floor && u.door_no === o.door_no);
        const ownerParkingUuid = !matchedUnit && o.has_grid_parking && Array.isArray(o.grid_parkings) && o.grid_parkings.length > 0 ? extractGridItemUuid(o.grid_parkings[0]?.id) : null;
        const ownerStorageUuid = !matchedUnit && !ownerParkingUuid && o.has_grid_storage && Array.isArray(o.grid_storages) && o.grid_storages.length > 0 ? extractGridItemUuid(o.grid_storages[0]?.id) : null;
        rows.push({
          target_type: 'owner', target_id: matchedUnit?.id || ownerParkingUuid || ownerStorageUuid || o.id,
          name: ownerName, sub: ownerSub,
          items: lineItems, total: lineItems.reduce((s, li) => s + li.amount, 0),
        });
      });
      (clientele || []).forEach((c) => {
        const { items: lineItems, warnings } = calcClientItems(c, clientTariffs, gridStorageSpots);
        if (warnings.length > 0) incompleteRows.push({ name: c.legal_entity_name, sub: 'Талбай эмчлэгч', warnings });
        if (lineItems.length === 0) return;
        // Талбай өмчлөгчийн хувьд одоогоор бүрэн тогтвортой бүртгэл
        // (unit_layouts-той адил хүснэгэл) байхгүй тул, холбогдсон
        // grid талбайн (grid_land_plots) 1-р ID-г ТОГТВОРТОЙ нэгж
        // болгож ашиглана. 2026-09-13 БОДИТ АЛДАА ЗАСАВ (сая цогцоор
        // тестэлж байхад олов) — эхлээд зөвхөн grid_land_plots-ыг л
        // шалгаж байсан тул, ЗӨВХӨН зогсоол/агуулах эзэмшдэг
        // (has_grid_land=false) ААН-ий invoice дахин c.id (солигддог)
        // рүү буцаж, Owners.jsx-д олж засах гэж байсан яг тэр цоорхой
        // энд ДАХИН үүсэж байсныг олов. Одоо Owners.jsx-тэй ижил 3
        // үеийн fallback: талбай -> зогсоол -> агуулах -> c.id.
        const gridLandUuid = (c.has_grid_land && Array.isArray(c.grid_land_plots) && c.grid_land_plots.length > 0) ? extractGridItemUuid(c.grid_land_plots[0]?.id) : null;
        const clientParkingUuid = !gridLandUuid && c.has_grid_parking && Array.isArray(c.grid_parkings) && c.grid_parkings.length > 0 ? extractGridItemUuid(c.grid_parkings[0]?.id) : null;
        const clientStorageUuid = !gridLandUuid && !clientParkingUuid && c.has_grid_storage && Array.isArray(c.grid_storages) && c.grid_storages.length > 0 ? extractGridItemUuid(c.grid_storages[0]?.id) : null;
        const stableId = gridLandUuid || clientParkingUuid || clientStorageUuid || c.id;
        rows.push({
          target_type: 'client', target_id: stableId,
          name: c.legal_entity_name, sub: 'Талбай өмчлөгч',
          items: lineItems, total: lineItems.reduce((s, li) => s + li.amount, 0),
        });
      });
      setPreviewRows(rows);
      setIncompleteRows(incompleteRows);
    } finally {
      setComputing(false);
    }
  }

  function cancelPreview() {
    setPreviewRows(null);
    setIncompleteRows([]);
  }

  // ---------------- үе шат 2: ХАДГАЛАХ (бодитоор бичнэ) ----------------
  async function commitPreview() {
    setSaving(true);
    try {
      let created = 0, skipped = 0, failed = 0;
      for (const row of previewRows) {
        const { data: inv, error } = await supabase.from('invoices')
          .insert({ tenant_id: hoaId, target_type: row.target_type, target_id: row.target_id, period_year: year, period_month: month, total_amount: row.total, status: 'sent', sent_at: new Date().toISOString() })
          .select().single();
        if (error) { skipped++; continue; }
        // 2026-09-13 БОДИТ АЛДАА ЗАСАВ — хэрэглэгчийн асуултаас олдсон
        // цоорхой: өмнө нь invoice_items-ийн бичилтийн ХАРИУГ ОГТ
        // шалгадаггүй байсан тул, нэхэмжлэхийн ТОЛГОЙ амжилттай
        // бичигдсэн ч, задаргааны мөрүүд (жишээ нь "СӨХ-ны төлбөр",
        // "Зогсоол") бичигдэлгүй үлдэж болзошгүй байсан бөгөөд, ийм
        // тохиолдолд ч "амжилттай үүсгэлээ" гэж буруу тоологддог байв.
        // Одоо invoice_items-ийн алдааг шалгаж, амжилтгүй бол дутуу
        // (задаргаагүй) нэхэмжлэхийн толгойг устгаж, тодорхой ялгаатай
        // тоолуураар (failed) хэрэглэгчид мэдэгддэг болгов.
        const { error: itemsError } = await supabase.from('invoice_items').insert(row.items.map((li) => ({ ...li, invoice_id: inv.id })));
        if (itemsError) {
          await supabase.from('invoices').delete().eq('id', inv.id);
          failed++;
          continue;
        }
        created++;
      }
      const parts = [`${created} нэхэмжлэл үүсгэж илгээлээ`];
      if (skipped) parts.push(`${skipped} аль хэдийн байсан тул алгаслаа`);
      if (failed) parts.push(`${failed} задаргаа бичих үед алдаа гарсан тул үүсгэсэнгүй`);
      alert(`${parts.join(', ')}.`);
      setPreviewRows(null);
      setIncompleteRows([]);
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
  // 2026-09-13 БОДИТ АЛДАА ЗАСАВ — хэрэглэгчийн олсон цоорхой: ownerCount
  // зөвхөн target_type==='owner'-ыг л шалгадаг байсан тул, "Дан
  // зогсоол/агуулах эмчлэгч" (сууцгүй) ч мөн "Сууц эмчлэгч" гэж буруу
  // тоологддог байв. sub талбарын ("Зогсоол, агуулах дангаар эмчлэгч"
  // гэсэн тодорхой текст) ялгаагаар 2 тусдаа тоолуур болгов, мөн шинэ
  // "Зогсоол, агуулах дангаар эмчлэгч" info карт нэмэв.
  const unitOwnerCount = displayRows.filter((r) => r.type === 'owner' && r.sub !== SPOT_ONLY_SUB_LABEL).length;
  const spotOnlyCount = displayRows.filter((r) => r.type === 'owner' && r.sub === SPOT_ONLY_SUB_LABEL).length;
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

      <div className="grid grid-cols-6 gap-[10px]">
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
          <div className="text-[19px] font-bold">{unitOwnerCount}</div>
        </div>
        <div className="ds-card p-3">
          <div className="text-[11px] text-mutedtext mb-1.5">Зогсоол, агуулах дангаар өмчлөгч</div>
          <div className="text-[19px] font-bold">{spotOnlyCount}</div>
        </div>
        <div className="ds-card p-3">
          <div className="text-[11px] text-mutedtext mb-1.5">Талбай өмчлөгч (ААН)</div>
          <div className="text-[19px] font-bold">{clientCount}</div>
        </div>
        {/* 2026-09-13: Хэрэглэгчийн заасны дагуу — м2/дата дутуу тул
            тариф ТООЦООГүйгээр үлдсэн эмчлэгчийг (буруу таамагласан
            дүнгээр нэхэмжлэхээс зайлсхийхийн тулд) "Дутуу мэдээлэлтэй"
            гэсэн тусад нь тоолуур, доор жагсаалттайгаар тодорхой
            харуулна — үүгээр ямар ч анхааруулгагүй "невроор алга"
            болохгүй. */}
        <div className="ds-card p-3">
          <div className="text-[11px] text-mutedtext mb-1.5">Дутуу мэдээлэлтэй</div>
          <div className={`text-[19px] font-bold ${incompleteRows.length > 0 ? 'text-customRed' : ''}`}>{incompleteRows.length}</div>
        </div>
      </div>

      {incompleteRows.length > 0 && (
        <div className="ds-card p-3 mt-2.5" style={{ borderColor: '#f59e0b' }}>
          <div className="text-[13px] font-semibold mb-1.5" style={{ color: '#f59e0b' }}>
            ⚠️ {incompleteRows.length} эмчлэгчид зарим тариф тооцоологдсонгүй (мэдээлэл дутуу)
          </div>
          <ul style={{ listStyle: 'disc', paddingLeft: 18, margin: 0 }}>
            {incompleteRows.map((r, i) => (
              <li key={i} className="text-[12px] text-mutedtext">
                <b>{r.name}</b> ({r.sub}) — {r.warnings.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

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
