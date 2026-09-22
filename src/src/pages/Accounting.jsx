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
  // DELETE хийж ЧАДАХГүй (RLS-ээр хориглогдсон) — зөвхөн БУЦААХ
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

// 2026-09-22 (63): НББ стандарт нийцүүлэлт (2-р зүйл) — Хугацааны
// хаалт (period locking). Хаагдсан тайлант үе бүрийг жагсааж,
// шинэ үе хаах, эсвэл (зөвхөн эрх бүхий staff/supersysadmin) буцааж
// нээх боломжтой. Бодит хориглолт нь RLS дээр (closed_periods
// migration) хэрэгждэг — ЭНЭ таб зөвхөн харагдац/удирдлагын UI.
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
        Хаагдсан тайлант үед (сар) шинэ гүйлгээ бүртгэх, засах, устгах ХОРИГЛОГДОНО — энэ нь Нягтлан бодох бүртгэлийн стандарт зарчим бөгeeд, тайлант үе дууссаны дараа санамсаргүй eeрчлөлт орохоос сэргийлнэ.
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
        <TabButton active={tab === 'periods'} onClick={() => setTab('periods')}>Тайлант үеийн хаалт</TabButton>
      </div>
      {tab === 'coa' && <ChartOfAccountsTab hoaId={hoaId} />}
      {tab === 'journal' && <JournalEntriesTab hoaId={hoaId} />}
      {tab === 'balance' && <TrialBalanceTab hoaId={hoaId} />}
      {tab === 'income' && <IncomeStatementTab hoaId={hoaId} />}
      {tab === 'balancesheet' && <BalanceSheetTab hoaId={hoaId} />}
      {tab === 'periods' && <ClosedPeriodsTab hoaId={hoaId} />}
    </div>
  );
}
