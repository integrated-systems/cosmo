import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { fetchAllRows } from '../lib/fetchAllRows';
import { formatMoney, formatDateTimeMinutes } from '../lib/format';
import TabButton from '../components/TabButton';
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
      </div>
      {tab === 'coa' && <ChartOfAccountsTab hoaId={hoaId} />}
      {tab === 'journal' && <JournalEntriesTab hoaId={hoaId} />}
      {tab === 'balance' && <TrialBalanceTab hoaId={hoaId} />}
      {tab === 'income' && <IncomeStatementTab hoaId={hoaId} />}
      {tab === 'balancesheet' && <BalanceSheetTab hoaId={hoaId} />}
    </div>
  );
}
