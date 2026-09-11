import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { fetchAllRows } from '../lib/fetchAllRows';
import { formatMoney, formatDateTimeMinutes } from '../lib/format';
import TabButton from '../components/TabButton';
import { useChartOfAccounts } from '../hooks/useChartOfAccounts';

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
  const { accountLabel } = useChartOfAccounts(hoaId);
  const [entries, setEntries] = useState([]);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!hoaId) return;
    setLoading(true);
    Promise.all([
      fetchAllRows(() => supabase.from('journal_entries').select('*').eq('tenant_id', hoaId).order('entry_date', { ascending: false }).order('created_at', { ascending: false })),
      fetchAllRows(() => supabase.from('journal_entry_lines').select('*, journal_entries!inner(tenant_id)').eq('journal_entries.tenant_id', hoaId)),
    ]).then(([{ data: entryRows }, { data: lineRows }]) => {
      setEntries(entryRows || []);
      setLines(lineRows || []);
      setLoading(false);
    });
  }, [hoaId]);

  const linesFor = (entryId) => lines.filter((l) => l.entry_id === entryId);

  return (
    <div>
      <div className="text-[12px] text-mutedtext mb-3">
        Энд "Ажилтны бүртгэл → Цалингийн тооцоолол → Цалин төлөх" дарахад автоматаар үүссэн журналын бичилтүүд харагдана.
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
          return (
            <div key={entry.id} className="ds-card p-3">
              <button className="w-full flex items-center justify-between text-left" onClick={() => setExpanded(isOpen ? null : entry.id)}>
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">{entry.description}</div>
                  <div className="text-[11px] text-mutedtext">{formatDateTimeMinutes(entry.created_at)} · {entry.source_type === 'payroll' ? 'Цалингийн журнал' : 'Гар аргаар'}</div>
                </div>
                <div className="text-[13px] font-semibold shrink-0">{formatMoney(totalDebit)}₮</div>
              </button>
              {isOpen && (
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrialBalanceTab({ hoaId }) {
  const { accounts, loading: accountsLoading, categoryLabels } = useChartOfAccounts(hoaId);
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

  // 2026-09-09: Хөрөнгө/Зардал ангилал Дт үлдэгдэлтэй, өглөг/Эздийн
  // эрх/Орлого ангилал Кт үлдэгдэлтэй байдаг стандарт зарчим.
  const DEBIT_NORMAL_CATEGORIES = ['cash', 'short_term_investment', 'receivable', 'inventory', 'prepaid_expense', 'fixed_asset', 'expense'];

  const rows = accounts.map((acc) => {
    const accLines = lines.filter((l) => l.account_code === acc.code);
    const totalDebit = accLines.reduce((s, l) => s + Number(l.debit), 0);
    const totalCredit = accLines.reduce((s, l) => s + Number(l.credit), 0);
    if (totalDebit === 0 && totalCredit === 0) return null;
    const isDebitNormal = DEBIT_NORMAL_CATEGORIES.includes(acc.category);
    const balance = isDebitNormal ? totalDebit - totalCredit : totalCredit - totalDebit;
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

export default function Accounting() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const [tab, setTab] = useState('coa');

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <TabButton active={tab === 'coa'} onClick={() => setTab('coa')}>Дансны төлөвлөгөө</TabButton>
        <TabButton active={tab === 'journal'} onClick={() => setTab('journal')}>Журналын бичилт</TabButton>
        <TabButton active={tab === 'balance'} onClick={() => setTab('balance')}>Тэнцвэржүүлсэн тайлан</TabButton>
      </div>
      {tab === 'coa' && <ChartOfAccountsTab hoaId={hoaId} />}
      {tab === 'journal' && <JournalEntriesTab hoaId={hoaId} />}
      {tab === 'balance' && <TrialBalanceTab hoaId={hoaId} />}
    </div>
  );
}
