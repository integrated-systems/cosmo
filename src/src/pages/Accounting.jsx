import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { fetchAllRows } from '../lib/fetchAllRows';
import { formatMoney, formatDateTimeMinutes } from '../lib/format';
import TabButton from '../components/TabButton';
import Modal from '../components/Modal';
import { useChartOfAccounts } from '../hooks/useChartOfAccounts';
import { useAuth } from '../lib/AuthContext';

// 2026-09-09: Журналын бүх мөрийг татах логикийг НЭГ л газраас
// (Rule of two) — Тэнцвэржүүлсэн тайлан, Орлого зарлагын тайлан,
// Тэнцэл 3 таб бүгд ЭНЭ hook-ыг ашиглана.
function useAllJournalLines(hoaId) {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!hoaId) return;
    setLoading(true);
    fetchAllRows(() => supabase.from('journal_entry_lines').select('*, journal_entries!inner(tenant_id, entry_date)').eq('journal_entries.tenant_id', hoaId)).then(({ data }) => {
      // 2026-09-23 (74): НББ үлдэгдэл засвар (5-р зүйл) — Харьцуулсан
      // (өмнөх жилийн) багана. entry_date-ийг мөрт шууд гарган тавьж,
      // OfficialFormsTab үүнийг үеийн cutoff шүүлтэд ашиглана.
      setLines((data || []).map((l) => ({ ...l, entry_date: l.journal_entries?.entry_date })));
      setLoading(false);
    });
  }, [hoaId]);
  return { lines, loading };
}

// Хөрөнгө/Зардал ангилал Дт үлдэгдэлтэй, өглөг/Эздийн эрх/Орлого
// ангилал Кт үлдэгдэлтэй байдаг стандарт зарчим.
const DEBIT_NORMAL_CATEGORIES = ['cash', 'short_term_investment', 'receivable', 'inventory', 'prepaid_expense', 'fixed_asset', 'expense'];
const ASSET_CATEGORIES = ['cash', 'short_term_investment', 'receivable', 'inventory', 'prepaid_expense', 'fixed_asset'];

function accountBalance(acc, lines) {
  const accLines = lines.filter((l) => l.account_code === acc.code);
  const totalDebit = accLines.reduce((s, l) => s + Number(l.debit), 0);
  const totalCredit = accLines.reduce((s, l) => s + Number(l.credit), 0);
  const isDebitNormal = DEBIT_NORMAL_CATEGORIES.includes(acc.category);
  const balance = isDebitNormal ? totalDebit - totalCredit : totalCredit - totalDebit;
  return { totalDebit, totalCredit, balance, isDebitNormal };
}

