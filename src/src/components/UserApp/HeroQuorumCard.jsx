import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

// 2026-08-27: OwnerApp Bento дэлгэцийн "гэрч" (hero) карт — variant 1
// (хэрэглэгчийн сонгосон хувилбар) санааг бодит Cosmo дататай холбов.
// Тухайн СүХ-ийн ХАМГИЙН ЯАРАЛТАЙ (дуусах хугацаа хамгийн ойрхон)
// идэвхтэй санал асуулгыг олж, get_voting_results()-ийн turnout блокоор
// лайв кворум ring үзүүлнэ. Идэвхтэй санал асуулга үгүй бол ЮУ Ч
// үзүүлэхгүй (хоосон карт биш).
export default function HeroQuorumCard({ hoaId }) {
  const navigate = useNavigate();
  const [poll, setPoll] = useState(null);
  const [turnout, setTurnout] = useState(null);

  useEffect(() => {
    if (!hoaId) return;
    let cancelled = false;
    (async () => {
      const { data: p } = await supabase
        .from('voting_polls')
        .select('id, title, end_at')
        .eq('tenant_id', hoaId)
        .eq('status', 'active')
        .order('end_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (!p) { setPoll(null); return; }
      setPoll(p);
      const { data: r } = await supabase.rpc('get_voting_results', { p_poll_id: p.id });
      if (!cancelled) setTurnout(r?.turnout || null);
    })();
    return () => { cancelled = true; };
  }, [hoaId]);

  if (!poll) return null;

  const pct = turnout?.turnout_percent ?? 0;
  const r = 28, circumference = 2 * Math.PI * r;
  const offset = circumference - Math.min(pct, 100) / 100 * circumference;
  const daysLeft = poll.end_at ? Math.max(0, Math.ceil((new Date(poll.end_at) - new Date()) / 86400000)) : null;

  return (
    <div className="hero-quorum-card" onClick={() => navigate(`/${hoaId}/voting/${poll.id}/results`)}>
      <div className="hero-ring-wrap">
        <svg width="66" height="66" viewBox="0 0 66 66">
          <circle className="hero-ring-track" cx="33" cy="33" r={r} />
          <circle className="hero-ring-fill" cx="33" cy="33" r={r} style={{ strokeDasharray: circumference, strokeDashoffset: offset }} />
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
