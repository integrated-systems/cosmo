import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

// 2026-08-27: OwnerApp Bento дэлгэцийн "гэрч" (hero) карт — variant 1
// (хэрэглэгчийн сонгосон хувилбар) санааг бодит Cosmo дататай холбов.
// Тухайн СӨХ-ийн ХАМГИЙН ЯАРАЛТАЙ (дуусах хугацаа хамгийн ойрхон)
// идэвхтэй санал асуулгыг олж, get_voting_results()-ийн turnout блокоор
// лайв кворум ring үзүүлнэ. Идэвхтэй санал асуулга үгүй бол ЮУ Ч
// үзүүлэхгүй (хоосон карт биш).
//
// 2026-08-28: ГүЙЦЭТГЭЛИЙН ЗАСВАР — үмнв нь ХОС дараалсан (waterfall)
// дуудлага (эхлээд poll хайх, дараа нь get_voting_results) хийдэг
// байсан тул Hero карт ХОЁР ДАХИН ачаалж, зарим үед "нэг алга болоод
// дахин гарч ирдэг" мэт харагддаг байв (0061 migration-ий
// get_home_hero() RPC-г ашиглан ЦОРЫН ГАНЦ дуудлага болгов).
export default function HeroQuorumCard({ hoaId }) {
  const navigate = useNavigate();
  const [poll, setPoll] = useState(null);
  const [turnout, setTurnout] = useState(null);

  useEffect(() => {
    if (!hoaId) return;
    let cancelled = false;
    supabase.rpc('get_home_hero', { p_tenant_id: hoaId }).then(({ data, error }) => {
      if (cancelled || error) return;
      setPoll(data?.poll || null);
      setTurnout(data?.turnout || null);
    });
    return () => { cancelled = true; };
  }, [hoaId]);

  if (!poll) return null;

  const pct = turnout?.turnout_percent ?? 0;
  const r = 33, circumference = 2 * Math.PI * r;
  const offset = circumference - Math.min(pct, 100) / 100 * circumference;
  const daysLeft = poll.end_at ? Math.max(0, Math.ceil((new Date(poll.end_at) - new Date()) / 86400000)) : null;

  return (
    <div className="hero-quorum-card" onClick={() => navigate(`/${hoaId}/voting/${poll.id}/results`)}>
      <div className="hero-ring-wrap">
        <svg width="78" height="78" viewBox="0 0 78 78">
          <circle className="hero-ring-track" cx="39" cy="39" r={r} />
          <circle className="hero-ring-fill" cx="39" cy="39" r={r} style={{ strokeDasharray: circumference, strokeDashoffset: offset }} />
        </svg>
        <div className="hero-ring-center">
          <div className="hero-ring-pct">{Math.round(pct)}%</div>
          <div className="hero-ring-cap">кворум</div>
        </div>
      </div>
      <div>
        <span className="hero-tag"><span className="hero-live-dot" />Идэвхтэй санал хураалт</span>
        <div className="hero-quorum-title">{poll.title}</div>
        <div className="hero-quorum-sub">
          {turnout ? `${turnout.responded_count}${turnout.weighted ? ' м²' : ''} / ${turnout.eligible_count}${turnout.weighted ? ' м²' : ''} санал өгсөн` : ''}
          {daysLeft != null && ` · ${daysLeft} хоног үлдсэн`}
        </div>
      </div>
    </div>
  );
}
