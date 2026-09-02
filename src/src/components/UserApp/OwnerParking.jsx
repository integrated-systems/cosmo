import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/AuthContext';

// 2026-08-31: Хэрэглэгчийн хүсэлт — "Зочин урих" (OwnerApp). Owner
// зочны машины дугаарыг (4 орон + 3 үсэг, Монголын дугаарын формат)
// бүртгүүлж, хотхоны хаалт үүнийг уншиж нэвтрүүлдэг, 60 минут
// үнэгүй, дараа нь тариф тооцно. Үвр нь "Түр зогсоол бүртгэл" (admin)
// хуудастай ЯГ АДИЛ хүснэгэлийг ашиглана (нэг хүснэгэлийн 2 нэр).
function timeFmt(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function OwnerParking({ hoaId }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [digits, setDigits] = useState('');
  const [letters, setLetters] = useState('');
  const [recent, setRecent] = useState(null);
  const [sending, setSending] = useState(false);
  const [noOwnerRecord, setNoOwnerRecord] = useState(false);

  function load() {
    supabase.from('guest_parking_requests').select('car_number, requested_at').eq('tenant_id', hoaId)
      .order('requested_at', { ascending: false }).limit(10)
      .then(({ data }) => setRecent(data ?? []));
  }
  useEffect(() => {
    if (!hoaId || !user?.id) return;
    supabase.from('owners').select('id').eq('user_id', user.id).eq('tenant_id', hoaId).maybeSingle().then(({ data }) => {
      setNoOwnerRecord(!data);
    });
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoaId, user?.id]);

  async function invite() {
    if (digits.trim().length !== 4 || letters.trim().length !== 3) {
      alert('Машины дугаарыг бүрэн (4 орон + 3 үсэг) оруулна уу.');
      return;
    }
    setSending(true);
    const { data: ownerRow } = await supabase.from('owners').select('id').eq('user_id', user.id).eq('tenant_id', hoaId).maybeSingle();
    if (!ownerRow) { setSending(false); return; }
    const carNumber = `${digits.trim()} ${letters.trim().toUpperCase()}`;
    const { error } = await supabase.from('guest_parking_requests').insert({
      tenant_id: hoaId, owner_id: ownerRow.id, car_number: carNumber,
    });
    setSending(false);
    if (error) { alert(error.message); return; }
    setDigits('');
    setLetters('');
    load();
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0 16px' }}>
        <button
          onClick={() => navigate(`/${hoaId}`)}
          style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#ffffff1a', border: '1px solid #ffffff2e', color: 'var(--text-primary)', fontSize: 18, cursor: 'pointer',
          }}
        >
          ‹
        </button>
        <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 0.5 }}>ЗОЧИН УРИХ</div>
      </div>

      <div className="mobile-list-item" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: 14 }}>
          Таны урьсан зочин машинаа хотхоны гадна талбайд түр байрлуулах буюу
          хаалтаар дугаараа уншуулан нэвтэрсэн мөчөөс эхлэн 60 минут үнэгүй
          зогсох эрхтэй. Үг хугацаа хэтэрсэнээс хойш тогтоосон тарифаар
          зогсоолын төлбөр бодогдохыг анхаарна уу.
        </div>

        {noOwnerRecord ? (
          <div className="pool-empty">Таны сууц өмчлөгчийн бүртгэл дутуу тул зочин урих боломжгүй байна.</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <input
              value={digits} onChange={(e) => setDigits(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder="1234" inputMode="numeric" maxLength={4}
              style={{
                flex: 1, minWidth: 0, textAlign: 'center', fontSize: 20, fontWeight: 800, letterSpacing: 2,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 12, padding: '14px 8px', color: 'var(--text-primary)', outline: 'none',
              }}
            />
            <input
              value={letters} onChange={(e) => setLetters(e.target.value.replace(/[^а-яА-ЯөӨүҮa-zA-Z]/g, '').slice(0, 3).toUpperCase())}
              placeholder="АБВ" maxLength={3}
              style={{
                flex: 1, minWidth: 0, textAlign: 'center', fontSize: 20, fontWeight: 800, letterSpacing: 2,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 12, padding: '14px 8px', color: 'var(--text-primary)', outline: 'none',
              }}
            />
          </div>
        )}

        {!noOwnerRecord && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <button
              onClick={invite} disabled={sending || digits.length !== 4 || letters.length !== 3}
              style={{
                background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 12,
                padding: '12px 32px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: (sending || digits.length !== 4 || letters.length !== 3) ? 0.5 : 1,
              }}
            >
              {sending ? '...' : 'Урих'}
            </button>
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 8 }}>
        Бүртгүүлсэн зочид
      </div>
      <div className="mobile-list-item">
        {recent === null && <div className="pool-empty">Ачаалж байна...</div>}
        {recent?.length === 0 && <div className="pool-empty">Одоогоор зочин урьсангүй байна.</div>}
        {recent?.map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{r.car_number}</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{timeFmt(r.requested_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
