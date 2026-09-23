import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { fetchAllRows } from '../lib/fetchAllRows';
import { useConfirm } from '../hooks/useConfirm';
import { DeleteIcon, EditIcon } from '../components/icons/Icons';
import { formatMoney, formatDate } from '../lib/format';
import TabButton from '../components/TabButton';
import Modal from '../components/Modal';

// "Ажилтны бүртгэл" (/hrm) — 2026-09-09, Ажилтны бүртгэлийн 2-р
// үе шат. Хэрэглэгчийн хуучин "suh" системийн жишээ дэлгэцийг
// үндэслэв. Цалингийн тооцоолол (урьдчилсан)-ыг payroll_tax_settings
// болон payroll_addition_settings (1-р үе шатанд бэлдсэн) дээр
// үндэслэн тооцно.
const INSURER_TYPES = [
  { value: 'social_health', label: 'Нийгмийн болон эрүүл мэндийн даатгалд хамрагдагч' },
  { value: 'health_only', label: 'Зөвхөн эрүүл мэндийн даатгалд хамрагдагч' },
  { value: 'caregiver_or_contractor', label: 'Хүүхдээ асарч буй чөлөөтэй эх/дайчлагдагч/гэрээт судлаач' },
  { value: 'pensioner', label: 'Тэтгэвэр тогтоолгосон ажилтан' },
  { value: 'other', label: 'Бусад' },
];
const EMPLOYEE_STATUSES = [
  { value: 'active', label: 'Ажиллаж байгаа' },
  { value: 'leave', label: 'Чөлөөтэй' },
  { value: 'terminated', label: 'Ажлаас гарсан' },
];
const BANKS = ['Хаан банк', 'Голомт банк', 'Худалдаа хөгжлийн банк', 'Төрийн банк', 'Хас банк', 'Капитрон банк', 'Богд банк', 'Ард Санхүү', 'Тээвэр Хөгжлийн банк', 'М банк', 'Чингис Хаан банк'];

// 2026-09-09: Payroll тооцооллын цөм логик — Ажилтнууд болон
// Цалингийн тооцоолол (урьдчилсан) хоёр таб ХОЁУЛАА ашиглана
// (Rule of two — тоот НИЙТ ЦАЛИН/ГАРТ ОЛГОХ дүнг 2 газарт
// давхардуулж бичихгүй).
// 2026-09-13: БОДИТ АЛДАА ЗАСАВ — өмнө нь зөвхөн НДШ/ХХОАТ гэсэн
// 2 татварыг хатуу кодолсон (hardcoded) байсан тул, SUPERSYSADMIN
// шинэ татвар нэмэхэд тооцоолол огт хамрахгүй байв. Одоо
// payroll_tax_settings-ийн БҮХ идэвхтэй мврийг динамикаар (ямар ч
// тооны татвар байж болно) тооцоолдог болгов. emp.tax_overrides
// (JSONB, {код: {deduct, custom_..., reason}}), addition.
// taxable_flags (JSONB, {код: true/false}) — 2 ч тал шинэ уян
// хатан бүтэцтэй.
function computePayroll(emp, taxSettings, additionsByCode) {
  const checked = (emp.addition_codes || []).map((c) => additionsByCode[c]).filter((a) => a && a.is_active);
  const additionsTotal = checked.reduce((s, a) => s + Number(a.amount), 0);
  const grossPay = Number(emp.base_salary) + additionsTotal;
  const overrides = emp.tax_overrides || {};

  const taxBreakdown = (taxSettings || []).filter((t) => t.is_active).map((tax) => {
    const override = overrides[tax.code] || {};
    const deduct = override.deduct !== false;
    const base = Number(emp.base_salary) + checked.filter((a) => (a.taxable_flags || {})[tax.code]).reduce((s, a) => s + Number(a.amount), 0);
    let employeeAmount = 0;
    let employerAmount = 0;
    if (deduct) {
      if (tax.calc_type === 'two_party') {
        const empRate = Number(override.custom_employee_rate ?? tax.employee_rate_pct ?? 0);
        const erRate = Number(override.custom_employer_rate ?? tax.employer_rate_pct ?? 0);
        employeeAmount = base * empRate / 100;
        employerAmount = base * erRate / 100;
      } else {
        const rate = Number(override.custom_rate ?? tax.rate_pct ?? 0);
        employeeAmount = base * rate / 100;
      }
    }
    return { code: tax.code, name: tax.name, calc_type: tax.calc_type, base, deduct, employeeAmount, employerAmount, liability_account: tax.liability_account };
  });

  const totalEmployeeDeductions = taxBreakdown.reduce((s, t) => s + t.employeeAmount, 0);
  const totalEmployerAdditional = taxBreakdown.reduce((s, t) => s + t.employerAmount, 0);
  const netPay = grossPay - totalEmployeeDeductions;
  const employerCost = grossPay + totalEmployerAdditional;

  return { grossPay, netPay, employerCost, taxBreakdown, totalEmployeeDeductions, totalEmployerAdditional, checkedAdditions: checked };
}

function emptyForm() {
  return {
    last_name: '', first_name: '', parent_name: '', register_no: '',
    citizenship: 'Монгол', occupation_code: '', insurer_type: 'social_health',
    civil_reg_no: '', home_address: '', position_id: '', base_salary: '',
    addition_codes: [], tax_overrides: {},
    hire_date: new Date().toISOString().slice(0, 10), status: 'active',
    phone: '', email: '', bank: '', iban: '', account_no: '', notes: '',
  };
}

