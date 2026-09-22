import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { fetchAllRows } from '../lib/fetchAllRows';
import { formatMoney, formatDateTimeMinutes } from '../lib/format';
import TabButton from '../components/TabButton';
import Modal from '../components/Modal';
import { useChartOfAccounts } from '../hooks/useChartOfAccounts';

// 2026-09-09: Журналын бүх мөрийг татах логикийг НЭГ л газраас
// (Rule of two) — Тэнцвэржүүлсэн тайлан, Орлого зарлагын тайлан,
// Тэнцэл 3 таб бүгд ЭНЭ hook-ыг ашиглана.
function useAllJournalLines(hoaId) {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!hoaId) return;
    setLoading(true);
    fetchAllRows(() => supabase.from('journal_entry_lines').select('*, journal_entries!inner(tenant_id)').eq('journal_entries.tenant_id', hoaId)).then(({ data }) => {
      setLines(data || []);
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

function JournalEntriesTab({ hoaId }) {
  const { accounts, accountLabel } = useChartOfAccounts(hoaId);
  const [entries, setEntries] = useState([]);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [adding, setAdding] = useState(false);
  const [reversing, setReversing] = useState(null);

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
        description: `Буцаалт: ${entry.description}`, source_type: 'manual', reverses_entry_id: entry.id,
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
          Энд "Ажилтны бүртгэл → Цалингийн тооцоолол → Цалин төлөх" дарахад автоматаар үүссэн, мөн "+ Шинэ гүйлгээ бүртгэх" товчоор гараар оруулсан журналын бичилтүүд харагдана. НББ стандартын дагуу, бичигдсэн бичилтийг шууд засах/устгах боломжгүй — зөвхөн "Буцаах" товчоор алдааг залруулна.
        </div>
        <button className="ds-btn-primary shrink-0 ml-3" onClick={() => setAdding(true)}>+ Шинэ гүйлгээ бүртгэх</button>
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
        tenant_id: hoaId, entry_date: entryDate, description: description.trim(), source_type: 'manual',
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
// Ф1 (Санхүүгийн байдлын тайлан) маягт. Сангийн сайдын 2017.386
// тушаалын 3-р хавсралтаас үзүүлсэн ЯГ мөрийн дугаар, нэрээр
// (1, 1.1, 1.1.1...1.1.8, 1.2, 1.2.1...2.4) баганалж, манай дансны
// үлдэгдлүүдийг харгалзах мөрт тавьна. Манай систем одоо хүртэл
// ялгаж хөтлөдэггүй зарим мөр (Найдваргүй авлагын хасагдуулга,
// Хуримтлагдсан элэгдэл — Элэгдлийн автомат тооцоолол хараахан
// хийгдээгүй тул, Урт хугацаат зээл гэх мэт) 0 гэж үнэн зөвөөр
// үзүүлнэ — үүнийг хөвөөтөй мөрт тэмдэглэсэн.
function officialRow(no, label, value, opts) {
  const bold = opts?.bold;
  return { no, label, value, bold };
}
function OfficialFormsTab({ hoaId }) {
  const { accounts, loading: accountsLoading } = useChartOfAccounts(hoaId);
  const { lines, loading } = useAllJournalLines(hoaId);

  if (loading || accountsLoading) return <div className="ds-card p-6 text-center text-mutedtext text-[12px]">Ачаалж байна...</div>;

  const sumByCategory = (cat) => accounts.filter((a) => a.category === cat).reduce((s, acc) => s + accountBalance(acc, lines).balance, 0);
  const sumByCode = (code) => {
    const acc = accounts.find((a) => a.code === code);
    return acc ? accountBalance(acc, lines).balance : 0;
  };

  const cash = sumByCategory('cash');
  const shortTermInvestment = sumByCategory('short_term_investment');
  const receivable = sumByCategory('receivable');
  const inventory = sumByCategory('inventory');
  const prepaidExpense = sumByCategory('prepaid_expense');
  const currentAssetsTotal = cash + shortTermInvestment + receivable + inventory + prepaidExpense;

  const fixedAssetGross = sumByCode('2010');
  const accumulatedDepreciation = sumByCode('2020');
  const nonCurrentAssetsTotal = sumByCategory('fixed_asset');
  const totalAssets = currentAssetsTotal + nonCurrentAssetsTotal;

  const salaryPayable = sumByCode('3130');
  const taxPayable = sumByCode('3110') + sumByCode('3120');
  const deferredIncome = sumByCode('3210');
  const otherPayable = sumByCode('3310');
  const accountsPayable = sumByCategory('payable') - salaryPayable - taxPayable - deferredIncome - otherPayable;
  const currentLiabTotal = accountsPayable + salaryPayable + taxPayable + deferredIncome + otherPayable;
  const totalLiabilities = currentLiabTotal;

  const incomeTotal = sumByCategory('income');
  const expenseTotal = sumByCategory('expense');
  const netResult = incomeTotal - expenseTotal;
  const reserveUnrestricted = sumByCategory('equity');
  const netAssetsTotal = reserveUnrestricted + netResult;

  const f1Rows = [
    officialRow('1', 'ХӨРӨНГӨ', null, { bold: true }),
    officialRow('1.1', 'Эргэлтийн хөрэнгө', null, { bold: true }),
    officialRow('1.1.1', 'Мөнгө, түүнтэй адилтгах хөрэнгө', cash),
    officialRow('1.1.2', 'Богино хугацаат хөрэнгө оруулалт', shortTermInvestment),
    officialRow('1.1.3', 'Дансны авлага', receivable),
    officialRow('1.1.4', 'Найдваргүй авлагын хасагдуулга', 0),
    officialRow('1.1.5', 'Бараа материал', inventory),
    officialRow('1.1.6', 'Урьдчилж төлсэн зардал/тооцоо', prepaidExpense),
    officialRow('1.1.7', 'Бусад эргэлтийн хөрэнгө', 0),
    officialRow('1.1.8', 'Эргэлтийн хөрэнгийн дүн', currentAssetsTotal, { bold: true }),
    officialRow('1.2', 'Эргэлтийн бус хөрэнгө', null, { bold: true }),
    officialRow('1.2.1', 'үндсэн хөрэнгө', fixedAssetGross),
    officialRow('1.2.2', 'Хуримтлагдсан элэгдэл', accumulatedDepreciation),
    officialRow('1.2.3', 'Бусад үндсэн хөрэнгө', 0),
    officialRow('1.2.5', 'Биет бус хөрэнгө', 0),
    officialRow('1.2.7', 'Хөрэнгө оруулалт ба бусад хөрэнгө', 0),
    officialRow('1.2.8', 'Эргэлтийн бус хөрэнгийн дүн', nonCurrentAssetsTotal, { bold: true }),
    officialRow('1.3', 'НИЙТ ХӨРӨНГИЙН ДҮН', totalAssets, { bold: true }),
    officialRow('2', 'ӨР ТӨЛБӨР БА ЦЭВЭР ХӨРӨНГӨ', null, { bold: true }),
    officialRow('2.1', 'өр төлбөр', null, { bold: true }),
    officialRow('2.1.1', 'Богино хугацаат өр төлбэр', null, { bold: true }),
    officialRow('2.1.1.1', 'Дансны өглөг', accountsPayable),
    officialRow('2.1.1.2', 'Цалингийн өглөг', salaryPayable),
    officialRow('2.1.1.3', 'Татварын өр', taxPayable),
    officialRow('2.1.1.4', 'Богино хугацаат зээл', 0),
    officialRow('2.1.1.5', 'Урьдчилж орсон орлого', deferredIncome),
    officialRow('2.1.1.6', 'Бусад өглөг', otherPayable),
    officialRow('2.1.1.7', 'Богино хугацаат өр төлбөрийн дүн', currentLiabTotal, { bold: true }),
    officialRow('2.1.2', 'Урт хугацаат өр төлбэр', 0),
    officialRow('2.2', 'өр төлбөрийн нийт дүн', totalLiabilities, { bold: true }),
    officialRow('2.3', 'Цэвэр хөрэнгө', null, { bold: true }),
    officialRow('2.3.1', 'Нөөц: а) хязгаарлалтгүй', reserveUnrestricted),
    officialRow('2.3.2', 'б) хязгаарлалттай', 0),
    officialRow('2.3.3', 'Дахин үнэлгээний нэмэгдэл', 0),
    officialRow('2.3.5', 'Хуримтлагдсан үр дүн (тайлант үеийн)', netResult),
    officialRow('2.3.6', 'Цэвэр хөрэнгийн дүн', netAssetsTotal, { bold: true }),
    officialRow('2.4', 'ӨР ТӨЛБӨР БА ЦЭВЭР ХӨРӨНГИЙН ДҮН', totalLiabilities + netAssetsTotal, { bold: true }),
  ];

  const isBalanced = Math.abs(totalAssets - (totalLiabilities + netAssetsTotal)) < 1;

  // 2026-09-22 (67, үргэлжлүүлэлт): Ф2 (үр дүнгийн тайлан) — ЯГ
  // адил албан ёсны 3-р хавсралтын мөрийн дугаараар (1-41). Манай
  // тодорхой дансуудыг (5410 Түрээс→5-р мөр, 5610 Бусад орлого→7-р
  // мөр, 7010 Цалин→17-р мөр, 7020 НДШ→18-р мөр, 7030 Засвар→19-р
  // мөр) харгалзах мөрт нь тавьж, үлдсэн БҮХ орлого/зардлыг "Бусад"
  // (7-р/31-р мөр)-т нэгтгэнэ.
  const rentIncome = sumByCode('5410');
  const otherIncomeExplicit = sumByCategory('income') - rentIncome;
  const operatingIncomeTotal = rentIncome + otherIncomeExplicit;

  const salaryExpense = sumByCode('7010');
  const socialInsuranceExpense = sumByCode('7020');
  const maintenanceExpense = sumByCode('7030');
  const depreciationExpense = sumByCode('7070');
  const otherExpenseExplicit = sumByCategory('expense') - salaryExpense - socialInsuranceExpense - maintenanceExpense - depreciationExpense;
  const operatingExpenseTotal = salaryExpense + socialInsuranceExpense + maintenanceExpense + depreciationExpense + otherExpenseExplicit;

  const operatingResult = operatingIncomeTotal - operatingExpenseTotal;
  const netResultF2 = operatingResult;

  const f2Rows = [
    officialRow('1', 'Үндсэн үйл ажиллагааны орлого', null, { bold: true }),
    officialRow('2', 'Гишүүдийн татвар', 0),
    officialRow('3', 'Хөтөлбөр, төслийн орлого', 0),
    officialRow('4', 'Бэлэг, хандив, тусламжийн орлого', 0),
    officialRow('5', 'Түрээсийн орлого', rentIncome),
    officialRow('6', 'Хөрөнгө оруулалтын орлого', 0),
    officialRow('7', 'Бусад орлого', otherIncomeExplicit),
    officialRow('8', 'Үйл ажиллагааны орлогын нийт дүн', operatingIncomeTotal, { bold: true }),
    officialRow('9', 'Үндсэн үйл ажиллагааны зардал', null, { bold: true }),
    officialRow('10', 'Бэлэг, хандив ба тусламж', 0),
    officialRow('14', 'Хөтөлбөр хэрэгжүүлсний зардал', 0),
    officialRow('15', 'Төсөл хэрэгжүүлсний зардал', 0),
    officialRow('16', 'Ерөнхий удирдлагын зардал', 0),
    officialRow('17', 'Цалин хөлс, шагнал', salaryExpense),
    officialRow('18', 'Нийгмийн даатгалын шимтгэл', socialInsuranceExpense),
    officialRow('19', 'Засвар үйлчилгээний зардал', maintenanceExpense),
    officialRow('20', 'Ашиглалтын зардал', 0),
    officialRow('21', 'Түрээсийн зардал', 0),
    officialRow('22', 'Албан томилолтын зардал', 0),
    officialRow('23', 'Тээврийн зардал', 0),
    officialRow('24', 'Элэгдлийн зардал', depreciationExpense),
    officialRow('25', 'Зар сурталчилгааны зардал', 0),
    officialRow('26', 'Шуудан холбооны зардал', 0),
    officialRow('27', 'Шатахууны зардал', 0),
    officialRow('28', 'Найдваргүй авлагын зардал', 0),
    officialRow('29', 'Шагнал, урамшууллын зардал', 0),
    officialRow('30', 'Зээлийн хүүгийн зардал', 0),
    officialRow('31', 'Бусад зардал', otherExpenseExplicit),
    officialRow('32', 'Үндсэн үйл ажиллагааны зардлын дүн', operatingExpenseTotal, { bold: true }),
    officialRow('33', 'Үндсэн үйл ажиллагааны үр дүн', operatingResult, { bold: true }),
    officialRow('34', 'Үндсэн бус үйл ажиллагааны ашиг (алдагдал)', 0),
    officialRow('38', 'Татварын зардал', 0),
    officialRow('40', 'Онцгой шинжтэй зүйлс (цэвэр дүнгээр)', 0),
    officialRow('41', 'Тайлант үеийн цэвэр үр дүн', netResultF2, { bold: true }),
  ];

  return (
    <div>
      <div className="text-[12px] text-mutedtext mb-3">
        Сангийн сайдын 2017.12.28-ны 386 дугаар тушаалын 3-р хавсралт ("Санхүүгийн тайлангийн А маягт")-ын "Санхүүгийн байдлын тайлан" хэсгийн ЯГ мөрийн дугаар, бүтцээр үзүүлэв. Манай систем одоог хүртэл тусад нь хөтлөдөггүй зарим мөр (Найдваргүй авлагын хасагдуулга, Хуримтлагдсан элэгдэл, Урт хугацаат зээл) 0 гэж үнэн зөвөөр харагдана.
      </div>
      <div className="ds-card p-3">
        <table className="ds-table w-full">
          <thead>
            <tr>
              <th className="py-1.5 px-2" style={{ width: 70 }}>Мөр №</th>
              <th className="py-1.5 px-2">ҮЗҮҮЛЭЛТ</th>
              <th className="py-1.5 px-2 text-right" style={{ width: 160 }}>Дүн (₮)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
            {f1Rows.map((r) => (
              <tr key={r.no} className={r.bold ? 'bg-slate-100 dark:bg-white/[0.03]' : ''}>
                <td className={`py-1.5 px-2 ${r.bold ? 'font-semibold' : ''}`}>{r.no}</td>
                <td className={`py-1.5 px-2 ${r.bold ? 'font-semibold' : ''}`}>{r.label}</td>
                <td className={`py-1.5 px-2 text-right ${r.bold ? 'font-semibold' : ''}`}>{r.value !== null ? `${formatMoney(r.value)}₮` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={`ds-card p-3 mt-3 text-center text-[13px] font-semibold ${isBalanced ? 'text-customGreen' : 'text-customRed'}`}>
        {isBalanced ? '✓ Тэнцэл тэнцсэн' : '⚠ Тэнцэл тэнцээгүй'} (1.3 = 2.4: {formatMoney(totalAssets)}₮ vs {formatMoney(totalLiabilities + netAssetsTotal)}₮)
      </div>

      <div className="text-[13px] font-semibold mt-6 mb-1">Ф2 — ҮР ДҮНГИЙН ТАЙЛАН</div>
      <div className="text-[12px] text-mutedtext mb-3">
        ЯГ адил тушаалын "үр дүнгийн тайлан" хэсгийн мөрийн дугаараар (1-41). Манай систем зарим дэд ангиллыг (Гишүүдийн татвар, Хөтөлбөр орлого, Тохижилт/Цэвэрлэгээ зэрэг тусгай зардал) тусад нь ялгаж хөтлөдөггүй тул "Бусад орлого"/"Бусад зардал" мөрүүдэд нэгтгэсэн болно.
      </div>
      <div className="ds-card p-3">
        <table className="ds-table w-full">
          <thead>
            <tr>
              <th className="py-1.5 px-2" style={{ width: 70 }}>Мөр №</th>
              <th className="py-1.5 px-2">ҮЗҮҮЛЭЛТ</th>
              <th className="py-1.5 px-2 text-right" style={{ width: 160 }}>Дүн (₮)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
            {f2Rows.map((r) => (
              <tr key={r.no} className={r.bold ? 'bg-slate-100 dark:bg-white/[0.03]' : ''}>
                <td className={`py-1.5 px-2 ${r.bold ? 'font-semibold' : ''}`}>{r.no}</td>
                <td className={`py-1.5 px-2 ${r.bold ? 'font-semibold' : ''}`}>{r.label}</td>
                <td className={`py-1.5 px-2 text-right ${r.bold ? 'font-semibold' : ''}`}>{r.value !== null ? `${formatMoney(r.value)}₮` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
        <TabButton active={tab === 'official'} onClick={() => setTab('official')}>Албан ёсны Ф1/Ф2 маягт</TabButton>
        <TabButton active={tab === 'notes'} onClick={() => setTab('notes')}>Тайлангийн тодруулга</TabButton>
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
      {tab === 'periods' && <ClosedPeriodsTab hoaId={hoaId} />}
    </div>
  );
}
