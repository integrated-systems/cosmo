import { useEffect, useState } from 'react';
import Modal from './Modal';
import { supabase } from '../lib/supabaseClient';
import { fetchAllRows } from '../lib/fetchAllRows';
import { formatMoney } from '../lib/format';
import { computeOwnerTargetId, computeClientTargetId } from '../lib/stableTargetId';

// 2026-09-20 (61, 2-р үе шат): "Төлбөр бүртгэх" товч ОДОО ХҮРТЭЛ
// ямар ч onClick-гүй placeholder байсныг бодитоор ажиллуулав.
// OwnerInfoModal.jsx, ClientInfoModal.jsx, OwnerSpotOnlyInfoModal.jsx
// 3 газарт ашиглана (Rule of two/гурав). Сонгосон нэхэмжлэх(үүд)-ийг
// "paid" болгож, НЭГ журналын бичилт (Дт 1020 Харилцах / Кт [харьяа
// авлагын данс]) автоматаар үүсгэнэ.
export default function RecordPaymentModal({ open, onClose, hoaId, targetType, record, unitLayouts, onSaved }) {
  const [invoices, setInvoices] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const targetId = record ? (targetType === 'owner' ? computeOwnerTargetId(record, unitLayouts) : computeClientTargetId(record)) : null;

  useEffect(() => {
    if (!open || !hoaId || !targetId) return;
    setLoading(true);
    setError('');
    fetchAllRows(() => supabase.from('invoices').select('*').eq('tenant_id', hoaId).eq('target_type', targetType).eq('target_id', targetId).in('status', ['sent', 'overdue']).order('period_year').order('period_month'))
      .then(({ data }) => {
        setInvoices(data || []);
        setSelectedIds(new Set((data || []).map((i) => i.id)));
        setLoading(false);
      });
  }, [open, hoaId, targetId, targetType]);

  function toggle(id) {
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const selectedInvoices = invoices.filter((i) => selectedIds.has(i.id));
  const totalAmount = selectedInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const canSave = selectedInvoices.length > 0 && !saving;

  // 2026-09-20: харьяа авлагын дансыг target_type-ээр тодорхойлно —
  // owner (сууц өмчлөгч БОЛОН зогсоол/агуулах дангаар өмчлөгч хоёул)
  // 1110 "Сууц өмчлөгчдийн авлага", client (талбай өмчлөгч) 1120
  // "Аж ахуйн нэгжийн авлага".
  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      const ids = selectedInvoices.map((i) => i.id);
      const { error: updateErr } = await supabase.from('invoices').update({ status: 'paid' }).in('id', ids);
      if (updateErr) { setError(updateErr.message); return; }

      const receivableAccount = targetType === 'client' ? '1120' : '1110';
      const periods = [...new Set(selectedInvoices.map((i) => `${i.period_year}.${i.period_month}`))].join(', ');
      const { data: entry, error: entryErr } = await supabase.from('journal_entries').insert({
        tenant_id: hoaId, entry_date: new Date().toISOString().slice(0, 10),
        description: `Төлбөр хүлээн авав (${periods})`, source_type: 'invoice_payment', source_ref: ids.join(','),
      }).select().single();
      if (entryErr) { setError(entryErr.message); return; }
      const { error: linesErr } = await supabase.from('journal_entry_lines').insert([
        { entry_id: entry.id, account_code: '1020', debit: totalAmount, credit: 0 },
        { entry_id: entry.id, account_code: receivableAccount, debit: 0, credit: totalAmount },
      ]);
      if (linesErr) { setError(linesErr.message); return; }
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Төлбөр бүртгэх" footer={
      <>
        <button className="ds-btn-secondary" onClick={onClose}>Хаах</button>
        <button className="ds-btn-primary" onClick={handleSave} disabled={!canSave}>
          {saving ? 'Хадгалж байна...' : `Хүлээн авсан гэж тэмдэглэх (${formatMoney(totalAmount)}₮)`}
        </button>
      </>
    }>
      {loading ? (
        <div className="text-center text-mutedtext text-sm py-4">Ачаалж байна...</div>
      ) : invoices.length === 0 ? (
        <div className="text-center text-mutedtext text-sm py-4">Төлөгдөөгүй нэхэмжлэх алга</div>
      ) : (
        <div className="flex flex-col gap-2">
          {invoices.map((inv) => (
            <label key={inv.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={selectedIds.has(inv.id)} onChange={() => toggle(inv.id)} />
              <span className="flex-1">{inv.period_year} оны {inv.period_month}-р сар{inv.status === 'overdue' ? ' (хугацаа хэтэрсэн)' : ''}</span>
              <span className="font-medium">{formatMoney(inv.total_amount)}₮</span>
            </label>
          ))}
        </div>
      )}
      {error && <div className="text-[12px] text-customRed mt-2">{error}</div>}
    </Modal>
  );
}
