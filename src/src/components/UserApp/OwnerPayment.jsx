import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/AuthContext';
import { extractGridItemUuid } from '../../lib/spotVehicleFormat';

// 2026-09-13: OwnerPaymentPlaceholder.jsx-ийг сольсон БОДИТ хувилбар —
// хэрэглэгчийн хүсэлтээр "Төлбөр" хуудсыг бодит invoices/invoice_items
// хүснэгэлтэй холбож динамик болгов (жишээ дата бүрмөсөн арилав).
//
// Логик (Invoice.jsx-ийн admin талтай ИЖИЛ 3 үеийн fallback):
// 1. Нэвтэрсэн хэрэглэгчийн (user.id) owners мөрийг олно
// 2. Сууцтай бол unit_layouts.id, сууцгүй бол grid_parkings/
//    grid_storages-ийн 1-р задалсан UUID-г ТОГТВОРТОЙ target_id
//    болгож ашиглана (Invoice.jsx-тэй яг ижил зарчим — өөр аргаар
//    тооцвол энэ owner-ийн бодит invoices олдохгүй байх эрсдэлтэй)
// 3. Тэр target_id-аар бүх invoices (+ invoice_items) уншиж:
//    - Одоогийн сараас өмнөх, "paid" биш invoice бүр = "Өмнөх
//      төлөгдөөгүй сарууд" (лацм дүнгээр, мөр тус бүрээр)
//    - Одоогийн сарын invoice (байвал) = "Энэ сарын төлбөр"
//      (invoice_items-ийн задаргаагаар)
//    - "paid" invoice бүр = "Төлбөр төлөлтийн түүх"
const MONTH_NAMES = ['1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар', '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'];

function fmt(n) {
  return Number(n || 0).toLocaleString('mn-MN') + '₮';
}

export default function OwnerPayment({ hoaId }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [noOwnerRecord, setNoOwnerRecord] = useState(false);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    if (!hoaId || !user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: ownerRow } = await supabase.from('owners').select('*').eq('user_id', user.id).eq('tenant_id', hoaId).maybeSingle();
      if (cancelled) return;
      if (!ownerRow) { setNoOwnerRecord(true); setLoading(false); return; }

      let targetId = ownerRow.id;
      if (ownerRow.building_no) {
        const { data: unit } = await supabase.from('unit_layouts').select('id')
          .eq('tenant_id', hoaId).eq('building_no', ownerRow.building_no).eq('floor', ownerRow.floor).eq('door_no', ownerRow.door_no).maybeSingle();
        if (unit) targetId = unit.id;
      } else {
        const parkingUuid = ownerRow.has_grid_parking && Array.isArray(ownerRow.grid_parkings) && ownerRow.grid_parkings.length > 0 ? extractGridItemUuid(ownerRow.grid_parkings[0]?.id) : null;
        const storageUuid = !parkingUuid && ownerRow.has_grid_storage && Array.isArray(ownerRow.grid_storages) && ownerRow.grid_storages.length > 0 ? extractGridItemUuid(ownerRow.grid_storages[0]?.id) : null;
        targetId = parkingUuid || storageUuid || ownerRow.id;
      }

      const { data: invs } = await supabase.from('invoices').select('*, invoice_items(*)')
        .eq('tenant_id', hoaId).eq('target_type', 'owner').eq('target_id', targetId)
        .order('period_year').order('period_month');
      if (cancelled) return;
      setInvoices(invs || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [hoaId, user?.id]);

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const curKey = curYear * 12 + curMonth;

  const previousUnpaidInvoices = invoices.filter((i) => (i.period_year * 12 + i.period_month) < curKey && i.status !== 'paid');
  const currentInvoice = invoices.find((i) => i.period_year === curYear && i.period_month === curMonth);
  const paidInvoices = invoices.filter((i) => i.status === 'paid').sort((a, b) => (b.period_year * 12 + b.period_month) - (a.period_year * 12 + a.period_month));

  const previousTotal = previousUnpaidInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const currentTotal = Number(currentInvoice?.total_amount || 0);
  const total = previousTotal + currentTotal;

  return (
    <div>
      <div className="content-page-header" style={{ padding: '4px 0 12px' }}>
        <div className="content-page-title">Төлбөр</div>
      </div>

      {loading ? (
        <div className="pool-empty">Ачаалж байна...</div>
      ) : noOwnerRecord ? (
        <div className="pool-empty">Танд холбогдсон бүртгэл олдсонгүй.</div>
      ) : (
        <>
          <div className="mobile-list-item">
            {previousUnpaidInvoices.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#f87171', marginBottom: 6 }}>Өмнөх төлөгдөөгүй сарууд</div>
                {previousUnpaidInvoices.map((inv, i) => (
                  <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{MONTH_NAMES[inv.period_month - 1]}ын төлбөр</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{fmt(inv.total_amount)}</span>
                  </div>
                ))}
              </>
            )}

            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginTop: previousUnpaidInvoices.length > 0 ? 14 : 0, marginBottom: 6 }}>Энэ сарын төлбөр</div>
            {!currentInvoice ? (
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', padding: '6px 0' }}>Энэ сарын нэхэмжлэх хараахан гараагүй байна.</div>
            ) : (
              (currentInvoice.invoice_items || []).map((li, i) => (
                <div key={li.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{li.description}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{fmt(li.amount)}</span>
                </div>
              ))
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 2px', borderTop: '1px solid rgba(255,255,255,0.12)', marginTop: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Нийт төлөх дүн</span>
              <span style={{ fontSize: 16, fontWeight: 800 }}>{fmt(total)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
            <button
              onClick={() => alert('QPay холболт удахгүй нэмэгдэнэ.')}
              style={{
                padding: '13px 32px', borderRadius: 14, fontSize: 15, fontWeight: 700,
                color: 'var(--text-primary)', background: '#ffffff24', border: '1px solid #ffffff2e',
                WebkitBackdropFilter: 'blur(14px)', backdropFilter: 'blur(14px)', cursor: 'pointer',
              }}
            >
              QPay-аар төлөх
            </button>
          </div>

          <div className="section-title" style={{ textAlign: 'center', marginTop: 20 }}>Төлбөр төлөлтийн түүх</div>
          {paidInvoices.length === 0 ? (
            <div className="pool-empty">Төлбөрийн түүх алга</div>
          ) : (
            <div className="mobile-list-item">
              {paidInvoices.map((inv, i) => (
                <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{inv.period_year} оны {MONTH_NAMES[inv.period_month - 1]}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{fmt(inv.total_amount)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