function EmployeeModal({ open, onClose, editing, form, setForm, positions, additions, taxSettings, onSave }) {
  if (!form) return null;
  function toggleAddition(code) {
    setForm((f) => ({
      ...f,
      addition_codes: f.addition_codes.includes(code) ? f.addition_codes.filter((c) => c !== code) : [...f.addition_codes, code],
    }));
  }
  function updateTaxOverride(code, patch) {
    setForm((f) => ({
      ...f,
      tax_overrides: { ...f.tax_overrides, [code]: { ...(f.tax_overrides[code] || {}), ...patch } },
    }));
  }
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Ажилтан засах' : 'Ажилтан нэмэх'} size="lg">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] text-mutedtext mb-1">Ургийн овог</div>
            <input className="ds-input w-full" value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
          </div>
          <div>
            <div className="text-[11px] text-mutedtext mb-1">Өөрийн нэр</div>
            <input className="ds-input w-full uppercase" value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} />
          </div>
        </div>
        <div>
          <div className="text-[11px] text-mutedtext mb-1">Эцэг/эхийн нэр</div>
          <input className="ds-input w-full" value={form.parent_name} onChange={(e) => setForm((f) => ({ ...f, parent_name: e.target.value }))} />
        </div>
        <div>
          <div className="text-[11px] text-mutedtext mb-1">Регистрийн дугаар</div>
          <input className="ds-input w-full" placeholder="УБ12345678" value={form.register_no} onChange={(e) => setForm((f) => ({ ...f, register_no: e.target.value }))} />
        </div>

        <div className="ds-card p-3">
          <div className="text-[11px] font-semibold text-mutedtext uppercase mb-2">НД-7/НД-8 тайланд зориулсан нэмэлт (заавал биш)</div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-[11px] text-mutedtext mb-1">Иргэншил</div>
              <input className="ds-input w-full" value={form.citizenship} onChange={(e) => setForm((f) => ({ ...f, citizenship: e.target.value }))} />
            </div>
            <div>
              <div className="text-[11px] text-mutedtext mb-1">Ажил, мэргэжлийн ангиллын код</div>
              <input className="ds-input w-full" placeholder="жиш: 4321" value={form.occupation_code} onChange={(e) => setForm((f) => ({ ...f, occupation_code: e.target.value }))} />
            </div>
          </div>
          <div>
            <div className="text-[11px] text-mutedtext mb-1">Даатгуулагчийн төрөл</div>
            <select className="ds-select w-full" value={form.insurer_type} onChange={(e) => setForm((f) => ({ ...f, insurer_type: e.target.value }))}>
              {INSURER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <div className="text-[11px] text-mutedtext mb-1">Иргэний бүртгэлийн дугаар (ИБД=ТТД=НДД)</div>
          <input className="ds-input w-full" placeholder="Иргэний үнэмлэхийн QR, эсвэл e-barimt апп доторх ТТД дугаар" value={form.civil_reg_no} onChange={(e) => setForm((f) => ({ ...f, civil_reg_no: e.target.value }))} />
        </div>
        <div>
          <div className="text-[11px] text-mutedtext mb-1">Гэрийн хаяг</div>
          <input className="ds-input w-full" placeholder="Хороо, байр, тоот г.м." value={form.home_address} onChange={(e) => setForm((f) => ({ ...f, home_address: e.target.value }))} />
        </div>
        <div>
          <div className="text-[11px] text-mutedtext mb-1">Албан тушаал</div>
          <select className="ds-select w-full" value={form.position_id} onChange={(e) => setForm((f) => ({ ...f, position_id: e.target.value }))}>
            <option value="">— Албан тушаал сонгох —</option>
            {positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <div className="text-[11px] text-mutedtext mb-1">Үндсэн цалин (сар)</div>
          <input type="number" className="ds-input w-full" value={form.base_salary} onChange={(e) => setForm((f) => ({ ...f, base_salary: e.target.value }))} />
        </div>

        {additions.length > 0 && (
          <div>
            <div className="text-[11px] text-mutedtext mb-1.5">Нэмэгдэл (Хоол/Унаа/Утас — дүн глобаль тохиргооноор тодорхойлогдоно)</div>
            <div className="flex flex-col gap-1.5">
              {additions.map((a) => (
                <label key={a.code} className="flex items-start gap-2 text-[12.5px]">
                  <input type="checkbox" className="mt-0.5" checked={form.addition_codes.includes(a.code)} onChange={() => toggleAddition(a.code)} />
                  <span>
                    {a.name}
                    <span className="text-mutedtext"> ({formatMoney(a.amount)}₮ / {a.frequency === 'monthly' ? 'сар бүр' : a.frequency === 'quarterly' ? 'улирал бүр' : 'жилд нэг удаа'} — "Нэмэгдэл"-с тохируулна)</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="text-[11px] text-mutedtext mb-1.5">Цалингаас суутгах татвар/шимтгэл</div>
          <div className="flex flex-col gap-3">
            {taxSettings.map((tax) => {
              const ov = form.tax_overrides[tax.code] || {};
              const deduct = ov.deduct !== false;
              return (
                <div key={tax.code} className="ds-card p-3">
                  <label className="flex items-center gap-2 text-[12.5px]">
                    <input type="checkbox" checked={deduct} onChange={(e) => updateTaxOverride(tax.code, { deduct: e.target.checked })} />
                    {tax.name} суутгах
                  </label>
                  {!deduct ? (
                    <input className="ds-input w-full mt-2" placeholder="Шалтгаан (жиш: Тэтгэврийн насны, НДШ дүүргэсэн)" value={ov.reason || ''} onChange={(e) => updateTaxOverride(tax.code, { reason: e.target.value })} />
                  ) : (
                    <>
                      <label className="flex items-center gap-2 text-[12.5px] mt-2 ml-6">
                        <input type="checkbox" checked={!!ov.use_custom} onChange={(e) => updateTaxOverride(tax.code, { use_custom: e.target.checked })} />
                        Тусгай хувь хэмжээ ашиглах
                      </label>
                      {ov.use_custom && (
                        tax.calc_type === 'two_party' ? (
                          <div className="flex gap-2 mt-2 ml-6">
                            <div className="flex items-center gap-1.5">
                              <input type="number" step="0.1" className="ds-input w-20" placeholder={String(tax.employee_rate_pct ?? '')} value={ov.custom_employee_rate ?? ''} onChange={(e) => updateTaxOverride(tax.code, { custom_employee_rate: e.target.value })} />
                              <span className="text-[11px] text-mutedtext">% ажилтан</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <input type="number" step="0.1" className="ds-input w-20" placeholder={String(tax.employer_rate_pct ?? '')} value={ov.custom_employer_rate ?? ''} onChange={(e) => updateTaxOverride(tax.code, { custom_employer_rate: e.target.value })} />
                              <span className="text-[11px] text-mutedtext">% ажил олгогч</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 mt-2 ml-6">
                            <input type="number" step="0.1" className="ds-input w-20" placeholder={String(tax.rate_pct ?? '')} value={ov.custom_rate ?? ''} onChange={(e) => updateTaxOverride(tax.code, { custom_rate: e.target.value })} />
                            <span className="text-[11px] text-mutedtext">% (анхдагч: {tax.rate_pct ?? '—'}%)</span>
                          </div>
                        )
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] text-mutedtext mb-1">Ажилд орсон огноо</div>
            <input type="date" className="ds-input w-full" value={form.hire_date} onChange={(e) => setForm((f) => ({ ...f, hire_date: e.target.value }))} />
          </div>
          <div>
            <div className="text-[11px] text-mutedtext mb-1">Төлөв</div>
            <select className="ds-select w-full" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {EMPLOYEE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <div className="text-[11px] text-mutedtext mb-1">Утас</div>
          <input className="ds-input w-full" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </div>
        <div>
          <div className="text-[11px] text-mutedtext mb-1">И-мэйл</div>
          <input type="email" className="ds-input w-full" placeholder="ажилтан@жишээ.мн" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-end">
          <div>
            <div className="text-[11px] text-mutedtext mb-1">Банк</div>
            <select className="ds-select w-full" value={form.bank} onChange={(e) => setForm((f) => ({ ...f, bank: e.target.value }))}>
              <option value="">— Банк сонгох —</option>
              {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[11px] text-mutedtext mb-1">IBAN</div>
            <input className="ds-input w-24" placeholder="MN" value={form.iban} onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))} />
          </div>
          <div>
            <div className="text-[11px] text-mutedtext mb-1">Дансны дугаар</div>
            <input className="ds-input w-full" value={form.account_no} onChange={(e) => setForm((f) => ({ ...f, account_no: e.target.value }))} />
          </div>
        </div>
        <div>
          <div className="text-[11px] text-mutedtext mb-1">Тэмдэглэл</div>
          <textarea className="ds-input w-full" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>

        <div className="flex justify-end gap-2 mt-1">
          <button className="ds-btn-secondary" onClick={onClose}>Хаах</button>
          <button className="ds-btn-primary" onClick={onSave}>Хадгалах</button>
        </div>
      </div>
    </Modal>
  );
}

function EmployeeList({ employees, search, positions, loading, onEdit, onDelete, onRowClick }) {
  const positionName = (id) => positions.find((p) => p.id === id)?.name || '—';
  const filtered = employees.filter((e) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${e.last_name} ${e.first_name} ${e.parent_name} ${e.register_no}`.toLowerCase().includes(q);
  });
  const activeCount = employees.filter((e) => e.status === 'active').length;
  const totalBaseSalary = employees.filter((e) => e.status === 'active').reduce((s, e) => s + Number(e.base_salary), 0);

  return (
    <div>
      <div className="ds-table-wrap">
        <div className="flex-1 overflow-auto overscroll-contain">
          <table className="ds-table">
            <thead>
              <tr>
                <th className="py-2.5 px-3">№</th>
                <th className="py-2.5 px-3">НЭР</th>
                <th className="py-2.5 px-3">РЕГИСТР</th>
                <th className="py-2.5 px-3">ИРГЭНИЙ БүРТГЭЛИЙН ДУГААР</th>
                <th className="py-2.5 px-3">АЛБАН ТУШААЛ</th>
                <th className="py-2.5 px-3 text-right">ҮНДСЭН ЦАЛИН</th>
                <th className="py-2.5 px-3">ДАНСНЫ ДУГААР</th>
                <th className="py-2.5 px-3">АЖИЛД ОРСОН</th>
                <th className="py-2.5 px-3">ГЭРИЙН ХАЯГ</th>
                <th className="py-2.5 px-3">УТАС</th>
                <th className="py-2.5 px-3">И-МЭЙЛ</th>
                <th className="py-2.5 px-3">ТӨЛӨВ</th>
                <th className="py-2.5 px-3 text-right">ҮЙЛДЭЛ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
              {loading ? (
                <tr><td colSpan={13} className="py-6 text-center text-mutedtext">Ачаалж байна...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={13} className="py-6 text-center text-mutedtext">Ажилтан бүртгэгдээгүй байна</td></tr>
              ) : filtered.map((e, i) => (
                <tr key={e.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.03]" onClick={() => onRowClick(e)}>
                  <td className="py-2.5 px-3 text-mutedtext">{i + 1}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">{e.first_name?.toUpperCase()} {e.parent_name}</td>
                  <td className="py-2.5 px-3 text-mutedtext">{e.register_no}</td>
                  <td className="py-2.5 px-3 text-mutedtext">{e.civil_reg_no || '—'}</td>
                  <td className="py-2.5 px-3">{positionName(e.position_id)}</td>
                  <td className="py-2.5 px-3 text-right">{formatMoney(e.base_salary)}₮</td>
                  <td className="py-2.5 px-3 text-mutedtext">{e.account_no || '—'}</td>
                  <td className="py-2.5 px-3 text-mutedtext whitespace-nowrap">{e.hire_date ? formatDate(e.hire_date) : '—'}</td>
                  <td className="py-2.5 px-3 text-mutedtext">{e.home_address || '—'}</td>
                  <td className="py-2.5 px-3 text-mutedtext">{e.phone || '—'}</td>
                  <td className="py-2.5 px-3 text-mutedtext">{e.email || '—'}</td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${e.status === 'active' ? 'bg-green-500/[0.15] text-customGreen' : e.status === 'leave' ? 'bg-amber-500/[0.15] text-customOrange' : 'bg-slate-300/40 dark:bg-white/10 text-mutedtext'}`}>
                      {EMPLOYEE_STATUSES.find((s) => s.value === e.status)?.label}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <button className="ds-icon-btn" onClick={(ev) => { ev.stopPropagation(); onEdit(e); }}><EditIcon /></button>
                    <button className="ds-icon-btn danger" onClick={(ev) => { ev.stopPropagation(); onDelete(e); }}><DeleteIcon /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="text-[11.5px] text-mutedtext mt-2">
        Нийт ажилтан: {employees.length} · Ажиллаж байгаа: {activeCount} · Сарын нийт үндсэн цалин: {formatMoney(totalBaseSalary)}₮
      </div>
    </div>
  );
}

// 2026-09-09 (39): Цалин "төлөгдсөн" үед журналын бичилт (Дт/Кт)
// автоматаар үүсгэнэ. Үндсэн цалин -> 7010, ажил олгогчийн НДШ
// зардал -> 7020, Цалингийн өглөг -> 3030 (стандарт seed дансад
// үндэслэсэн тогтмол код), нэмэгдэл бүр өөрийн expense_account-
// руугаа, НДШ/ХХОАТ бүр өөрийн liability_account-руугаа бичигдэнэ.
async function postPayrollJournal(hoaId, rows, additionsByCode, userId, period) {
  const lines = {};
  const addDebit = (code, amount) => { if (!code || !amount) return; lines[code] = lines[code] || { debit: 0, credit: 0 }; lines[code].debit += amount; };
  const addCredit = (code, amount) => { if (!code || !amount) return; lines[code] = lines[code] || { debit: 0, credit: 0 }; lines[code].credit += amount; };

  rows.forEach(({ e, calc }) => {
    addDebit('7010', Number(e.base_salary));
    (e.addition_codes || []).forEach((code) => {
      const a = additionsByCode[code];
      if (a && a.is_active) addDebit(a.expense_account, Number(a.amount));
    });
    // 2026-09-13: Ямар ч тооны татвар (НДШ, ХХОАТ, шинээр нэмэгдсэн
    // Хотын татвар г.м.) динамикаар давхардуулахгүй нэг дороос
    // Дт/Кт үүсгэнэ (Rule of two — hardcoded 2 татварын логикийг
    // дахин давтахгүй).
    calc.taxBreakdown.forEach((t) => {
      if (t.employerAmount) addDebit('7020', t.employerAmount);
      const totalForTax = t.employeeAmount + t.employerAmount;
      if (totalForTax) addCredit(t.liability_account, totalForTax);
    });
    // 2026-09-23 (79): БүРЭН ТЕСТЭЭР олдсон АЛДАА ЗАСАВ — МОФ-386
    // рэнумбер (0139 migration)-ийн дараа "Цалингийн eглөг" данс
    // 3030-аас 3130 болж eeрчлөгдсөн ч, ЭНЭ МӨР шинэчлэгдээгүй
    // хэвээр үлдэж, journal_entry_lines.account_code дээр ГАДААД
    // ТүЛХүүР (FK) байхгүй тул алдаа ГАРАЛГүй, ЧИМЭЭГүй БүХ тайланд
    // харагдахаа больж, "алга болох" байсан.
    addCredit('3130', calc.netPay);
  });

  const { data: entry, error: entryError } = await supabase.from('journal_entries').insert({
    tenant_id: hoaId,
    period,
    description: `${period} сарын цалингийн журнал`,
    source_type: 'payroll',
    created_by: userId || null,
  }).select().single();
  if (entryError) throw entryError;

  const lineRows = Object.entries(lines).map(([account_code, { debit, credit }]) => ({
    entry_id: entry.id, account_code, debit: Math.round(debit), credit: Math.round(credit),
  }));
  const { error: linesError } = await supabase.from('journal_entry_lines').insert(lineRows);
  if (linesError) throw linesError;

  return entry;
}

function PayrollPreview({ rows, totals }) {
  return (
    <div>
      <div className="ds-table-wrap">
        <div className="flex-1 overflow-auto overscroll-contain">
          <table className="ds-table">
            <thead>
              <tr>
                <th className="py-2.5 px-3">№</th>
                <th className="py-2.5 px-3">НЭР</th>
                <th className="py-2.5 px-3 text-right">НИЙТ ЦАЛИН</th>
                {totals.taxTotals.map((t) => (
                  <th key={t.code} className="py-2.5 px-3 text-right">{t.name.toUpperCase()}</th>
                ))}
                <th className="py-2.5 px-3 text-right">ГАРТ ОЛГОХ</th>
                <th className="py-2.5 px-3 text-right">АЖ ОЛГОГЧИЙН НИЙТ ЗАРДАЛ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
              {rows.length === 0 ? (
                <tr><td colSpan={5 + totals.taxTotals.length} className="py-6 text-center text-mutedtext">Ажиллаж байгаа ажилтан алга</td></tr>
              ) : rows.map(({ e, calc }, i) => (
                <tr key={e.id}>
                  <td className="py-2.5 px-3 text-mutedtext">{i + 1}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">{e.first_name?.toUpperCase()} {e.parent_name}</td>
                  <td className="py-2.5 px-3 text-right">{formatMoney(calc.grossPay)}₮</td>
                  {calc.taxBreakdown.map((t) => (
                    <td key={t.code} className="py-2.5 px-3 text-right">{formatMoney(t.employeeAmount)}₮</td>
                  ))}
                  <td className="py-2.5 px-3 text-right font-semibold">{formatMoney(calc.netPay)}₮</td>
                  <td className="py-2.5 px-3 text-right text-mutedtext">{formatMoney(calc.employerCost)}₮</td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-300 dark:border-bordercol bg-slate-100 dark:bg-white/[0.03] font-semibold">
                  <td className="py-2.5 px-3" colSpan={2}>НИЙТ</td>
                  <td className="py-2.5 px-3 text-right">{formatMoney(totals.gross)}₮</td>
                  {totals.taxTotals.map((t) => (
                    <td key={t.code} className="py-2.5 px-3 text-right">{formatMoney(t.amount)}₮</td>
                  ))}
                  <td className="py-2.5 px-3 text-right">{formatMoney(totals.net)}₮</td>
                  <td className="py-2.5 px-3 text-right">{formatMoney(totals.employerCost)}₮</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

const MONTH_NAMES = ['1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар', '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'];

// "Ажилтны бүртгэл" хүснэгэлийн мвр дээр дарахад нээгддэг товч
// танилцуулга — хуучин "suh" системийн загварыг үндэслэв.
function EmployeeInfoModal({ employee, positions, onClose, onEdit, onOpenSalary }) {
  if (!employee) return null;
  const positionName = positions.find((p) => p.id === employee.position_id)?.name || '—';
  return (
    <Modal open={!!employee} onClose={onClose} title={`${employee.last_name} ${employee.first_name?.toUpperCase()}`}>
      <div className="flex flex-col gap-2 text-[12.5px]">
        <div className="flex justify-between py-1"><span className="text-mutedtext">Албан тушаал</span><span className="font-semibold">{positionName}</span></div>
        <div className="flex justify-between py-1"><span className="text-mutedtext">Регистрийн дугаар</span><span className="font-semibold">{employee.register_no}</span></div>
        <div className="flex justify-between py-1"><span className="text-mutedtext">Үндсэн цалин</span><span className="font-semibold">{formatMoney(employee.base_salary)}₮</span></div>
        <div className="flex justify-between py-1"><span className="text-mutedtext">Ажилд орсон огноо</span><span className="font-semibold">{employee.hire_date ? formatDate(employee.hire_date) : '—'}</span></div>
        <div className="flex justify-between py-1"><span className="text-mutedtext">Утас</span><span className="font-semibold">{employee.phone || '—'}</span></div>
        <div className="flex justify-between py-1"><span className="text-mutedtext">И-мэйл</span><span className="font-semibold">{employee.email || '—'}</span></div>
        <div className="flex justify-between py-1"><span className="text-mutedtext">Дансны дугаар</span><span className="font-semibold">{employee.account_no || '—'}</span></div>
        <div className="flex justify-between py-1"><span className="text-mutedtext">Төлөв</span><span className="font-semibold">{EMPLOYEE_STATUSES.find((s) => s.value === employee.status)?.label}</span></div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button className="ds-btn-primary" onClick={() => onOpenSalary(employee)}>Цалин</button>
        <button className="ds-btn-secondary" onClick={onClose}>Хаах</button>
        <button className="ds-btn-secondary" onClick={() => onEdit(employee)}>Засах</button>
      </div>
    </Modal>
  );
}

// Тухайн ажилтны сонгосон (Он, Сар)-ын цалингийн дэлгэрэнгүй
// задаргаа — computePayroll()-той ижил тооцооллын логикийг
// ашиглана (Rule of two). Он/Сар нь одоохондоо зөвхөн харагдацад
// зориулагдсан — тооцоолол одоогийн (сүүлд хадгалсан) тохиргоогоор
// хийгдэнэ (түүхэн сар бүрийн ялгаатай дүн хадгалдаггүй тул).
// 2026-09-13: Он dropdown-ыг ажилтны ажилд орсон оноос эхлэн
// одоогийн он хүртэл динамикаар үзүүлдэг болгов (урьд нь үргэлж
// одоогийн он ± тогтмол хүрээ үзүүлдэг байсан). "Сар" dropdown-д
// "Бүгд (жилийн нийлбэр)" сонголт нэмж, сонгосон оны бүх сарын
// (ажилд орсноос хойшхи) нийлбэрийг үзүүлдэг болгов.
function SalaryDetailModal({ employee, positions, taxSettings, additionsByCode, onClose }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 0 = Бүгд (жилийн нийлбэр)

  if (!employee) return null;
  const positionName = positions.find((p) => p.id === employee.position_id)?.name || '—';
  const fullName = `${employee.last_name} ${employee.first_name?.toUpperCase() || ''}`.trim();

  const hireDate = employee.hire_date ? new Date(employee.hire_date) : null;
  const hireYear = hireDate ? hireDate.getFullYear() : now.getFullYear();
  const hirePeriodKey = hireDate ? hireYear * 12 + (hireDate.getMonth() + 1) : null;

  function isNotYetHired(y, m) {
    return hirePeriodKey != null && (y * 12 + m) < hirePeriodKey;
  }
  const notYetHired = month !== 0 && isNotYetHired(year, month);

  // 2026-09-13: computePayroll() одоо ямар ч тооны идэвхтэй татварыг
  // (taxSettings) динамикаар тооцоолж, calc.taxBreakdown массив
  // болгож буцаана — hardcoded НДШ/ХХОАТ-с гадна SUPERSYSADMIN-ийн
  // нэмсэн ямар ч шинэ татвар автоматаар энд харагдана.
  const calc = computePayroll(employee, taxSettings, additionsByCode);

  // 2026-09-13: БОДИТ АЛДАА ЗАСАВ — Он/Сар сонгосон үед, тухайн
  // ажилтан ТЭР үед хараахан ажилд ороогүй байсан ч, одоогийн
  // тохиргоогоор тооцоолсон цалин үзүүлдэг байсан. Мөнгөтэй
  // холбоотой тул сонгосон үе ажилд орсон огнооноос өмнө бол
  // тооцоолол үзүүлэхгүй, тодорхой анхааруулга харуулна.
  const years = Array.from({ length: Math.max(1, now.getFullYear() - hireYear + 1) }, (_, i) => hireYear + i);

  const employedMonthsInYear = month === 0
    ? Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => !isNotYetHired(year, m)).length
    : 0;
  const todayPeriodKey = now.getFullYear() * 12 + (now.getMonth() + 1);
  const pastMonthsInYear = month === 0
    ? Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => !isNotYetHired(year, m) && (year * 12 + m) <= todayPeriodKey).length
    : 0;

  return (
    <Modal open={!!employee} onClose={onClose} title="Цалингийн дэлгэрэнгүй" size="lg">
      <div className="flex gap-2 mb-4">
        <div className="flex-1">
          <div className="text-[11px] text-mutedtext mb-1">Он</div>
          <select className="ds-select w-full" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <div className="text-[11px] text-mutedtext mb-1">Сар</div>
          <select className="ds-select w-full" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            <option value={0}>Бүгд (жилийн нийлбэр)</option>
            {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="print-area">
        <div className="text-center mb-3">
          <div className="font-semibold text-slate-900 dark:text-white">{fullName}</div>
          <div className="text-[11px] text-mutedtext">{positionName} · {month === 0 ? `${year} он (нийлбэр)` : `${year}-${String(month).padStart(2, '0')}`}</div>
        </div>

        {month === 0 ? (
          employedMonthsInYear === 0 ? (
            <div className="ds-card p-4 text-center text-mutedtext">
              {fullName} нь {year} онд хараахан ажилд ороогүй байсан. Цалингийн тооцоолол харуулах боломжгүй.
            </div>
          ) : (
            <>
              {/* 2026-09-13: Хэрэглэгчийн хүсэлтээрүэр — ажилтны зүгээс
                  маргаан үүсэхгүй байхаар, жилийн нийлбэрт нэмэгдэл БОЛОН
                  татвар бүр тус тусдаа баганаар (динамикаар, hardcoded
                  НДШ/ХХОАТ биш) бүрэн харагдана. */}
              <div className="overflow-x-auto">
                <table className="ds-table w-full text-[11.5px]">
                  <thead>
                    <tr>
                      <th className="py-1.5 px-2">САР</th>
                      <th className="py-1.5 px-2 text-right">ҮНДСЭН ЦАЛИН</th>
                      {calc.checkedAdditions.map((a) => (
                        <th key={a.code} className="py-1.5 px-2 text-right">{a.name.toUpperCase()}</th>
                      ))}
                      <th className="py-1.5 px-2 text-right">НИЙТ ЦАЛИН</th>
                      {calc.taxBreakdown.map((t) => (
                        <th key={t.code} className="py-1.5 px-2 text-right">{t.name.toUpperCase()}</th>
                      ))}
                      <th className="py-1.5 px-2 text-right">ГАРТ ОЛГОХ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-bordercol/50">
                    {MONTH_NAMES.map((name, i) => {
                      const m = i + 1;
                      const isFuture = (year * 12 + m) > todayPeriodKey;
                      const shown = !isNotYetHired(year, m) && !isFuture;
                      return (
                        <tr key={m} className={!shown ? 'opacity-40' : ''}>
                          <td className="py-1.5 px-2">{name}</td>
                          <td className="py-1.5 px-2 text-right">{shown ? `${formatMoney(employee.base_salary)}₮` : '—'}</td>
                          {calc.checkedAdditions.map((a) => (
                            <td key={a.code} className="py-1.5 px-2 text-right">{shown ? `${formatMoney(a.amount)}₮` : '—'}</td>
                          ))}
                          <td className="py-1.5 px-2 text-right font-semibold">{shown ? `${formatMoney(calc.grossPay)}₮` : '—'}</td>
                          {calc.taxBreakdown.map((t) => (
                            <td key={t.code} className="py-1.5 px-2 text-right">{shown ? `-${formatMoney(t.employeeAmount)}₮` : '—'}</td>
                          ))}
                          <td className="py-1.5 px-2 text-right font-semibold">{shown ? `${formatMoney(calc.netPay)}₮` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 dark:border-bordercol bg-slate-100 dark:bg-white/[0.03] font-semibold">
                      <td className="py-1.5 px-2">НИЙТ ({pastMonthsInYear} сар)</td>
                      <td className="py-1.5 px-2 text-right">{formatMoney(Number(employee.base_salary) * pastMonthsInYear)}₮</td>
                      {calc.checkedAdditions.map((a) => (
                        <td key={a.code} className="py-1.5 px-2 text-right">{formatMoney(Number(a.amount) * pastMonthsInYear)}₮</td>
                      ))}
                      <td className="py-1.5 px-2 text-right">{formatMoney(calc.grossPay * pastMonthsInYear)}₮</td>
                      {calc.taxBreakdown.map((t) => (
                        <td key={t.code} className="py-1.5 px-2 text-right">-{formatMoney(t.employeeAmount * pastMonthsInYear)}₮</td>
                      ))}
                      <td className="py-1.5 px-2 text-right">{formatMoney(calc.netPay * pastMonthsInYear)}₮</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )
        ) : (
          <div className="flex flex-col gap-1 text-[12.5px]">
            {notYetHired ? (
              <div className="ds-card p-4 text-center text-mutedtext">
                {fullName} нь {formatDate(employee.hire_date)}-нд ажилд орсон тул, {year}-{String(month).padStart(2, '0')} үед хараахан ажилд ороогүй байсан. Цалингийн тооцоолол харуулах боломжгүй.
              </div>
            ) : (
              <>
                <div className="flex justify-between py-1"><span className="text-mutedtext">Үндсэн цалин</span><span>{formatMoney(employee.base_salary)}₮</span></div>
                {calc.checkedAdditions.map((a) => (
                  <div key={a.code} className="flex justify-between py-0.5 pl-4"><span className="text-mutedtext">{a.name}</span><span>{formatMoney(a.amount)}₮</span></div>
                ))}
                <div className="flex justify-between py-1.5 font-semibold border-t border-slate-200 dark:border-bordercol mt-1">
                  <span>Нийт цалин</span><span>{formatMoney(calc.grossPay)}₮</span>
                </div>
                {calc.taxBreakdown.map((t) => (
                  <div key={t.code} className="flex justify-between py-1"><span className="text-mutedtext">{t.name}{!t.deduct ? ' (суутгаагүй)' : ''}</span><span className={t.employeeAmount ? 'text-customRed' : 'text-mutedtext'}>{t.employeeAmount ? `-${formatMoney(t.employeeAmount)}₮` : '—'}</span></div>
                ))}
                <div className="flex justify-between py-2 font-bold text-[14px] border-t border-slate-200 dark:border-bordercol mt-1">
                  <span>ГАРТ ОЛГОХ ДҮН</span><span>{formatMoney(calc.netPay)}₮</span>
                </div>

                <div className="text-[11px] text-mutedtext mt-3 mb-1">Ажил олгогчийн нэмэлт зардал:</div>
                {calc.taxBreakdown.filter((t) => t.employerAmount).map((t) => (
                  <div key={t.code} className="flex justify-between py-1"><span className="text-mutedtext">{t.name} (ажил олгогчийн хэсэг)</span><span>{formatMoney(t.employerAmount)}₮</span></div>
                ))}
                <div className="flex justify-between py-1.5 font-semibold border-t border-slate-200 dark:border-bordercol mt-1">
                  <span>Ажил олгогчид ногдох зардал</span><span>{formatMoney(calc.employerCost)}₮</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button className="ds-btn-secondary" onClick={onClose}>Хаах</button>
        <button className="ds-btn-primary" disabled={notYetHired || (month === 0 && employedMonthsInYear === 0)} onClick={() => window.print()}>Хэвлэх</button>
      </div>
    </Modal>
  );
}

export default function Employees() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const [tab, setTab] = useState('list');
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [taxSettings, setTaxSettings] = useState([]);
  const [additionSettings, setAdditionSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [infoEmployee, setInfoEmployee] = useState(null);
  const [salaryEmployee, setSalaryEmployee] = useState(null);
  const now = new Date();
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [search, setSearch] = useState('');
  const [posting, setPosting] = useState(false);
  const [alreadyPostedPeriod, setAlreadyPostedPeriod] = useState(undefined);
  const { confirm, ConfirmDialog } = useConfirm();

  async function load() {
    setLoading(true);
    const [{ data: empRows }, { data: posRows }, { data: taxRows }, { data: addRows }] = await Promise.all([
      fetchAllRows(() => supabase.from('employees').select('*').eq('tenant_id', hoaId).order('created_at')),
      fetchAllRows(() => supabase.from('job_positions').select('*').eq('tenant_id', hoaId).order('sort_order')),
      fetchAllRows(() => supabase.from('payroll_tax_settings').select('*').eq('tenant_id', hoaId)),
      fetchAllRows(() => supabase.from('payroll_addition_settings').select('*').eq('tenant_id', hoaId).eq('is_active', true)),
    ]);
    setEmployees(empRows || []);
    setPositions(posRows || []);
    setTaxSettings(taxRows || []);
    setAdditionSettings(addRows || []);
    setLoading(false);
  }
  useEffect(() => { if (hoaId) load(); }, [hoaId]);

  const additionsByCode = {};
  additionSettings.forEach((a) => { additionsByCode[a.code] = a; });

  function startAdd() { setForm(emptyForm()); setEditing(null); setModalOpen(true); }
  function startEdit(row) {
    const formTaxOverrides = {};
    Object.entries(row.tax_overrides || {}).forEach(([code, ov]) => {
      formTaxOverrides[code] = {
        deduct: ov.deduct !== false,
        use_custom: ov.custom_employee_rate != null || ov.custom_employer_rate != null || ov.custom_rate != null,
        custom_employee_rate: ov.custom_employee_rate != null ? String(ov.custom_employee_rate) : '',
        custom_employer_rate: ov.custom_employer_rate != null ? String(ov.custom_employer_rate) : '',
        custom_rate: ov.custom_rate != null ? String(ov.custom_rate) : '',
        reason: ov.reason || '',
      };
    });
    setForm({
      ...emptyForm(),
      ...row,
      base_salary: String(row.base_salary),
      tax_overrides: formTaxOverrides,
      position_id: row.position_id || '',
    });
    setEditing(row.id);
    setModalOpen(true);
  }
  async function handleDelete(row) {
    const ok = await confirm(`"${row.last_name} ${row.first_name?.toUpperCase()}" ажилтныг устгах уу?`);
    if (!ok) return;
    await supabase.from('employees').delete().eq('id', row.id);
    load();
  }
  async function handleSave() {
    if (!form.last_name.trim() || !form.first_name.trim() || !form.register_no.trim()) {
      window.alert('Ургийн овог, өөрийн нэр, регистрийн дугаарыг бөглөнө уу.');
      return;
    }
    // eslint-disable-next-line no-unused-vars
    const { tax_overrides: formTaxOverrides, ...formForDb } = form;
    const taxOverridesForDb = {};
    Object.entries(formTaxOverrides || {}).forEach(([code, ov]) => {
      const tax = taxSettings.find((t) => t.code === code);
      const deduct = ov.deduct !== false;
      const entry = { deduct };
      if (!deduct) {
        entry.reason = ov.reason?.trim() || null;
      } else if (ov.use_custom) {
        if (tax?.calc_type === 'two_party') {
          entry.custom_employee_rate = ov.custom_employee_rate !== '' ? Number(ov.custom_employee_rate) : null;
          entry.custom_employer_rate = ov.custom_employer_rate !== '' ? Number(ov.custom_employer_rate) : null;
        } else {
          entry.custom_rate = ov.custom_rate !== '' ? Number(ov.custom_rate) : null;
        }
      }
      taxOverridesForDb[code] = entry;
    });
    const payload = {
      ...formForDb,
      first_name: form.first_name.trim().toUpperCase(),
      base_salary: Number(form.base_salary) || 0,
      position_id: form.position_id || null,
      tax_overrides: taxOverridesForDb,
      hire_date: form.hire_date || null,
    };
    if (editing) {
      const { error } = await supabase.from('employees').update(payload).eq('id', editing);
      if (error) { window.alert(error.message); return; }
    } else {
      const { error } = await supabase.from('employees').insert({ tenant_id: hoaId, ...payload });
      if (error) { window.alert(error.message); return; }
    }
    setModalOpen(false);
    setForm(null);
    load();
  }

  const toolbarYears = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 4 + i);
  const currentPeriod = `${filterYear}-${String(filterMonth).padStart(2, '0')}`;
  const selectedPeriodKey = filterYear * 12 + filterMonth;
  // 2026-09-13: Түүлбарт сонгосон Он/Сар-аас oмнe ажилд ороогүй
  // ажилтныг жагсаалтаас хасна (мөнгөтэй холбоотой тул зөвхөн
  // тухайн үе шатанд бодитоор ажиллаж байсан хүнийг тооцно).
  const activePayrollEmployees = employees.filter((e) => {
    if (e.status !== 'active') return false;
    if (!e.hire_date) return true;
    const hireDate = new Date(e.hire_date);
    const hirePeriodKey = hireDate.getFullYear() * 12 + (hireDate.getMonth() + 1);
    return selectedPeriodKey >= hirePeriodKey;
  });
  const payrollRows = activePayrollEmployees.map((e) => ({ e, calc: computePayroll(e, taxSettings, additionsByCode) }));
  const payrollTotals = {
    gross: payrollRows.reduce((s, r) => s + r.calc.grossPay, 0),
    net: payrollRows.reduce((s, r) => s + r.calc.netPay, 0),
    employerCost: payrollRows.reduce((s, r) => s + r.calc.employerCost, 0),
    taxTotals: taxSettings.filter((t) => t.is_active).map((tax) => ({
      code: tax.code,
      name: tax.name,
      amount: payrollRows.reduce((s, r) => s + (r.calc.taxBreakdown.find((t2) => t2.code === tax.code)?.employeeAmount || 0), 0),
    })),
  };

  useEffect(() => {
    if (!hoaId) return;
    supabase.from('journal_entries').select('id').eq('tenant_id', hoaId).eq('source_type', 'payroll').eq('period', currentPeriod).maybeSingle().then(({ data }) => {
      setAlreadyPostedPeriod(!!data);
    });
  }, [hoaId, currentPeriod]);

  async function handlePost() {
    if (payrollRows.length === 0 || alreadyPostedPeriod) return;
    if (!window.confirm('Энэ сарын цалингийн журналын бичилтийг үүсгэх vv? ҮҮнийг буцаах боломжгүй (шинэ буцаах бичилт хийх шаардлагатай болно).')) return;
    setPosting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      await postPayrollJournal(hoaId, payrollRows, additionsByCode, userData?.user?.id, currentPeriod);
      window.alert('Журналын бичилт амжилттай үүслээ. "Нягтлан бодох бүртгэл" хуудаснаас харна уу.');
      setAlreadyPostedPeriod(true);
    } catch (err) {
      if (err.code === '23505') {
        window.alert('Энэ сарын цалингийн журнал аль хэдийн үүссэн байна — дахин үүсгэх боломжгүй.');
        setAlreadyPostedPeriod(true);
      } else {
        window.alert(err.message);
      }
    }
    setPosting(false);
  }

  return (
    <div>
      <div className="ds-toolbar flex-wrap justify-between mb-3">
        {tab === 'list' ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <input className="ds-input w-64" placeholder="Хайх..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <button className="ds-btn-secondary">Хэвлэх</button>
              <button className="ds-btn-secondary">Экспорт</button>
              <button className="ds-btn-primary" onClick={startAdd}>+ Ажилтан нэмэх</button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <select className="ds-select" value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))}>
                {toolbarYears.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <select className="ds-select" value={filterMonth} onChange={(e) => setFilterMonth(Number(e.target.value))}>
                {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button className="ds-btn-secondary">Хэвлэх</button>
              <button className="ds-btn-secondary">Экспорт</button>
              <button
                className="ds-btn-primary"
                onClick={handlePost}
                disabled={posting || payrollRows.length === 0 || alreadyPostedPeriod || alreadyPostedPeriod === undefined}
                title={alreadyPostedPeriod ? 'Энэ сард аль хэдийн журнал үүссэн байна' : ''}
              >
                {posting ? 'үүсгэж байна...' : alreadyPostedPeriod ? `${currentPeriod} сар төлөгдсөн` : 'Цалингийн тооцооллыг журналд бичих'}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <TabButton active={tab === 'list'} onClick={() => setTab('list')}>Ажилтнууд</TabButton>
        <TabButton active={tab === 'payroll'} onClick={() => setTab('payroll')}>Цалингийн тооцоолол (урьдчилсан)</TabButton>
      </div>

      {tab === 'list' && (
        <EmployeeList
          employees={employees}
          search={search}
          positions={positions}
          loading={loading}
          onEdit={startEdit}
          onDelete={handleDelete}
          onRowClick={setInfoEmployee}
        />
      )}
      {tab === 'payroll' && (
        <PayrollPreview rows={payrollRows} totals={payrollTotals} />
      )}

      <EmployeeModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setForm(null); }}
        editing={editing}
        form={form}
        setForm={setForm}
        positions={positions}
        additions={additionSettings}
        taxSettings={taxSettings}
        onSave={handleSave}
      />
      <EmployeeInfoModal
        employee={infoEmployee}
        positions={positions}
        onClose={() => setInfoEmployee(null)}
        onEdit={(emp) => { setInfoEmployee(null); startEdit(emp); }}
        onOpenSalary={(emp) => { setInfoEmployee(null); setSalaryEmployee(emp); }}
      />
      <SalaryDetailModal
        employee={salaryEmployee}
        positions={positions}
        taxSettings={taxSettings}
        additionsByCode={additionsByCode}
        onClose={() => setSalaryEmployee(null)}
      />
      <ConfirmDialog />
    </div>
  );
}