// "Нягтлан бодох бүртгэл" (/accounting) — 2026-09-09, Ажилтны
// бүртгэлийн 4-р (сүүлийн) үе шат. "Дансны төлөвлөгөө" таб (эх
// сурвалж), "Журналын бичилт" таб (Ажилтны бүртгэл-с "Цалин төлөх"
// дарахад автоматаар үүссэн Дт/Кт бичилт).
function ChartOfAccountsTab({ hoaId }) {
  const { accounts, loading, categoryLabels } = useChartOfAccounts(hoaId);
  return (
    <div className="ds-table-wrap">
      <div className="flex-1 overflow-auto overscroll-contain">
        <table className="ds-table">
          <thead>
            <tr>
              <th className="py-2.5 px-3 w-[100px]">КОД</th>
              <th className="py-2.5 px-3">НЭР</th>
              <th className="py-2.5 px-3">АНГИЛАЛ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
            {loading ? (
              <tr><td colSpan={3} className="py-6 text-center text-mutedtext">Ачаалж байна...</td></tr>
            ) : accounts.map((a) => (
              <tr key={a.id}>
                <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{a.code}</td>
                <td className="py-2.5 px-3">{a.name}</td>
                <td className="py-2.5 px-3 text-mutedtext">{categoryLabels[a.category] || a.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 2026-09-25 (84): Хэрэглэгчийн хүсэлтээр — "Орлогын ангилал"/
// "Зарлагын ангилал" (FinConfig.jsx)-ыг БОДИТООР ажиллуулах цорын
// ганц дутуу холбоос. Энэ модаль нь Дт/Кт мэдэхгүй ажилтанд зориулсан
// ХЯЛБАРШУУЛСАН орц (ангилал сонгоход, тухайн ангиллын ХОЛБОГДСОН
// данс руу автоматаар давхар бичилт үүснэ — эсрэг тал нь үргэлж
// Мөнгe (1010 Касс эсвэл 1020 Харилцах, хэрэглэгч сонгоно)).
function QuickTransactionModal({ open, onClose, hoaId, kind, accounts, onSaved }) {
  const { user } = useAuth();
  const table = kind === 'income' ? 'income_subcategories' : 'expense_subcategories';
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [cashAccount, setCashAccount] = useState('1020');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !hoaId) return;
    setCategoryId(''); setAmount(''); setDescription(''); setError('');
    setDate(new Date().toISOString().slice(0, 10));
    supabase.from(table).select('*').eq('tenant_id', hoaId).order('sort_order').then(({ data }) => setCategories(data || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hoaId, kind]);

  const cashAccounts = accounts.filter((a) => a.category === 'cash');
  const selectedCategory = categories.find((c) => c.id === categoryId);

  async function handleSave() {
    setError('');
    if (!categoryId) { setError('Ангилал сонгоно уу'); return; }
    if (!selectedCategory?.account_code) { setError('Энэ ангилал ямар ч данстай холбогдоогүй байна — Санхүү тохиргоо > НББ хуудаснаас эхлээд данс холбоно уу'); return; }
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) { setError('Дүнг зөв оруулна уу'); return; }
    setSaving(true);
    try {
      const label = kind === 'income' ? 'Орлого' : 'Зарлага';
      const { data: entry, error: entryErr } = await supabase.from('journal_entries').insert({
        tenant_id: hoaId, entry_date: date,
        description: `${label}: ${selectedCategory.name}${description.trim() ? ' — ' + description.trim() : ''}`,
        source_type: 'manual', created_by: user?.id,
      }).select().single();
      if (entryErr) throw entryErr;
      const lines = kind === 'income'
        ? [{ entry_id: entry.id, account_code: cashAccount, debit: amountNum, credit: 0 }, { entry_id: entry.id, account_code: selectedCategory.account_code, debit: 0, credit: amountNum }]
        : [{ entry_id: entry.id, account_code: selectedCategory.account_code, debit: amountNum, credit: 0 }, { entry_id: entry.id, account_code: cashAccount, debit: 0, credit: amountNum }];
      const { error: linesErr } = await supabase.from('journal_entry_lines').insert(lines);
      if (linesErr) throw linesErr;
      onSaved();
    } catch (e) {
      setError(e.message || 'Алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={kind === 'income' ? 'Орлого бүртгэх' : 'Зарлага бүртгэх'} size="sm"
      footer={<>
        <button className="ds-btn-secondary" onClick={onClose} disabled={saving}>Цуцлах</button>
        <button className="ds-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Хадгалж байна...' : 'Хадгалах'}</button>
      </>}
    >
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] text-mutedtext mb-1">Ангилал</label>
          <select className="ds-input w-full" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— Сонгох —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {selectedCategory && (
            <div className="text-[10.5px] text-mutedtext mt-1">
              Холбогдсон данс: {selectedCategory.account_code ? (accounts.find((a) => a.code === selectedCategory.account_code)?.name || selectedCategory.account_code) : '— Холбоогүй (Санхүү тохиргоо > НББ-с холбоно уу) —'}
            </div>
          )}
        </div>
        <div>
          <label className="block text-[11px] text-mutedtext mb-1">Дүн (₮)</label>
          <input type="number" min={0} className="ds-input w-full" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-mutedtext mb-1">Огноо</label>
          <input type="date" className="ds-input w-full" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-mutedtext mb-1">{kind === 'income' ? 'Хүлээн авсан данс' : 'Төлсөн данс'}</label>
          <select className="ds-input w-full" value={cashAccount} onChange={(e) => setCashAccount(e.target.value)}>
            {cashAccounts.map((a) => <option key={a.code} value={a.code}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-mutedtext mb-1">Тайлбар (заавал биш)</label>
          <input className="ds-input w-full" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        {error && <div className="text-[11px] text-customRed">{error}</div>}
      </div>
    </Modal>
  );
}

function JournalEntriesTab({ hoaId }) {
  const { user } = useAuth();
  const { accounts, accountLabel } = useChartOfAccounts(hoaId);
  const [entries, setEntries] = useState([]);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [adding, setAdding] = useState(false);
  const [reversing, setReversing] = useState(null);
  const [quickKind, setQuickKind] = useState(null); // 'income' | 'expense' | null

  async function load() {
    if (!hoaId) return;
    setLoading(true);
    const [{ data: entryRows }, { data: lineRows }] = await Promise.all([
      fetchAllRows(() => supabase.from('journal_entries').select('*').eq('tenant_id', hoaId).order('entry_date', { ascending: false }).order('created_at', { ascending: false })),
      fetchAllRows(() => supabase.from('journal_entry_lines').select('*, journal_entries!inner(tenant_id)').eq('journal_entries.tenant_id', hoaId)),
    ]);
    setEntries(entryRows || []);
    setLines(lineRows || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [hoaId]);

  const linesFor = (entryId) => lines.filter((l) => l.entry_id === entryId);
  // 2026-09-22 (64): НББ стандарт нийцүүлэлт (3-р зүйл) — Буцаах
  // бичилт. Үүнээс хойш staff НЭГ ч журналын бичилтийг шууд UPDATE/
  // DELETE хийж ЧАДАХГҮй (RLS-ээр хориглогдсон) — зөвхөн БУЦААХ
  // (reversing) бичилт үүсгэж, алдааг залруулна.
  const isEntryReversed = (entryId) => entries.some((e) => e.reverses_entry_id === entryId);

  async function handleReverse(entry) {
    setReversing(entry.id);
    try {
      const entryLines = linesFor(entry.id);
      const { data: newEntry, error: entryErr } = await supabase.from('journal_entries').insert({
        tenant_id: hoaId, entry_date: new Date().toISOString().slice(0, 10),
        description: `Буцаалт: ${entry.description}`, source_type: 'manual', reverses_entry_id: entry.id, created_by: user?.id,
      }).select().single();
      if (entryErr) { alert(entryErr.message); return; }
      const reversedLines = entryLines.map((l) => ({ entry_id: newEntry.id, account_code: l.account_code, debit: Number(l.credit), credit: Number(l.debit) }));
      const { error: linesErr } = await supabase.from('journal_entry_lines').insert(reversedLines);
      if (linesErr) { alert(linesErr.message); return; }
      load();
    } finally {
      setReversing(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12px] text-mutedtext">
          Энд "Ажилтны бүртгэл → Цалингийн тооцоолол → Цалин төлөх" дарахад автоматаар үүссэн, "+ Орлого/Зарлага бүртгэх" (ангилал сонгоод шууд бичигддэг, Дт/Кт мэдэх шаардлагагүй) БОЛОН "+ Шинэ гүйлгээ бүртгэх" (гараар Дт/Кт) товчоор оруулсан журналын бичилтүүд харагдана. НББ стандартын дагуу, бичигдсэн бичилтийг шууд засах/устгах боломжгүй — зөвхөн "Буцаах" товчоор алдааг залруулна.
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <button className="ds-btn-secondary" onClick={() => setQuickKind('income')}>+ Орлого бүртгэх</button>
          <button className="ds-btn-secondary" onClick={() => setQuickKind('expense')}>+ Зарлага бүртгэх</button>
          <button className="ds-btn-primary" onClick={() => setAdding(true)}>+ Шинэ гүйлгээ бүртгэх</button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {loading ? (
          <div className="ds-card p-6 text-center text-mutedtext text-[12px]">Ачаалж байна...</div>
        ) : entries.length === 0 ? (
          <div className="ds-card p-6 text-center text-mutedtext text-[12px]">Журналын бичилт бүртгэгдээгүй байна</div>
        ) : entries.map((entry) => {
          const entryLines = linesFor(entry.id);
          const totalDebit = entryLines.reduce((s, l) => s + Number(l.debit), 0);
          const isOpen = expanded === entry.id;
          const reversed = isEntryReversed(entry.id);
          return (
            <div key={entry.id} className="ds-card p-3">
              <button className="w-full flex items-center justify-between text-left" onClick={() => setExpanded(isOpen ? null : entry.id)}>
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">
                    {entry.description}
                    {entry.reverses_entry_id && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-customYellow/20 text-customYellow">Буцаалт</span>}
                    {reversed && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-500/20 text-mutedtext">Буцаагдсан</span>}
                  </div>
                  <div className="text-[11px] text-mutedtext">{formatDateTimeMinutes(entry.created_at)} · {entry.source_type === 'payroll' ? 'Цалингийн журнал' : 'Гар аргаар'}</div>
                </div>
                <div className="text-[13px] font-semibold shrink-0">{formatMoney(totalDebit)}₮</div>
              </button>
              {isOpen && (
                <>
                <table className="ds-table w-full mt-3">
                  <thead>
                    <tr>
                      <th className="py-1.5 px-2">ДАНС</th>
                      <th className="py-1.5 px-2 text-right">ДЕБЕТ (Дт)</th>
                      <th className="py-1.5 px-2 text-right">КРЕДИТ (Кт)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
                    {entryLines.map((l) => (
                      <tr key={l.id}>
                        <td className="py-1.5 px-2">{accountLabel(l.account_code)}</td>
                        <td className="py-1.5 px-2 text-right">{Number(l.debit) > 0 ? `${formatMoney(l.debit)}₮` : ''}</td>
                        <td className="py-1.5 px-2 text-right">{Number(l.credit) > 0 ? `${formatMoney(l.credit)}₮` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!entry.reverses_entry_id && !reversed && (
                  <button className="ds-btn-secondary mt-2" onClick={() => handleReverse(entry)} disabled={reversing === entry.id}>
                    {reversing === entry.id ? 'Буцааж байна...' : 'Буцаах'}
                  </button>
                )}
                </>
              )}
            </div>
          );
        })}
      </div>
      <NewJournalEntryModal
        key={adding ? 'add-open' : 'add-closed'}
        open={adding}
        onClose={() => setAdding(false)}
        hoaId={hoaId}
        accounts={accounts}
        onSaved={() => { setAdding(false); load(); }}
      />
      <QuickTransactionModal
        key={quickKind ? `quick-${quickKind}` : 'quick-closed'}
        open={!!quickKind}
        onClose={() => setQuickKind(null)}
        hoaId={hoaId}
        kind={quickKind}
        accounts={accounts}
        onSaved={() => { setQuickKind(null); load(); }}
      />
    </div>
  );
}

// 2026-09-20 (60): "Журналын бичилт"-д ГАРААР шинэ гүйлгээ (давхар
// бичилтийн зарчмаар) бүртгэх модаль — Accounting.jsx-ийн 5 таб
// ХЭЗЭЭ Ч бодит dataгүй байсан үндсэн шалтгаан (ЯМАР Ч INSERT хийх
// форм байхгүй байсан) яг ЭНЭ. Хэрэглэгчтэй зөвлөлдсөний дагуу,
// Монголын НББ стандартын дагуу (Дт нийлбэр = Кт нийлбэр байх ёстой)
// хэрэгжүүлэв. Олон мөрт дэмжлэгтэй (2-оос дээш Дт/Кт мөр байж
// болно).
function emptyJournalLine() {
  return { id: Math.random().toString(36).slice(2), account_code: '', side: 'debit', amount: '' };
}
function NewJournalEntryModal({ open, onClose, hoaId, accounts, onSaved }) {
  const { user } = useAuth();
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState([emptyJournalLine(), emptyJournalLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateRow(id, patch) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, emptyJournalLine()]);
  }
  function removeRow(id) {
    setRows((rs) => (rs.length > 2 ? rs.filter((r) => r.id !== id) : rs));
  }

  const totalDebit = rows.filter((r) => r.side === 'debit').reduce((s, r) => s + (+r.amount || 0), 0);
  const totalCredit = rows.filter((r) => r.side === 'credit').reduce((s, r) => s + (+r.amount || 0), 0);
  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 1;
  const allRowsFilled = rows.every((r) => r.account_code && (+r.amount || 0) > 0);
  const canSave = description.trim() && entryDate && allRowsFilled && isBalanced && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      const { data: entry, error: entryErr } = await supabase.from('journal_entries').insert({
        tenant_id: hoaId, entry_date: entryDate, description: description.trim(), source_type: 'manual', created_by: user?.id,
      }).select().single();
      if (entryErr) { setError(entryErr.message); return; }
      const lineRows = rows.map((r) => ({
        entry_id: entry.id, account_code: r.account_code,
        debit: r.side === 'debit' ? (+r.amount || 0) : 0,
        credit: r.side === 'credit' ? (+r.amount || 0) : 0,
      }));
      const { error: linesErr } = await supabase.from('journal_entry_lines').insert(lineRows);
      if (linesErr) { setError(linesErr.message); return; }
      setEntryDate(new Date().toISOString().slice(0, 10));
      setDescription('');
      setRows([emptyJournalLine(), emptyJournalLine()]);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Шинэ гүйлгээ бүртгэх" size="lg" footer={
      <>
        <button className="ds-btn-secondary" onClick={onClose}>Хаах</button>
        <button className="ds-btn-primary" onClick={handleSave} disabled={!canSave}>{saving ? 'Хадгалж байна...' : 'Хадгалах'}</button>
      </>
    }>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Огноо</label>
          <input type="date" className="ds-input w-full" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Тайлбар</label>
          <input className="ds-input w-full" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Гүйлгээний тайлбар" />
        </div>
      </div>

      <div className="text-[11px] text-slate-500 dark:text-mutedtext mb-1">Дансны мөрүүд (Дт нийлбэр = Кт нийлбэр байх ёстой)</div>
      <div className="flex flex-col gap-2 mb-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-2">
            <select className="ds-select flex-1" value={r.account_code} onChange={(e) => updateRow(r.id, { account_code: e.target.value })}>
              <option value="">Данс сонгох...</option>
              {accounts.map((a) => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
            </select>
            <select className="ds-select" style={{ width: 90 }} value={r.side} onChange={(e) => updateRow(r.id, { side: e.target.value })}>
              <option value="debit">Дт</option>
              <option value="credit">Кт</option>
            </select>
            <input type="number" className="ds-input" style={{ width: 140 }} placeholder="Дүн" value={r.amount} onChange={(e) => updateRow(r.id, { amount: e.target.value })} />
            <button className="ds-icon-btn danger" onClick={() => removeRow(r.id)} disabled={rows.length <= 2} title="Мвр устгах">×</button>
          </div>
        ))}
      </div>
      <button className="ds-btn-secondary mb-3" onClick={addRow}>+ Мвр нэмэх</button>

      <div className={`ds-card p-3 mb-2 flex items-center justify-between text-[13px] font-semibold ${isBalanced ? 'text-customGreen' : 'text-customRed'}`}>
        <span>Нийт Дт: {formatMoney(totalDebit)}₮</span>
        <span>Нийт Кт: {formatMoney(totalCredit)}₮</span>
        <span>{isBalanced ? '✓ Тэнцэж байна' : '✗ Тэнцэхгүй байна'}</span>
      </div>
      {error && <div className="text-[12px] text-customRed mb-2">{error}</div>}
    </Modal>
  );
}

function TrialBalanceTab({ hoaId }) {
  const { accounts, loading: accountsLoading, categoryLabels } = useChartOfAccounts(hoaId);
  const { lines, loading } = useAllJournalLines(hoaId);

  const rows = accounts.map((acc) => {
    const { totalDebit, totalCredit, balance, isDebitNormal } = accountBalance(acc, lines);
    if (totalDebit === 0 && totalCredit === 0) return null;
    return { acc, totalDebit, totalCredit, balance, isDebitNormal };
  }).filter(Boolean);

  const grandTotalDebit = rows.reduce((s, r) => s + r.totalDebit, 0);
  const grandTotalCredit = rows.reduce((s, r) => s + r.totalCredit, 0);
  const isBalanced = Math.abs(grandTotalDebit - grandTotalCredit) < 1;

  return (
    <div>
      <div className="text-[12px] text-mutedtext mb-3">
        Дансны төлөвлөгөөний данс бүр дээр хийгдсэн бүх журналын бичилтийн нийлбэр үлдэгдэл — зөвхөн бичилттэй (идэвхтэй) данснууд харагдана.
      </div>
      <div className="ds-table-wrap">
        <div className="flex-1 overflow-auto overscroll-contain">
          <table className="ds-table">
            <thead>
              <tr>
                <th className="py-2.5 px-3">ДАНС</th>
                <th className="py-2.5 px-3">АНГИЛАЛ</th>
                <th className="py-2.5 px-3 text-right">НИЙТ ДЕБЕТ (Дт)</th>
                <th className="py-2.5 px-3 text-right">НИЙТ КРЕДИТ (Кт)</th>
                <th className="py-2.5 px-3 text-right">ҮЛДЭГДЭЛ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
              {(loading || accountsLoading) ? (
                <tr><td colSpan={5} className="py-6 text-center text-mutedtext">Ачаалж байна...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="py-6 text-center text-mutedtext">Журналын бичилт бүртгэгдээгүй байна</td></tr>
              ) : rows.map((r) => (
                <tr key={r.acc.id}>
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">{r.acc.code} — {r.acc.name}</td>
                  <td className="py-2.5 px-3 text-mutedtext">{categoryLabels[r.acc.category] || r.acc.category}</td>
                  <td className="py-2.5 px-3 text-right">{r.totalDebit > 0 ? `${formatMoney(r.totalDebit)}₮` : '—'}</td>
                  <td className="py-2.5 px-3 text-right">{r.totalCredit > 0 ? `${formatMoney(r.totalCredit)}₮` : '—'}</td>
                  <td className="py-2.5 px-3 text-right font-semibold">
                    {formatMoney(Math.abs(r.balance))}₮ <span className="text-[10.5px] text-mutedtext">({r.isDebitNormal ? 'Дт' : 'Кт'})</span>
                  </td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-300 dark:border-bordercol bg-slate-100 dark:bg-white/[0.03] font-semibold">
                  <td className="py-2.5 px-3" colSpan={2}>НИЙТ</td>
                  <td className="py-2.5 px-3 text-right">{formatMoney(grandTotalDebit)}₮</td>
                  <td className="py-2.5 px-3 text-right">{formatMoney(grandTotalCredit)}₮</td>
                  <td className={`py-2.5 px-3 text-right ${isBalanced ? 'text-customGreen' : 'text-customRed'}`}>
                    {isBalanced ? '✓ Тэнцсэн' : '⚠ Тэнцээгүй'}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

// "Орлого, зарлагын тайлан" (Income Statement) — Орлогын данснуудын
// нийлбэрээс Зардлын данснуудын нийлбэрийг хасаж, цэвэр ашиг/
// алдагдлыг тооцно.
function IncomeStatementTab({ hoaId }) {
  const { accounts, loading: accountsLoading } = useChartOfAccounts(hoaId);
  const { lines, loading } = useAllJournalLines(hoaId);

  const incomeRows = accounts.filter((a) => a.category === 'income').map((acc) => ({ acc, ...accountBalance(acc, lines) })).filter((r) => r.balance !== 0);
  const expenseRows = accounts.filter((a) => a.category === 'expense').map((acc) => ({ acc, ...accountBalance(acc, lines) })).filter((r) => r.balance !== 0);
  const totalIncome = incomeRows.reduce((s, r) => s + r.balance, 0);
  const totalExpense = expenseRows.reduce((s, r) => s + r.balance, 0);
  const netResult = totalIncome - totalExpense;

  return (
    <div>
      <div className="text-[12px] text-mutedtext mb-3">
        Одоогийн бүх журналын бичилтэд үндэслэсэн орлого, зарлагын нэгтгэсэн тайлан.
      </div>
      {(loading || accountsLoading) ? (
        <div className="ds-card p-6 text-center text-mutedtext text-[12px]">Ачаалж байна...</div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="ds-card p-3">
            <div className="text-[11px] font-semibold tracking-wide text-mutedtext uppercase mb-2">Орлого</div>
            {incomeRows.length === 0 ? (
              <div className="text-[12px] text-mutedtext">Орлогын бичилт бүртгэгдээгүй байна</div>
            ) : incomeRows.map((r) => (
              <div key={r.acc.id} className="flex justify-between text-[12.5px] py-0.5">
                <span>{r.acc.code} — {r.acc.name}</span>
                <span>{formatMoney(r.balance)}₮</span>
              </div>
            ))}
            <div className="flex justify-between text-[13px] font-semibold pt-2 mt-2 border-t border-slate-200 dark:border-bordercol">
              <span>Нийт орлого</span>
              <span>{formatMoney(totalIncome)}₮</span>
            </div>
          </div>

          <div className="ds-card p-3">
            <div className="text-[11px] font-semibold tracking-wide text-mutedtext uppercase mb-2">Зардал</div>
            {expenseRows.length === 0 ? (
              <div className="text-[12px] text-mutedtext">Зардлын бичилт бүртгэгдээгүй байна</div>
            ) : expenseRows.map((r) => (
              <div key={r.acc.id} className="flex justify-between text-[12.5px] py-0.5">
                <span>{r.acc.code} — {r.acc.name}</span>
                <span>{formatMoney(r.balance)}₮</span>
              </div>
            ))}
            <div className="flex justify-between text-[13px] font-semibold pt-2 mt-2 border-t border-slate-200 dark:border-bordercol">
              <span>Нийт зардал</span>
              <span>{formatMoney(totalExpense)}₮</span>
            </div>
          </div>

          <div className="ds-card p-3">
            <div className={`flex justify-between text-[15px] font-bold ${netResult >= 0 ? 'text-customGreen' : 'text-customRed'}`}>
              <span>{netResult >= 0 ? 'Цэвэр ашиг' : 'Цэвэр алдагдал'}</span>
              <span>{formatMoney(Math.abs(netResult))}₮</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// "Тэнцэл" (Balance Sheet) — Хөрөнгө = өглөг + Эздийн эрх (тайлант
// үеийн цэвэр ашиг/алдагдлыг Эздийн эрхэд нэмж тооцсоноор тэнцэнэ).
function BalanceSheetTab({ hoaId }) {
  const { accounts, loading: accountsLoading, categoryLabels } = useChartOfAccounts(hoaId);
  const { lines, loading } = useAllJournalLines(hoaId);

  const assetRows = accounts.filter((a) => ASSET_CATEGORIES.includes(a.category)).map((acc) => ({ acc, ...accountBalance(acc, lines) })).filter((r) => r.balance !== 0);
  const payableRows = accounts.filter((a) => a.category === 'payable').map((acc) => ({ acc, ...accountBalance(acc, lines) })).filter((r) => r.balance !== 0);
  const equityRows = accounts.filter((a) => a.category === 'equity').map((acc) => ({ acc, ...accountBalance(acc, lines) })).filter((r) => r.balance !== 0);

  const incomeTotal = accounts.filter((a) => a.category === 'income').reduce((s, acc) => s + accountBalance(acc, lines).balance, 0);
  const expenseTotal = accounts.filter((a) => a.category === 'expense').reduce((s, acc) => s + accountBalance(acc, lines).balance, 0);
  const netResult = incomeTotal - expenseTotal;

  const totalAssets = assetRows.reduce((s, r) => s + r.balance, 0);
  const totalPayables = payableRows.reduce((s, r) => s + r.balance, 0);
  const totalEquity = equityRows.reduce((s, r) => s + r.balance, 0) + netResult;
  const isBalanced = Math.abs(totalAssets - (totalPayables + totalEquity)) < 1;

  return (
    <div>
      <div className="text-[12px] text-mutedtext mb-3">
        Хөрөнгө = өглөг + Эздийн эрх (тайлант үеийн цэвэр ашиг/алдагдлыг Эздийн эрхэд нэмж тооцсон).
      </div>
      {(loading || accountsLoading) ? (
        <div className="ds-card p-6 text-center text-mutedtext text-[12px]">Ачаалж байна...</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="ds-card p-3">
            <div className="text-[11px] font-semibold tracking-wide text-mutedtext uppercase mb-2">Хөрөнгө</div>
            {assetRows.length === 0 ? (
              <div className="text-[12px] text-mutedtext">Бичилт бүртгэгдээгүй</div>
            ) : assetRows.map((r) => (
              <div key={r.acc.id} className="flex justify-between text-[12.5px] py-0.5">
                <span>{r.acc.code} — {r.acc.name}</span>
                <span>{formatMoney(r.balance)}₮</span>
              </div>
            ))}
            <div className="flex justify-between text-[13px] font-semibold pt-2 mt-2 border-t border-slate-200 dark:border-bordercol">
              <span>Нийт хөрөнгө</span>
              <span>{formatMoney(totalAssets)}₮</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="ds-card p-3">
              <div className="text-[11px] font-semibold tracking-wide text-mutedtext uppercase mb-2">өглөг</div>
              {payableRows.length === 0 ? (
                <div className="text-[12px] text-mutedtext">Бичилт бүртгэгдээгүй</div>
              ) : payableRows.map((r) => (
                <div key={r.acc.id} className="flex justify-between text-[12.5px] py-0.5">
                  <span>{r.acc.code} — {r.acc.name}</span>
                  <span>{formatMoney(r.balance)}₮</span>
                </div>
              ))}
              <div className="flex justify-between text-[13px] font-semibold pt-2 mt-2 border-t border-slate-200 dark:border-bordercol">
                <span>Нийт өглөг</span>
                <span>{formatMoney(totalPayables)}₮</span>
              </div>
            </div>
            <div className="ds-card p-3">
              <div className="text-[11px] font-semibold tracking-wide text-mutedtext uppercase mb-2">Эздийн эрх</div>
              {equityRows.map((r) => (
                <div key={r.acc.id} className="flex justify-between text-[12.5px] py-0.5">
                  <span>{r.acc.code} — {r.acc.name}</span>
                  <span>{formatMoney(r.balance)}₮</span>
                </div>
              ))}
              <div className="flex justify-between text-[12.5px] py-0.5">
                <span>Тайлант үеийн цэвэр {netResult >= 0 ? 'ашиг' : 'алдагдал'}</span>
                <span>{formatMoney(netResult)}₮</span>
              </div>
              <div className="flex justify-between text-[13px] font-semibold pt-2 mt-2 border-t border-slate-200 dark:border-bordercol">
                <span>Нийт эздийн эрх</span>
                <span>{formatMoney(totalEquity)}₮</span>
              </div>
            </div>
          </div>

          <div className={`ds-card p-3 col-span-2 text-center text-[13px] font-semibold ${isBalanced ? 'text-customGreen' : 'text-customRed'}`}>
            {isBalanced ? '✓ Тэнцэл тэнцсэн' : '⚠ Тэнцэл тэнцээгүй'} (Хөрөнгө {formatMoney(totalAssets)}₮ vs өглөг+Эрх {formatMoney(totalPayables + totalEquity)}₮)
          </div>
        </div>
      )}
    </div>
  );
}

// 2026-09-22 (66): НББ стандарт нийцүүлэлт (5-р зүйл) — Эздийн
// эрхийн өөрчлөлтийн тайлан (Statement of Changes in Equity).
// Стандарт 4 үндсэн санхүүгийн тайлангийн НЭГ. Эздийн эрхийн
// (equity) данс тус бүрийн НЭМЭГДЭЛ (кредит, өсөлт)/ХАСАГДАЛ (дебет,
// бууралт)-ыг тусад нь харуулж, мөн одоо хүртэл ЭЗДИЙН ЭРХ рүү
// ХААГДААГҮй (closing entry хийгддэггүй) тайлант үеийн цэвэр ашиг/
// алдагдлыг ХАРАГДАЦ болгож нэмнэ (BalanceSheetTab-тай ЯГ ИЖИЛ
// зарчим — Rule of two).
// 2026-09-22 (67): НББ стандарт нийцүүлэлт (6-р зүйл) — Албан ёсны
// А маягт (Санхүүгийн байдлын тайлан). Сангийн сайдын 2017.386
// тушаалын 3-р хавсралтаас үзүүлсэн ЯГ мөрийн дугаар, нэрээр
// (1, 1.1, 1.1.1...1.1.8, 1.2, 1.2.1...2.4) баганалж, манай дансны
// үлдэгдлүүдийг харгалзах мөрт тавьна. Манай систем одоо хүртэл
// ялгаж хөтлөдэггүй зарим мөр (Найдваргүй авлагын хасагдуулга,
// Хуримтлагдсан элэгдэл — Элэгдлийн автомат тооцоолол хараахан
// хийгдээгүй тул, Урт хугацаат зээл гэх мэт) 0 гэж үнэн зөвөөр
// үзүүлнэ — үүнийг хөвөөтөй мөрт тэмдэглэсэн.
function officialRow(no, label, value, priorValue, opts) {
  const bold = opts?.bold;
  return { no, label, value, priorValue, bold };
}

// 2026-09-23 (74): НББ үлдэгдэл засвар (5-р зүйл) — Харьцуулсан
// (өмнөх жилийн) багана. Ф1/Ф2-ийн БүХ тооцооллыг НЭГ функцэд
// нэгтгэж, "энэ жил" (бүх lines) БОЛОН "өмнөх жил" (зөвхөн өмнөх
// жилийн 12-р сарын 31 хүртэлх lines) гэсэн 2 ТУСДАА dataset дээр
// ЯГ ИЖИЛ логикоор дуудна (Rule of two — давхардал байхгүй).
// 2026-09-23 (76): НББ үлдэгдэл засвар (ЧУХАЛ АЛДАА ЗАСАВ) — Б
// маягт (үр дүнгийн тайлан) БОЛОН В маягт (Мөнгөн гүйлгээ)-ийн
// "Энэ жил" багана үнэн хэрэгтээ СИСТЕМ ЭХЭЛСЭН ЦАГААС ХОЙШИХ БүХ
// цагийн нийлбэр байсныг олов (ЗӨВХӨН тухайн жилийн орлого/зардал
// БИШ). Үр дүнгийн тайлан бол "үеийн" (нэг жилийн) тайлан тул, зөвхөн
// ТУХАЙН ЖИЛИЙН гүйлгээгээр тооцоолох ёстой — Санхүүгийн байдлын
// тайлан (Тэнцэл) харин үргэлж (систем эхэлсэн цагаас
// хойших) хуримтлагдсан үлдэгдлээр тооцоологдох ёстой (Активуудын
// үлдэгдэл үргэлж хуримтлагдсан тул, тэнцлийг барихын тулд Эздийн
// эрх дэх хуримтлагдсан үр дүн ч мөн адил хуримтлагдсан байх ёстой).
// Иймд энэ функц эдгээр хоёрыг (cumLines: тэнцлийн мөрүүдэд,
// yearLines: үр дүнгийн тайлангийн мөрүүдэд) ялгамжтайгаар авна.
function computeF1F2Snapshot(accounts, cumLines, yearLines) {
  const sumByCategoryCum = (cat) => accounts.filter((a) => a.category === cat).reduce((s, acc) => s + accountBalance(acc, cumLines).balance, 0);
  const sumByCodeCum = (code) => {
    const acc = accounts.find((a) => a.code === code);
    return acc ? accountBalance(acc, cumLines).balance : 0;
  };
  const sumByCategoryYear = (cat) => accounts.filter((a) => a.category === cat).reduce((s, acc) => s + accountBalance(acc, yearLines).balance, 0);
  const sumByCodeYear = (code) => {
    const acc = accounts.find((a) => a.code === code);
    return acc ? accountBalance(acc, yearLines).balance : 0;
  };

  const cash = sumByCategoryCum('cash');
  const shortTermInvestment = sumByCategoryCum('short_term_investment');
  const receivable = sumByCategoryCum('receivable');
  const badDebtAllowance = sumByCodeCum('1290');
  const receivableGross = receivable - badDebtAllowance;
  const inventory = sumByCategoryCum('inventory');
  const prepaidExpense = sumByCategoryCum('prepaid_expense');
  const currentAssetsTotal = cash + shortTermInvestment + receivable + inventory + prepaidExpense;

  const fixedAssetGross = sumByCodeCum('2010');
  const accumulatedDepreciation = sumByCodeCum('2020');
  const nonCurrentAssetsTotal = sumByCategoryCum('fixed_asset');
  const totalAssets = currentAssetsTotal + nonCurrentAssetsTotal;

  const salaryPayable = sumByCodeCum('3130');
  const taxPayable = sumByCodeCum('3110') + sumByCodeCum('3120');
  const deferredIncome = sumByCodeCum('3210');
  const otherPayable = sumByCodeCum('3310');
  const accountsPayable = sumByCategoryCum('payable') - salaryPayable - taxPayable - deferredIncome - otherPayable;
  const currentLiabTotal = accountsPayable + salaryPayable + taxPayable + deferredIncome + otherPayable;
  const totalLiabilities = currentLiabTotal;

  // "2.3.5 Хуримтлагдсан үр дүн" (Тэнцэл) — үргэлж ХУРИМТЛАГДСАН
  // (системийн эхнээс хойших) байх ёстой, учир нь Активууд/өр
  // төлбөр хоёул үргэлж хуримтлагдсан тул, тэнцэл барихын тулд
  // ЭНЭ мөр ч мөн адил байх ёстой.
  const incomeTotalCum = sumByCategoryCum('income');
  const expenseTotalCum = sumByCategoryCum('expense');
  const netResultCumulative = incomeTotalCum - expenseTotalCum;
  const reserveUnrestricted = sumByCategoryCum('equity');
  const netAssetsTotal = reserveUnrestricted + netResultCumulative;

  // Б маягтын (үр дүнгийн тайлан) мөрүүд — ЗӨВХӨН тайлант жилийн
  // (yearLines) гүйлгээгээр тооцоолно.
  const membershipDues = sumByCodeYear('5110');
  const rentIncome = sumByCodeYear('5410');
  const otherIncomeExplicit = sumByCategoryYear('income') - membershipDues - rentIncome;
  const operatingIncomeTotal = membershipDues + rentIncome + otherIncomeExplicit;

  const salaryExpense = sumByCodeYear('7010');
  const socialInsuranceExpense = sumByCodeYear('7020');
  const maintenanceExpense = sumByCodeYear('7030');
  const depreciationExpense = sumByCodeYear('7070');
  const badDebtExpense = sumByCodeYear('7080');
  const otherExpenseExplicit = sumByCategoryYear('expense') - salaryExpense - socialInsuranceExpense - maintenanceExpense - depreciationExpense - badDebtExpense;
  const operatingExpenseTotal = salaryExpense + socialInsuranceExpense + maintenanceExpense + depreciationExpense + badDebtExpense + otherExpenseExplicit;

  const operatingResult = operatingIncomeTotal - operatingExpenseTotal;

  return {
    cash, shortTermInvestment, receivableGross, badDebtAllowance, inventory, prepaidExpense, currentAssetsTotal,
    fixedAssetGross, accumulatedDepreciation, nonCurrentAssetsTotal, totalAssets,
    accountsPayable, salaryPayable, taxPayable, deferredIncome, otherPayable, currentLiabTotal, totalLiabilities,
    reserveUnrestricted, netResultCumulative, netAssetsTotal,
    membershipDues, rentIncome, otherIncomeExplicit, operatingIncomeTotal,
    salaryExpense, socialInsuranceExpense, maintenanceExpense, depreciationExpense, badDebtExpense, otherExpenseExplicit, operatingExpenseTotal,
    operatingResult,
  };
}

// 2026-09-23 (75): В маягт (Мөнгөн гүйлгээний тайлан) — "шууд
// арга" (CashFlowStatementTab-тай ЯГ ИЖИЛ логик, Rule of two), гэхдээ
// үр дүнг ерөнхий 3 бүлэг (үйл ажиллагаа/хөрөнгө оруулалт/санхүүжилт)
// биш, харин ТУХАЙН ЭСРЭГ ДАНСНЫ КОДООР дэд мөрүүдэд задалж өгнө.
function computeOfficialCashFlow(accounts, lines) {
  const accountByCode = {};
  accounts.forEach((a) => { accountByCode[a.code] = a; });

  const linesByEntry = {};
  lines.forEach((l) => {
    if (!linesByEntry[l.entry_id]) linesByEntry[l.entry_id] = [];
    linesByEntry[l.entry_id].push(l);
  });

  let membershipCash = 0, rentCash = 0, otherCash = 0;
  let salaryCash = 0, socialInsuranceCash = 0, operatingExpenseCash = 0;
  let investingCash = 0, financingCash = 0;

  Object.values(linesByEntry).forEach((entryLines) => {
    const cashLines = entryLines.filter((l) => accountByCode[l.account_code]?.category === 'cash');
    const nonCashLines = entryLines.filter((l) => accountByCode[l.account_code]?.category !== 'cash');
    if (cashLines.length === 0) return;
    const cashNet = cashLines.reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);
    const contraTotal = nonCashLines.reduce((s, l) => s + Number(l.debit) + Number(l.credit), 0);
    if (contraTotal === 0) return;
    nonCashLines.forEach((l) => {
      const acc = accountByCode[l.account_code];
      const cat = acc?.category;
      const code = l.account_code;
      const weight = (Number(l.debit) + Number(l.credit)) / contraTotal;
      const share = cashNet * weight;
      if (cat === 'fixed_asset') { investingCash += share; return; }
      if (cat === 'equity') { financingCash += share; return; }
      if (code === '5110' || code === '1210' || code === '1220') { membershipCash += share; return; }
      if (code === '5410') { rentCash += share; return; }
      if (code === '7010' || code === '3130') { salaryCash += share; return; }
      if (code === '7020' || code === '3110' || code === '3120') { socialInsuranceCash += share; return; }
      if (['7030', '7040', '7050', '7060'].includes(code)) { operatingExpenseCash += share; return; }
      otherCash += share;
    });
  });

  const operatingCashTotal = membershipCash + rentCash + otherCash + salaryCash + socialInsuranceCash + operatingExpenseCash;
  const totalCashNet = operatingCashTotal + investingCash + financingCash;

  return { membershipCash, rentCash, otherCash, salaryCash, socialInsuranceCash, operatingExpenseCash, operatingCashTotal, investingCash, financingCash, totalCashNet };
}

function OfficialFormsTab({ hoaId }) {
  const { accounts, loading: accountsLoading } = useChartOfAccounts(hoaId);
  const { lines, loading } = useAllJournalLines(hoaId);

  if (loading || accountsLoading) return <div className="ds-card p-6 text-center text-mutedtext text-[12px]">Ачаалж байна...</div>;

  const now = new Date();
  const currentYearStartStr = `${now.getFullYear()}-01-01`;
  const priorYearStartStr = `${now.getFullYear() - 1}-01-01`;
  const priorYearEndStr = `${now.getFullYear() - 1}-12-31`;

  // Тэнцлийн (А маягт) мөрүүдэд — үргэлж ХУРИМТЛАГДСАН (систем
  // эхэлсэн цагаас хойших) үлдэгдэл; үр дүнгийн тайлан (Б маягт) БОЛОН
  // Мөнгөн гүйлгээ (В маягт)-ийн мөрүүдэд — ЗӨВХӨН тайлант ЖИЛИЙН
  // (үөийн) гүйлгээ.
  const cumLines = lines;
  const cumPriorLines = lines.filter((l) => l.entry_date && l.entry_date <= priorYearEndStr);
  const yearLines = lines.filter((l) => l.entry_date && l.entry_date >= currentYearStartStr);
  const yearPriorLines = lines.filter((l) => l.entry_date && l.entry_date >= priorYearStartStr && l.entry_date <= priorYearEndStr);

  const cur = computeF1F2Snapshot(accounts, cumLines, yearLines);
  const prior = computeF1F2Snapshot(accounts, cumPriorLines, yearPriorLines);

  const f1Rows = [
    officialRow('1', 'ХӨРӨНГӨ', null, null, { bold: true }),
    officialRow('1.1', 'Эргэлтийн хөрөнгө', null, null, { bold: true }),
    officialRow('1.1.1', 'Мөнгө, түүнтэй адилтгах хөрөнгө', cur.cash, prior.cash),
    officialRow('1.1.2', 'Богино хугацаат хөрөнгө оруулалт', cur.shortTermInvestment, prior.shortTermInvestment),
    officialRow('1.1.3', 'Дансны авлага', cur.receivableGross, prior.receivableGross),
    officialRow('1.1.4', 'Найдваргүй авлагын хасагдуулга', cur.badDebtAllowance, prior.badDebtAllowance),
    officialRow('1.1.5', 'Бараа материал', cur.inventory, prior.inventory),
    officialRow('1.1.6', 'Урьдчилж төлсөн зардал/тооцоо', cur.prepaidExpense, prior.prepaidExpense),
    officialRow('1.1.7', 'Бусад эргэлтийн хөрөнгө', 0, 0),
    officialRow('1.1.8', 'Эргэлтийн хөрөнгийн дүн', cur.currentAssetsTotal, prior.currentAssetsTotal, { bold: true }),
    officialRow('1.2', 'Эргэлтийн бус хөрөнгө', null, null, { bold: true }),
    officialRow('1.2.1', 'Үндсэн хөрөнгө', cur.fixedAssetGross, prior.fixedAssetGross),
    officialRow('1.2.2', 'Хуримтлагдсан элэгдэл', cur.accumulatedDepreciation, prior.accumulatedDepreciation),
    officialRow('1.2.3', 'Бусад үндсэн хөрөнгө', 0, 0),
    officialRow('1.2.5', 'Биет бус хөрөнгө', 0, 0),
    officialRow('1.2.7', 'Хөрөнгө оруулалт ба бусад хөрөнгө', 0, 0),
    officialRow('1.2.8', 'Эргэлтийн бус хөрөнгийн дүн', cur.nonCurrentAssetsTotal, prior.nonCurrentAssetsTotal, { bold: true }),
    officialRow('1.3', 'НИЙТ ХӨРӨНГИЙН ДҮН', cur.totalAssets, prior.totalAssets, { bold: true }),
    officialRow('2', 'ӨР ТӨЛБӨР БА ЦЭВЭР ХӨРӨНГӨ', null, null, { bold: true }),
    officialRow('2.1', 'Өр төлбөр', null, null, { bold: true }),
    officialRow('2.1.1', 'Богино хугацаат өр төлбэр', null, null, { bold: true }),
    officialRow('2.1.1.1', 'Дансны өглөг', cur.accountsPayable, prior.accountsPayable),
    officialRow('2.1.1.2', 'Цалингийн өглөг', cur.salaryPayable, prior.salaryPayable),
    officialRow('2.1.1.3', 'Татварын өр', cur.taxPayable, prior.taxPayable),
    officialRow('2.1.1.4', 'Богино хугацаат зээл', 0, 0),
    officialRow('2.1.1.5', 'Урьдчилж орсон орлого', cur.deferredIncome, prior.deferredIncome),
    officialRow('2.1.1.6', 'Бусад өглөг', cur.otherPayable, prior.otherPayable),
    officialRow('2.1.1.7', 'Богино хугацаат өр төлбөрийн дүн', cur.currentLiabTotal, prior.currentLiabTotal, { bold: true }),
    officialRow('2.1.2', 'Урт хугацаат өр төлбэр', 0, 0),
    officialRow('2.2', 'Өр төлбөрийн нийт дүн', cur.totalLiabilities, prior.totalLiabilities, { bold: true }),
    officialRow('2.3', 'Цэвэр хөрөнгө', null, null, { bold: true }),
    officialRow('2.3.1', 'Нөөц: а) хязгаарлалтгүй', cur.reserveUnrestricted, prior.reserveUnrestricted),
    officialRow('2.3.2', 'б) хязгаарлалттай', 0, 0),
    officialRow('2.3.3', 'Дахин үнэлгээний нэмэгдэл', 0, 0),
    officialRow('2.3.5', 'Хуримтлагдсан үр дүн', cur.netResultCumulative, prior.netResultCumulative),
    officialRow('2.3.6', 'Цэвэр хөрөнгийн дүн', cur.netAssetsTotal, prior.netAssetsTotal, { bold: true }),
    officialRow('2.4', 'ӨР ТӨЛБӨР БА ЦЭВЭР ХӨРӨНГИЙН ДҮН', cur.totalLiabilities + cur.netAssetsTotal, prior.totalLiabilities + prior.netAssetsTotal, { bold: true }),
  ];

  const isBalanced = Math.abs(cur.totalAssets - (cur.totalLiabilities + cur.netAssetsTotal)) < 1;

  const f2Rows = [
    officialRow('1', 'Үндсэн үйл ажиллагааны орлого', null, null, { bold: true }),
    officialRow('2', 'Гишүүдийн татвар', cur.membershipDues, prior.membershipDues),
    officialRow('3', 'Хөтөлбөр, төслийн орлого', 0, 0),
    officialRow('4', 'Бэлэг, хандив, тусламжийн орлого', 0, 0),
    officialRow('5', 'Түрээсийн орлого', cur.rentIncome, prior.rentIncome),
    officialRow('6', 'Хөрөнгө оруулалтын орлого', 0, 0),
    officialRow('7', 'Бусад орлого', cur.otherIncomeExplicit, prior.otherIncomeExplicit),
    officialRow('8', 'Үйл ажиллагааны орлогын нийт дүн', cur.operatingIncomeTotal, prior.operatingIncomeTotal, { bold: true }),
    officialRow('9', 'Үндсэн үйл ажиллагааны зардал', null, null, { bold: true }),
    officialRow('10', 'Бэлэг, хандив ба тусламж', 0, 0),
    officialRow('14', 'Хөтөлбөр хэрэгжүүлсний зардал', 0, 0),
    officialRow('15', 'Төсөл хэрэгжүүлсний зардал', 0, 0),
    officialRow('16', 'Ерөнхий удирдлагын зардал', 0, 0),
    officialRow('17', 'Цалин хөлс, шагнал', cur.salaryExpense, prior.salaryExpense),
    officialRow('18', 'Нийгмийн даатгалын шимтгэл', cur.socialInsuranceExpense, prior.socialInsuranceExpense),
    officialRow('19', 'Засвар үйлчилгээний зардал', cur.maintenanceExpense, prior.maintenanceExpense),
    officialRow('20', 'Ашиглалтын зардал', 0, 0),
    officialRow('21', 'Түрээсийн зардал', 0, 0),
    officialRow('22', 'Албан томилолтын зардал', 0, 0),
    officialRow('23', 'Тээврийн зардал', 0, 0),
    officialRow('24', 'Элэгдлийн зардал', cur.depreciationExpense, prior.depreciationExpense),
    officialRow('25', 'Зар сурталчилгааны зардал', 0, 0),
    officialRow('26', 'Шуудан холбооны зардал', 0, 0),
    officialRow('27', 'Шатахууны зардал', 0, 0),
    officialRow('28', 'Найдваргүй авлагын зардал', cur.badDebtExpense, prior.badDebtExpense),
    officialRow('29', 'Шагнал, урамшууллын зардал', 0, 0),
    officialRow('30', 'Зээлийн хүүгийн зардал', 0, 0),
    officialRow('31', 'Бусад зардал', cur.otherExpenseExplicit, prior.otherExpenseExplicit),
    officialRow('32', 'Үндсэн үйл ажиллагааны зардлын дүн', cur.operatingExpenseTotal, prior.operatingExpenseTotal, { bold: true }),
    officialRow('33', 'Үндсэн үйл ажиллагааны үр дүн', cur.operatingResult, prior.operatingResult, { bold: true }),
    officialRow('34', 'Үндсэн бус үйл ажиллагааны ашиг (алдагдал)', 0, 0),
    officialRow('38', 'Татварын зардал', 0, 0),
    officialRow('40', 'Онцгой шинжтэй зүйлс (цэвэр дүнгээр)', 0, 0),
    officialRow('41', 'Тайлант үеийн цэвэр үр дүн', cur.operatingResult, prior.operatingResult, { bold: true }),
  ];

  // 2026-09-23 (75): НББ үлдэгдэл засвар (6-р, сүүлийн зүйл) — В
  // маягт (Мөнгөн гүйлгээний тайлан) БОЛОН Г маягт (Цэвэр хөрэнгийн
  // eөрчлөлтийн тайлан) — 386 тушаалын ЯГ мөрийн бүтцээр. Мөнгөн
  // гүйлгээг CashFlowStatementTab-тай ЯГ ИЖИЛ "шууд арга" (per-entry
  // contra ангилал/данс)-аар тооцоолж, дэд мөрүүдэд (Гишүүдийн
  // татвар, Түрээс, Цалин, НДШ, Ашиглалтын зардал г.м) харгалзуулна.
  const cf = computeOfficialCashFlow(accounts, yearLines);
  const cfPrior = computeOfficialCashFlow(accounts, yearPriorLines);

  const f3Rows = [
    officialRow('1', 'Үндсэн үйл ажиллагааны мөнгөн гүйлгээ', null, null, { bold: true }),
    officialRow('1.1', 'Мөнгөн орлогын дүн (+)', null, null, { bold: true }),
    officialRow('(а)', 'Гишүүдийн татвараас орсон мөнгө', cf.membershipCash, cfPrior.membershipCash),
    officialRow('(б)', 'Төсөл, хөтөлбөрөөс орсон мөнгө', 0, 0),
    officialRow('(в)', 'Бэлэг, хандив, тусламж', 0, 0),
    officialRow('(г)', 'Түрээсийн орлогод хүлээн авсан мөнгө', cf.rentCash, cfPrior.rentCash),
    officialRow('(д)', 'Бусад', cf.otherCash > 0 ? cf.otherCash : 0, cfPrior.otherCash > 0 ? cfPrior.otherCash : 0),
    officialRow('1.2', 'Мөнгөн зарлагын дүн (-)', null, null, { bold: true }),
    officialRow('(а)', 'Ажиллагчдад төлсөн', cf.salaryCash, cfPrior.salaryCash),
    officialRow('(б)', 'Нийгмийн даатгалын байгууллагад төлсөн', cf.socialInsuranceCash, cfPrior.socialInsuranceCash),
    officialRow('(в)', 'Бараа материал худалдан авахад төлсөн', 0, 0),
    officialRow('(г)', 'Ашиглалтын зардалд төлсэн', cf.operatingExpenseCash, cfPrior.operatingExpenseCash),
    officialRow('(д)', 'Түлш шатахуун, тээврийн хөлс, сэлбэг хэрэгсэлд төлсөн', 0, 0),
    officialRow('(е)', 'Бэлтгэн нийлүүлэгчдэд төлсөн бусад мөнгө', cf.otherCash < 0 ? cf.otherCash : 0, cfPrior.otherCash < 0 ? cfPrior.otherCash : 0),
    officialRow('(ё)', 'Хүүний төлбөрт төлсэн', 0, 0),
    officialRow('(ж)', 'Татварын байгууллагад төлсэн', 0, 0),
    officialRow('(з)', 'Даатгалын төлбөрт төлсэн', 0, 0),
    officialRow('1.3', 'Үндсэн үйл ажиллагааны цэвэр мөнгөн гүйлгээний дүн', cf.operatingCashTotal, cfPrior.operatingCashTotal, { bold: true }),
    officialRow('2', 'Хөрэнгө оруулалтын үйл ажиллагааны мөнгөн гүйлгээ', null, null, { bold: true }),
    officialRow('2.2', 'Хөрэнгө оруулалтын үйл ажиллагааны цэвэр мөнгөн гүйлгээний дүн', cf.investingCash, cfPrior.investingCash, { bold: true }),
    officialRow('3', 'Санхүүгийн үйл ажиллагааны мөнгөн гүйлгээ', null, null, { bold: true }),
    officialRow('3.2', 'Санхүүгийн үйл ажиллагааны цэвэр мөнгөн гүйлгээний дүн', cf.financingCash, cfPrior.financingCash, { bold: true }),
    officialRow('4', 'Бүх цэвэр мөнгөн гүйлгээ', cf.totalCashNet, cfPrior.totalCashNet, { bold: true }),
    officialRow('5', 'Мөнгө, түүнтэй адилтгах хөрэнгийн эхний үлдэгдэл', 0, 0),
    officialRow('6', 'Мөнгө, түүнтэй адилтгах хөрэнгийн эцсийн үлдэгдэл', cur.cash, prior.cash, { bold: true }),
  ];

  // Г маягт (Цэвэр хөрэнгийн eөрчлөлт) — реконсайл: Үөийн эхний
  // үлдэгдэл (өмнөх жилийн эцсийн, cumulative) + Хуримтлалын санд
  // шууд орсон eөрчлөлт + Тайлант үөийн (зөвхөн ЭНЭ жилийн) цэвэр
  // үр дүн = Үөийн эцсийн үлдэгдэл (cumulative) — тоон утгаараа
  // яг зөв тэнцдэг.
  const reserveMovement = cur.reserveUnrestricted - prior.reserveUnrestricted;

  const f4Rows = [
    officialRow('1', 'Үеийн эхний үлдэгдэл', prior.netAssetsTotal, 0, { bold: true }),
    officialRow('4', 'Хуримтлалын санд гарсан өөрчлөлт', reserveMovement, 0),
    officialRow('8', 'Тайлант үеийн цэвэр үр дүн', cur.operatingResult, prior.operatingResult),
    officialRow('9', 'Үеийн эцсийн үлдэгдэл', cur.netAssetsTotal, prior.netAssetsTotal, { bold: true }),
  ];


  const renderTable = (rows) => (
    <div className="ds-card p-3">
      <table className="ds-table w-full">
        <thead>
          <tr>
            <th className="py-1.5 px-2" style={{ width: 70 }}>Мөр №</th>
            <th className="py-1.5 px-2">ҮЗҮҮЛЭЛТ</th>
            <th className="py-1.5 px-2 text-right" style={{ width: 140 }}>Энэ жил (₮)</th>
            <th className="py-1.5 px-2 text-right" style={{ width: 140 }}>Өмнөх жил (₮)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
          {rows.map((r) => (
            <tr key={r.no} className={r.bold ? 'bg-slate-100 dark:bg-white/[0.03]' : ''}>
              <td className={`py-1.5 px-2 ${r.bold ? 'font-semibold' : ''}`}>{r.no}</td>
              <td className={`py-1.5 px-2 ${r.bold ? 'font-semibold' : ''}`}>{r.label}</td>
              <td className={`py-1.5 px-2 text-right ${r.bold ? 'font-semibold' : ''}`}>{r.value !== null ? `${formatMoney(r.value)}₮` : ''}</td>
              <td className={`py-1.5 px-2 text-right ${r.bold ? 'font-semibold' : ''}`}>{r.priorValue !== null ? `${formatMoney(r.priorValue)}₮` : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="text-[13px] font-semibold mt-1 mb-1">А МАЯГТ — САНХҮҮГИЙН БАЙДЛЫН ТАЙЛАН</div>
      <div className="text-[12px] text-mutedtext mb-3">
        Сангийн сайдын 2017.12.28-ны 386 дугаар тушаалын 3-р хавсралт ("Санхүүгийн тайлангийн А маягт")-ын "Санхүүгийн байдлын тайлан" хэсгийн ЯГ мөрийн дугаар, бүтцээр үзүүлэв. "Өмнөх жил" багана нь өмнөх жилийн 12-р сарын 31-ний өдрийн байдлаарх үлдэгдэл. Манай систем одоог хүртэл тусад нь хөтлөдөггүй зарим мөр (Найдваргүй авлагын хасагдуулга, Урт хугацаат зээл) 0 гэж үнэн зөвөөр харагдана.
      </div>
      {renderTable(f1Rows)}
      <div className={`ds-card p-3 mt-3 text-center text-[13px] font-semibold ${isBalanced ? 'text-customGreen' : 'text-customRed'}`}>
        {isBalanced ? '✓ Тэнцэл тэнцсэн' : '⚠ Тэнцэл тэнцээгүй'} (1.3 = 2.4: {formatMoney(cur.totalAssets)}₮ vs {formatMoney(cur.totalLiabilities + cur.netAssetsTotal)}₮)
      </div>

      <div className="text-[13px] font-semibold mt-6 mb-1">Б МАЯГТ — ҮР ДҮНГИЙН ТАЙЛАН</div>
      <div className="text-[12px] text-mutedtext mb-3">
        ЯГ адил тушаалын "үр дүнгийн тайлан" хэсгийн мөрийн дугаараар (1-41). "Энэ жил"/"Eмнөх жил" баганууд нь ЗӨВХӨН тухайн жилийн (1-р сарын 1-нээс) гүйлгээгээр тооцоологдоно (систем эхэлсэн цагаас хойших хуримтлагдсан нийлбэр биш). Гишүүдийн татварыг (2-р мөр) тусад нь ялгаж хөтөлдөг боловч, зарим бусад дэд ангиллыг (Хөтөлбөр орлого, Тохижилт/Цэвэрлэгээ зэрэг тусгай зардал) тусад нь ялгаж хөтөлдөггүй тул "Бусад орлого"/"Бусад зардал" мөрүүдэд нэгтгэсэн болно.
      </div>
      {renderTable(f2Rows)}

      <div className="text-[13px] font-semibold mt-6 mb-1">В МАЯГТ — МӨНГӨН ГҮЙЛГЭЭНИЙ ТАЙЛАН</div>
      <div className="text-[12px] text-mutedtext mb-3">
        ЯГ адил тушаалын "Мөнгөн гүйлгээний тайлан" хэсгийн мөрийн дугаараар. "Энэ жил"/"Өмнөх жил" баганууд нь ЗӨВХӨН тухайн жилийн (1-р сарын 1-нээс) гүйлгээгээр тооцоологдоно (5, 6-р мөр л цаг хугацааны хязгаарлалтгүй, хуримтлагдсан данс үлдэгдэл хэвээрээ). "Шууд арга"-аар (direct method): journal_entries бүрийг үзэж, тухайн бичилт доторх Мөнгөн хөрөнгийн цэвэр өөрчлөлтийг эсрэг дансны кодоор нь харгалзах дэд мөрт хуваарилна. Манай систем зарим дэд мөрийг (Төсөл/хөтөлбөр, Бэлэг хандив, Хөрөнгө оруулалтын дэлгэрэнгүй, Санхүүгийн зээл/хүү) тусад нь хөтлөдөггүй тул 0 гэж үнэн зөвөөр харагдана.
      </div>
      {renderTable(f3Rows)}

      <div className="text-[13px] font-semibold mt-6 mb-1">Г МАЯГТ — ЦЭВЭР ХӨРӨНГИЙН ӨӨРЧЛӨЛТИЙН ТАЙЛАН (энгийн хувилбар)</div>
      <div className="text-[12px] text-mutedtext mb-3">
        Албан ёсны маягт 6 багана (Хязгаарлалтгүй нөөц, Хязгаарлалттай нөөц, Дахин үнэлгээний нэмэгдэл, Гадаад валютын хөрвүүлэлтийн нөөц, Хуримтлагдсан үр дүн, Нийт дүн)-тай ч, манай систем зөвхөн "Хуримтлалын сан" (Хязгаарлалтгүй нөөц) БОЛОН тайлант үеийн үр дүнг л хөтлөдэг тул, энгийн болгож 4 мөрт нэгтгэв (Үеийн эхний үлдэгдэл → Хуримтлалын санд гарсан шууд өөрчлөлт → Тайлант үеийн (зөвхөн энэ жилийн) цэвэр үр дүн → Үеийн эцсийн үлдэгдэл). Бусад 3 багана (Хязгаарлалттай нөөц гэх мэт) манай tenant-үүдэд хараахан ашиглагдаагүй.
      </div>
      {renderTable(f4Rows)}
    </div>
  );
}

function EquityChangesTab({ hoaId }) {
  const { accounts, loading: accountsLoading } = useChartOfAccounts(hoaId);
  const { lines, loading } = useAllJournalLines(hoaId);

  if (loading || accountsLoading) return <div className="ds-card p-6 text-center text-mutedtext text-[12px]">Ачаалж байна...</div>;

  const equityAccounts = accounts.filter((a) => a.category === 'equity');
  const equityRows = equityAccounts.map((acc) => {
    const accLines = lines.filter((l) => l.account_code === acc.code);
    const additions = accLines.reduce((s, l) => s + Number(l.credit), 0);
    const deductions = accLines.reduce((s, l) => s + Number(l.debit), 0);
    return { acc, additions, deductions, balance: additions - deductions };
  }).filter((r) => r.additions !== 0 || r.deductions !== 0);

  const incomeTotal = accounts.filter((a) => a.category === 'income').reduce((s, acc) => s + accountBalance(acc, lines).balance, 0);
  const expenseTotal = accounts.filter((a) => a.category === 'expense').reduce((s, acc) => s + accountBalance(acc, lines).balance, 0);
  const netResult = incomeTotal - expenseTotal;

  const totalAdditions = equityRows.reduce((s, r) => s + r.additions, 0);
  const totalDeductions = equityRows.reduce((s, r) => s + r.deductions, 0);
  const totalEndingEquity = equityRows.reduce((s, r) => s + r.balance, 0) + netResult;

  return (
    <div>
      <div className="text-[12px] text-mutedtext mb-3">
        Эздийн эрхийн (Хуримтлалын сан гэх мэт) данс тус бүрийн нэмэгдэл, хасагдлыг харуулна. Тайлант үеийн цэвэр ашиг/алдагдал одоог хүртэл Эздийн эрх рүү албан ёсоор хаагдаагүй тул тусад нь мэдээллийн зорилгоор харуулав.
      </div>
      <div className="ds-card p-3">
        <table className="ds-table w-full">
          <thead>
            <tr>
              <th className="py-1.5 px-2">ДАНС</th>
              <th className="py-1.5 px-2 text-right">НЭМЭГДЭЛ</th>
              <th className="py-1.5 px-2 text-right">ХАСАГДАЛ</th>
              <th className="py-1.5 px-2 text-right">ҮЛДЭГДЭЛ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
            {equityRows.length === 0 ? (
              <tr><td colSpan={4} className="py-3 text-center text-mutedtext text-[12px]">Эздийн эрхийн бичилт бүртгэгдээгүй байна</td></tr>
            ) : equityRows.map((r) => (
              <tr key={r.acc.id}>
                <td className="py-1.5 px-2">{r.acc.code} — {r.acc.name}</td>
                <td className="py-1.5 px-2 text-right">{r.additions > 0 ? `${formatMoney(r.additions)}₮` : '—'}</td>
                <td className="py-1.5 px-2 text-right">{r.deductions > 0 ? `${formatMoney(r.deductions)}₮` : '—'}</td>
                <td className="py-1.5 px-2 text-right font-semibold">{formatMoney(r.balance)}₮</td>
              </tr>
            ))}
            <tr>
              <td className="py-1.5 px-2">Тайлант үеийн (хаагдаагүй) цэвэр {netResult >= 0 ? 'ашиг' : 'алдагдал'}</td>
              <td className="py-1.5 px-2 text-right">—</td>
              <td className="py-1.5 px-2 text-right">—</td>
              <td className="py-1.5 px-2 text-right font-semibold">{formatMoney(netResult)}₮</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 dark:border-bordercol bg-slate-100 dark:bg-white/[0.03] font-semibold">
              <td className="py-1.5 px-2">НИЙТ</td>
              <td className="py-1.5 px-2 text-right">{formatMoney(totalAdditions)}₮</td>
              <td className="py-1.5 px-2 text-right">{formatMoney(totalDeductions)}₮</td>
              <td className="py-1.5 px-2 text-right">{formatMoney(totalEndingEquity)}₮</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// 2026-09-22 (63): НББ стандарт нийцүүлэлт (2-р зүйл) — Хугацааны
// хаалт (period locking). Хаагдсан тайлант үе бүрийг жагсааж,
// шинэ үе хаах, эсвэл (зөвхөн эрх бүхий staff/supersysadmin) буцааж
// нээх боломжтой. Бодит хориглолт нь RLS дээр (closed_periods
// migration) хэрэгждэг — ЭНЭ таб зөвхөн харагдац/удирдлагын UI.
// 2026-09-22 (65): НББ стандарт нийцүүлэлт (4-р зүйл) — Мөнгөн
// гүйлгээний тайлан (Cash Flow Statement). Стандарт 4 үндсэн санхүүгийн
// тайлангийн НЭГ, ОДОО ХҮРТЭЛ огт байхгүй байсан. "Шууд арга" (direct
// method)-аар: journal_entries бүрийг үзэж, тухайн бичилт доtorh
// Мөнгөн хөрөнгө (cash) мөрийн цэвэр eөрчлөлтийг, ТЭР ЖУРНАЛЫН
// бичилт доторх БУСАД (cash биш) мөрүүдийн ангиллаар (жин: тухайн
// мөрийн дүнгийн эзлэх хувиар) үйл ажиллагаа/хөрөнгө оруулалт/
// санхүүжилтийн 3 бүлэгт хуваарилна. Систем эхэлсэн цагаас хойших
// БҮХ гүйлгээг барьдаг тул "эхний үлдэгдэл"-ийг 0-ээс эхэлнэ гэж
// үзнэ.
function CashFlowStatementTab({ hoaId }) {
  const { accounts, loading: accountsLoading } = useChartOfAccounts(hoaId);
  const { lines, loading } = useAllJournalLines(hoaId);

  if (loading || accountsLoading) return <div className="ds-card p-6 text-center text-mutedtext text-[12px]">Ачаалж байна...</div>;

  const accountByCode = {};
  accounts.forEach((a) => { accountByCode[a.code] = a; });

  const linesByEntry = {};
  lines.forEach((l) => {
    if (!linesByEntry[l.entry_id]) linesByEntry[l.entry_id] = [];
    linesByEntry[l.entry_id].push(l);
  });

  let operatingFlow = 0, investingFlow = 0, financingFlow = 0, otherFlow = 0;

  Object.values(linesByEntry).forEach((entryLines) => {
    const cashLines = entryLines.filter((l) => accountByCode[l.account_code]?.category === 'cash');
    const nonCashLines = entryLines.filter((l) => accountByCode[l.account_code]?.category !== 'cash');
    if (cashLines.length === 0) return;
    const cashNet = cashLines.reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);
    const contraTotal = nonCashLines.reduce((s, l) => s + Number(l.debit) + Number(l.credit), 0);
    if (contraTotal === 0) return;
    nonCashLines.forEach((l) => {
      const cat = accountByCode[l.account_code]?.category;
      const weight = (Number(l.debit) + Number(l.credit)) / contraTotal;
      const share = cashNet * weight;
      if (cat === 'fixed_asset') investingFlow += share;
      else if (cat === 'equity') financingFlow += share;
      else if (cat) operatingFlow += share;
      else otherFlow += share;
    });
  });

  const totalCashNet = operatingFlow + investingFlow + financingFlow + otherFlow;
  const beginningCash = 0;
  const endingCash = beginningCash + totalCashNet;

  return (
    <div>
      <div className="text-[12px] text-mutedtext mb-3">
        Одоогийн бүх журналын бичилтэд үндэслэсэн, Мөнгөн хөрөнгийн (Касс, Харилцах) хөдөлгөөний нэгтгэсэн тайлан. "Шинэ гүйлгээ бүртгэх" үед сонгосон эсрэг дансны ангиллаар (Зардал/Орлого/Авлага/өглөг → үйл ажиллагаа, үндсэн хөрөнгө → хөрөнгө оруулалт, Хуримтлалын сан → санхүүжилт) автоматаар ангилагдана.
      </div>
      <div className="flex flex-col gap-3">
        <div className="ds-card p-3">
          <div className="flex justify-between text-[12.5px] py-0.5"><span>үйл ажиллагааны гүйлгээ</span><span>{formatMoney(operatingFlow)}₮</span></div>
          <div className="flex justify-between text-[12.5px] py-0.5"><span>Хөрөнгө оруулалтын гүйлгээ</span><span>{formatMoney(investingFlow)}₮</span></div>
          <div className="flex justify-between text-[12.5px] py-0.5"><span>Санхүүжилтийн гүйлгээ</span><span>{formatMoney(financingFlow)}₮</span></div>
          {otherFlow !== 0 && <div className="flex justify-between text-[12.5px] py-0.5"><span>Бусад</span><span>{formatMoney(otherFlow)}₮</span></div>}
          <div className="flex justify-between text-[13px] font-semibold pt-2 mt-2 border-t border-slate-200 dark:border-bordercol">
            <span>Мөнгөн хөрөнгийн цэвэр eөрчлөлт</span><span>{formatMoney(totalCashNet)}₮</span>
          </div>
        </div>
        <div className="ds-card p-3">
          <div className="flex justify-between text-[12.5px] py-0.5"><span>Эхний үлдэгдэл</span><span>{formatMoney(beginningCash)}₮</span></div>
          <div className="flex justify-between text-[13px] font-semibold pt-2 mt-2 border-t border-slate-200 dark:border-bordercol">
            <span>Эцсийн үлдэгдэл</span><span>{formatMoney(endingCash)}₮</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2026-09-22 (68): НББ стандарт нийцүүлэлт (7-р зүйл) — Тайлангийн
// тодруулга (Notes to financial statements). Мөнгө/Авлага/Орлого/
// Зардлын задаргаа мөрүүдийг journal_entries-ээс АВТОМАТААР
// тооцоолж харуулна (OfficialFormsTab-тай ЯГ ИЖИЛ sumByCategory/
// sumByCode загвар — Rule of two). Танилцуулга, НББ-ийн бодлого гэх
// мэт чөлөөт текст хэсгүүдийг зөвхөн ГАРААР бөглөж, tenant тус бүрт
// НЭГ удаа хадгална (financial_statement_notes).
function NotesTab({ hoaId }) {
  const { accounts, loading: accountsLoading } = useChartOfAccounts(hoaId);
  const { lines, loading } = useAllJournalLines(hoaId);
  const [notes, setNotes] = useState(null);
  const [form, setForm] = useState({ intro_text: '', accounting_policy_text: '', related_parties_text: '', subsequent_events_text: '' });
  const [saving, setSaving] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(true);

  useEffect(() => {
    if (!hoaId) return;
    setLoadingNotes(true);
    supabase.from('financial_statement_notes').select('*').eq('tenant_id', hoaId).maybeSingle().then(({ data }) => {
      setNotes(data);
      if (data) setForm({ intro_text: data.intro_text || '', accounting_policy_text: data.accounting_policy_text || '', related_parties_text: data.related_parties_text || '', subsequent_events_text: data.subsequent_events_text || '' });
      setLoadingNotes(false);
    });
  }, [hoaId]);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from('financial_statement_notes').upsert({ tenant_id: hoaId, ...form });
    setSaving(false);
    if (error) alert(error.message);
  }

  if (loading || accountsLoading || loadingNotes) return <div className="ds-card p-6 text-center text-mutedtext text-[12px]">Ачаалж байна...</div>;

  const breakdownFor = (cat) => accounts.filter((a) => a.category === cat).map((acc) => ({ acc, ...accountBalance(acc, lines) })).filter((r) => r.balance !== 0);
  const cashRows = breakdownFor('cash');
  const receivableRows = breakdownFor('receivable');
  const incomeRows = breakdownFor('income');
  const expenseRows = breakdownFor('expense');

  const NoteSection = ({ title, rows }) => (
    <div className="ds-card p-3">
      <div className="text-[11px] font-semibold tracking-wide text-mutedtext uppercase mb-2">{title}</div>
      {rows.length === 0 ? (
        <div className="text-[12px] text-mutedtext">Бичилт бүртгэгдээгүй байна</div>
      ) : rows.map((r) => (
        <div key={r.acc.id} className="flex justify-between text-[12.5px] py-0.5">
          <span>{r.acc.code} — {r.acc.name}</span>
          <span>{formatMoney(r.balance)}₮</span>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div className="text-[12px] text-mutedtext mb-3">
        Сангийн сайдын 386 тушаалын "Санхүүгийн тайлангийн тодруулга" хэсэгтэй нийцүүлэв. Мөнгө/Авлага/Орлого/Зардлын задаргаа автоматаар тооцоологдоно; Танилцуулга болон бусад чөлөөт хэсгийг гараар бөглөнэ.
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <NoteSection title="Мөнгө, түүнтэй адилтгах хөрэнгө" rows={cashRows} />
        <NoteSection title="Авлага" rows={receivableRows} />
        <NoteSection title="Орлого" rows={incomeRows} />
        <NoteSection title="Зардал" rows={expenseRows} />
      </div>

      <div className="ds-card p-3 mb-3">
        <div className="text-[11px] font-semibold tracking-wide text-mutedtext uppercase mb-2">Танилцуулга</div>
        <textarea className="ds-input w-full" rows={4} placeholder="Байршил, үйл ажиллагаа явуулж эхэлсэн огноо, Удирдах зөвлөлийн дарга/Гүйцэтгэх захирал, Ерөнхий нягтлан бодогчийн мэдээлэл гэх мэт..." value={form.intro_text} onChange={(e) => setForm((f) => ({ ...f, intro_text: e.target.value }))} />
      </div>
      <div className="ds-card p-3 mb-3">
        <div className="text-[11px] font-semibold tracking-wide text-mutedtext uppercase mb-2">Нягтлан бодох бүртгэлийн бодлого</div>
        <textarea className="ds-input w-full" rows={4} placeholder="Тайлангийн суурь, тайлагнасан валют, хөрөнгийн үнэлгээ, орлого/зардлыг хүлээн зөвшөөрөх бодлого гэх мэт..." value={form.accounting_policy_text} onChange={(e) => setForm((f) => ({ ...f, accounting_policy_text: e.target.value }))} />
      </div>
      <div className="ds-card p-3 mb-3">
        <div className="text-[11px] font-semibold tracking-wide text-mutedtext uppercase mb-2">Холбоотой талуудтай хийсэн ажил гүйлгээ</div>
        <textarea className="ds-input w-full" rows={3} value={form.related_parties_text} onChange={(e) => setForm((f) => ({ ...f, related_parties_text: e.target.value }))} />
      </div>
      <div className="ds-card p-3 mb-3">
        <div className="text-[11px] font-semibold tracking-wide text-mutedtext uppercase mb-2">Болзошгүй өр төлбөр ба тайлангийн өдрийн дараах үйл явдал</div>
        <textarea className="ds-input w-full" rows={3} value={form.subsequent_events_text} onChange={(e) => setForm((f) => ({ ...f, subsequent_events_text: e.target.value }))} />
      </div>
      <button className="ds-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Хадгалж байна...' : 'Хадгалах'}</button>
    </div>
  );
}

// 2026-09-23 (73): НББ үлдэгдэл засвар (4-р зүйл) — Найдваргүй
// авлага. PaymentBadges/Owners-ийн "эрсдэлтэй" (at_risk) төлөвтэй,
// хараахан журналд тооцогдоогүй нэхэмжлэхүүдийг жагсааж, сонгосон
// нэхэмжлэхүүдийг НЭГ журналын бичилтэд (Дт 7080 Найдваргүй авлагын
// зардал / Кт 1290 Найдваргүй авлагын хасагдуулга) нэгтгэж үүсгэнэ.
// Идэмпотент — bad_debt_provisions хүснэгэлд бүртгэгдсэн нэхэмжлэх
// дахин жагсаалтад орохгүй.
function BadDebtTab({ hoaId }) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [atRiskDays, setAtRiskDays] = useState(180);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    if (!hoaId) return;
    setLoading(true);
    setError('');
    const [{ data: settingsRow }, { data: invRows }, { data: provRows }] = await Promise.all([
      supabase.from('fin_settings').select('at_risk_days').eq('tenant_id', hoaId).maybeSingle(),
      fetchAllRows(() => supabase.from('invoices').select('id, target_type, target_id, total_amount, status, sent_at, period_year, period_month').eq('tenant_id', hoaId).in('status', ['sent', 'overdue'])),
      fetchAllRows(() => supabase.from('bad_debt_provisions').select('invoice_id').eq('tenant_id', hoaId)),
    ]);
    const riskDays = settingsRow?.at_risk_days ?? 180;
    setAtRiskDays(riskDays);
    const provisionedIds = new Set((provRows || []).map((p) => p.invoice_id));
    const now = new Date();
    const atRisk = (invRows || []).filter((inv) => {
      if (provisionedIds.has(inv.id)) return false;
      if (!inv.sent_at) return false;
      const days = Math.floor((now - new Date(inv.sent_at)) / 86400000);
      return days > riskDays;
    });
    setInvoices(atRisk);
    setSelected(new Set(atRisk.map((i) => i.id)));
    setLoading(false);
  }
  useEffect(() => { load(); }, [hoaId]);

  function toggle(id) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const selectedInvoices = invoices.filter((i) => selected.has(i.id));
  const totalAmount = selectedInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const canSave = selectedInvoices.length > 0 && !saving;

  async function handleProvision() {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      const { data: entry, error: entryErr } = await supabase.from('journal_entries').insert({
        tenant_id: hoaId, entry_date: new Date().toISOString().slice(0, 10),
        description: `Найдваргүй авлагын тооцоолол (${selectedInvoices.length} нэхэмжлэх)`, source_type: 'manual', created_by: user?.id,
      }).select().single();
      if (entryErr) { setError(entryErr.message); return; }
      const { error: linesErr } = await supabase.from('journal_entry_lines').insert([
        { entry_id: entry.id, account_code: '7080', debit: totalAmount, credit: 0 },
        { entry_id: entry.id, account_code: '1290', debit: 0, credit: totalAmount },
      ]);
      if (linesErr) { setError(linesErr.message); return; }
      const { error: provErr } = await supabase.from('bad_debt_provisions').insert(
        selectedInvoices.map((i) => ({ tenant_id: hoaId, invoice_id: i.id, amount: i.total_amount, journal_entry_id: entry.id, created_by: user?.id }))
      );
      if (provErr) { setError(provErr.message); return; }
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="text-[12px] text-mutedtext mb-3">
        "Санхүү тохиргоо &gt; НББ &gt; Төлбөрийн хоцрогдол"-д тохируулсан эрсдэлтэй хугацаа ({atRiskDays} хоног)-аас хэтэрсэн, хараахан журналд тооцогдоогүй нэхэмжлэхүүд. Сонгосон нэхэмжлэхүүдийг Найдваргүй авлага гэж тооцож, журналын бичилт (Дт "Найдваргүй авлагын зардал" / Кт "Найдваргүй авлагын хасагдуулга") үүсгэнэ.
      </div>
      {loading ? (
        <div className="ds-card p-6 text-center text-mutedtext text-[12px]">Ачаалж байна...</div>
      ) : invoices.length === 0 ? (
        <div className="ds-card p-6 text-center text-mutedtext text-[12px]">Эрсдэлтэй, хараахан тооцогдоогүй нэхэмжлэх алга</div>
      ) : (
        <>
          <div className="flex flex-col gap-2 mb-3">
            {invoices.map((inv) => (
              <label key={inv.id} className="ds-card p-3 flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={selected.has(inv.id)} onChange={() => toggle(inv.id)} />
                <span className="flex-1">{inv.target_type === 'client' ? 'Талбай өмчлөгч' : 'Өмчлөгч'} — {inv.period_year} оны {inv.period_month}-р сар</span>
                <span className="font-medium">{formatMoney(inv.total_amount)}₮</span>
              </label>
            ))}
          </div>
          <button className="ds-btn-primary" onClick={handleProvision} disabled={!canSave}>
            {saving ? 'Хадгалж байна...' : `Найдваргүй гэж тооцох (${formatMoney(totalAmount)}₮)`}
          </button>
        </>
      )}
      {error && <div className="text-[12px] text-customRed mt-2">{error}</div>}
    </div>
  );
}

function ClosedPeriodsTab({ hoaId }) {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    if (!hoaId) return;
    setLoading(true);
    const { data } = await supabase.from('closed_periods').select('*').eq('tenant_id', hoaId).order('period_year', { ascending: false }).order('period_month', { ascending: false });
    setPeriods(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [hoaId]);

  async function handleClose() {
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('closed_periods').insert({ tenant_id: hoaId, period_year: +year, period_month: +month });
    if (err) { setError(err.message); setSaving(false); return; }
    setSaving(false);
    load();
  }

  async function handleReopen(id) {
    const { error: err } = await supabase.from('closed_periods').delete().eq('id', id);
    if (err) { setError(err.message); return; }
    load();
  }

  return (
    <div>
      <div className="text-[12px] text-mutedtext mb-3">
        Хаагдсан тайлант үед (сар) шинэ гүйлгээ бүртгэх, засах, устгах ХОРИГЛОГДОНО — энэ нь Нягтлан бодох бүртгэлийн стандарт зарчим бөгөөд, тайлант үе дууссаны дараа санамсаргүй eөрчлөлт орохоос сэргийлнэ.
      </div>
      <div className="ds-card p-3 mb-4 flex items-end gap-2">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Он</label>
          <input type="number" className="ds-input" style={{ width: 100 }} value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Сар</label>
          <select className="ds-select" style={{ width: 100 }} value={month} onChange={(e) => setMonth(e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <button className="ds-btn-primary" onClick={handleClose} disabled={saving}>{saving ? 'Хаагдаж байна...' : 'Тайлант үеийг хаах'}</button>
      </div>
      {error && <div className="text-[12px] text-customRed mb-2">{error}</div>}
      {loading ? (
        <div className="ds-card p-6 text-center text-mutedtext text-[12px]">Ачаалж байна...</div>
      ) : periods.length === 0 ? (
        <div className="ds-card p-6 text-center text-mutedtext text-[12px]">Хаагдсан тайлант үе алга</div>
      ) : (
        <div className="flex flex-col gap-2">
          {periods.map((p) => (
            <div key={p.id} className="ds-card p-3 flex items-center justify-between">
              <span className="text-[13px]">{p.period_year} оны {p.period_month}-р сар — хаагдсан</span>
              <button className="ds-btn-secondary" onClick={() => handleReopen(p.id)}>Буцааж нээх</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Accounting() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const [tab, setTab] = useState('coa');

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <TabButton active={tab === 'coa'} onClick={() => setTab('coa')}>Дансны төлөвлөгөө</TabButton>
        <TabButton active={tab === 'journal'} onClick={() => setTab('journal')}>Журналын бичилт</TabButton>
        <TabButton active={tab === 'balance'} onClick={() => setTab('balance')}>Тэнцвэржүүлсэн тайлан</TabButton>
        <TabButton active={tab === 'income'} onClick={() => setTab('income')}>Орлого, зарлагын тайлан</TabButton>
        <TabButton active={tab === 'balancesheet'} onClick={() => setTab('balancesheet')}>Тэнцэл</TabButton>
        <TabButton active={tab === 'cashflow'} onClick={() => setTab('cashflow')}>Мөнгөн гүйлгээний тайлан</TabButton>
        <TabButton active={tab === 'equity'} onClick={() => setTab('equity')}>Эздийн эрхийн өөрчлөлт</TabButton>
        <TabButton active={tab === 'official'} onClick={() => setTab('official')}>Албан ёсны А/Б маягт</TabButton>
        <TabButton active={tab === 'notes'} onClick={() => setTab('notes')}>Тайлангийн тодруулга</TabButton>
        <TabButton active={tab === 'baddebt'} onClick={() => setTab('baddebt')}>Найдваргүй авлага</TabButton>
        <TabButton active={tab === 'periods'} onClick={() => setTab('periods')}>Тайлант үеийн хаалт</TabButton>
      </div>
      {tab === 'coa' && <ChartOfAccountsTab hoaId={hoaId} />}
      {tab === 'journal' && <JournalEntriesTab hoaId={hoaId} />}
      {tab === 'balance' && <TrialBalanceTab hoaId={hoaId} />}
      {tab === 'income' && <IncomeStatementTab hoaId={hoaId} />}
      {tab === 'balancesheet' && <BalanceSheetTab hoaId={hoaId} />}
      {tab === 'cashflow' && <CashFlowStatementTab hoaId={hoaId} />}
      {tab === 'equity' && <EquityChangesTab hoaId={hoaId} />}
      {tab === 'official' && <OfficialFormsTab hoaId={hoaId} />}
      {tab === 'notes' && <NotesTab hoaId={hoaId} />}
      {tab === 'baddebt' && <BadDebtTab hoaId={hoaId} />}
      {tab === 'periods' && <ClosedPeriodsTab hoaId={hoaId} />}
    </div>
  );
}
