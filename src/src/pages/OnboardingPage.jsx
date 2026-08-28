import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import AuthLogo from '../components/AuthLogo';

// 2026-08-15: Sign-Up-ийн 2-р алхам — session бий боловч user_roles-д
// ямар ч мөр байхгүй (шинэ хэрэглэгч, tenant үүсгээгүй) үед App.jsx
// ЭНЭ хуудсыг харуулна. СӨХ-ны нэр+багц (Plan) сонгуулж,
// `create_tenant_and_assign_admin` RPC-ээр tenant+эрхийг атомикаар
// үүсгэнэ.
export default function OnboardingPage() {
  const { signOut, refreshRoles } = useAuth();
  const [tenantName, setTenantName] = useState('');
  const [registrationNo, setRegistrationNo] = useState('');
  const [taxPayerNo, setTaxPayerNo] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    setError('');
    if (!tenantName.trim()) {
      setError('СӨХ-ны нэрээ оруулна уу');
      return;
    }
    setLoading(true);
    const { error: rpcError } = await supabase.rpc('create_tenant_and_assign_admin', {
      p_tenant_name: tenantName.trim(),
      p_plan_key: 'trial',
      p_registration_no: registrationNo.trim() || null,
      p_tax_payer_no: taxPayerNo.trim() || null,
      p_email: orgEmail.trim() || null,
      p_phone: orgPhone.trim() || null,
    });
    if (rpcError) {
      setLoading(false);
      setError(rpcError.message);
      return;
    }
    await refreshRoles();
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-sidebg overflow-y-auto py-10">
      <div className="w-full max-w-[560px] rounded bg-appbg border border-bordercol px-7 py-10 mx-4">
        <AuthLogo />

        <div className="mb-6">
          <label htmlFor="onboarding-tenant" className="block text-[10px] font-semibold text-mutedtext mb-1.5 uppercase tracking-[.06em]">
            СӨХ-ны нэр
          </label>
          <input
            id="onboarding-tenant" type="text" placeholder="Нэр"
            value={tenantName} onChange={(e) => setTenantName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-inputbg border border-blue-500/20 rounded-md text-text text-sm outline-none focus:border-blue-500/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div>
            <label htmlFor="onboarding-regno" className="block text-[10px] font-semibold text-mutedtext mb-1.5 uppercase tracking-[.06em]">
              Регистрийн дугаар
            </label>
            <input
              id="onboarding-regno" type="text" placeholder="9012345678"
              value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-inputbg border border-blue-500/20 rounded-md text-text text-sm outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <label htmlFor="onboarding-taxno" className="block text-[10px] font-semibold text-mutedtext mb-1.5 uppercase tracking-[.06em]">
              Татвар төлөгчийн дугаар
            </label>
            <input
              id="onboarding-taxno" type="text" placeholder="1234567"
              value={taxPayerNo} onChange={(e) => setTaxPayerNo(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-inputbg border border-blue-500/20 rounded-md text-text text-sm outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <label htmlFor="onboarding-orgemail" className="block text-[10px] font-semibold text-mutedtext mb-1.5 uppercase tracking-[.06em]">
              Имэйл
            </label>
            <input
              id="onboarding-orgemail" type="email" placeholder="office@example.com"
              value={orgEmail} onChange={(e) => setOrgEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-inputbg border border-blue-500/20 rounded-md text-text text-sm outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <label htmlFor="onboarding-orgphone" className="block text-[10px] font-semibold text-mutedtext mb-1.5 uppercase tracking-[.06em]">
              Холбоо барих утас
            </label>
            <input
              id="onboarding-orgphone" type="tel" placeholder="99001122"
              value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-inputbg border border-blue-500/20 rounded-md text-text text-sm outline-none focus:border-blue-500/50"
            />
          </div>
        </div>

        <div className="mb-6 px-4 py-3 bg-blue-500/10 border border-blue-500/30 rounded-md">
          <div className="text-sm text-text">СӨХ үүссэний дараа <span className="font-semibold">14 хоногийн Trial үе</span> автоматаар эхэлнэ.</div>
          <div className="text-xs text-mutedtext mt-1">SuperSysAdmin бүртгэлийг хүлээн зөвшөөрсний дараа үйлчилгээ идэвхжинэ.</div>
        </div>

        {error && (
          <div className="mb-4 px-3.5 py-2.5 bg-red-500/10 border border-red-500/30 rounded-md text-xs text-customRed">
            {error}
          </div>
        )}

        <button
          type="button" onClick={handleCreate} disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 border-none rounded-md text-white text-sm font-semibold tracking-[.02em] cursor-pointer transition-colors"
        >
          СӨХ үүсгэх
        </button>
        {loading && <div className="text-center mt-3 text-xs text-darktext">Үүсгэж байна...</div>}

        <div className="text-center mt-5">
          <button
            type="button" onClick={signOut}
            className="bg-transparent border-none p-0 text-xs text-mutedtext hover:text-text cursor-pointer underline"
          >
            Гарах
          </button>
        </div>
      </div>
    </div>
  );
}
