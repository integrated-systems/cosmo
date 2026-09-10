import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { usePlans } from '../hooks/usePlans';
import { formatMoney } from '../lib/format';

// 2026-09-08 (22-2): Trial дуусаад "Paused" (suspended) болсон
// tenant-д харагдах дэлгэц — зөвхөн мэдэгдэл үзүүлээд зогсохгүй,
// Багц ахиулах хүсэлт үүсгэх боломж (Basic/Standard/Premium/
// Premium+, Trial ХАМААРАЛГүй) шууд энд байрлана. Хүсэлт үүсгэсний
// дараа SUPERSYSADMIN Tenant Status дээр батлана (RLS: migration
// 0107, my_tenant_ids_all() — suspended үед ч хүсэлт үүсгэж чадна).
export default function TenantSuspendedScreen({ hoaId }) {
  const { plans } = usePlans();
  const [pendingRequest, setPendingRequest] = useState(undefined);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const paidPlans = plans.filter((p) => p.key !== 'trial');

  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'suspended_message').single().then(({ data }) => {
      setMessage(data?.value || '');
    });
  }, []);

  useEffect(() => {
    if (!hoaId) return;
    supabase.from('plan_upgrade_requests')
      .select('*')
      .eq('tenant_id', hoaId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })
      .limit(1)
      .then(({ data }) => setPendingRequest(data?.[0] || null));
  }, [hoaId]);

  async function handleSubmit() {
    if (!selectedPlan) return;
    setSubmitting(true);
    const { data, error } = await supabase.from('plan_upgrade_requests')
      .insert({ tenant_id: hoaId, requested_plan_key: selectedPlan })
      .select()
      .single();
    setSubmitting(false);
    if (error) { window.alert(error.message); return; }
    setPendingRequest(data);
  }

  return (
    <div className="h-screen overflow-y-auto flex items-center justify-center bg-sidebg px-6 py-10">
      <div className="max-w-lg w-full text-center">
        <div className="text-[16px] font-semibold text-white mb-2">Хандах эрх дууссан байна</div>
        <div className="text-[13px] text-mutedtext leading-relaxed mb-6">
          {message}
        </div>

        {pendingRequest === undefined && (
          <div className="text-[12px] text-mutedtext">Ачаалж байна...</div>
        )}

        {pendingRequest && (
          <div className="ds-card p-4 text-left">
            <div className="text-[13px] font-semibold text-customGreen mb-1">Хүсэлт илгээгдсэн</div>
            <div className="text-[12px] text-mutedtext">
              Та "{paidPlans.find((p) => p.key === pendingRequest.requested_plan_key)?.label || pendingRequest.requested_plan_key}" багц руу шилжих хүсэлт илгээсэн байна. Систем админ баталгаажуулмагц хандалт тань сэргэнэ.
            </div>
          </div>
        )}

        {pendingRequest === null && (
          <>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {paidPlans.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setSelectedPlan(p.key)}
                  className={`ds-card p-3 text-left transition-colors ${selectedPlan === p.key ? 'ring-2 ring-customBlue' : ''}`}
                >
                  <div className="text-[12px] font-semibold text-white">{p.label}</div>
                  <div className="text-[11px] text-mutedtext">{formatMoney(p.price_per_unit)}₮ / тоот / сар</div>
                </button>
              ))}
            </div>
            <button
              className="ds-btn-primary w-full"
              disabled={!selectedPlan || submitting}
              onClick={handleSubmit}
            >
              {submitting ? 'Илгээж байна...' : 'Хүсэлт илгээх'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
