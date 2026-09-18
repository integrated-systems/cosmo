import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/AuthContext';

// 2026-09-13: Резидентийн "Албан мэдэгдэл" inbox — msgr_list/
// msgr_messages (2 талын chat)-ээс БүРЭН тусгаарлагдсан, зөвхөн
// СөХ-оос ирсэн 1 талын мэдэгдлийг л харуулна. Header дэх inbox
// icon товч үүнийг нээдэг болов (eмнe нь Мессенжер рүү чиглүүлдэг
// байсан).
function formatNoticeDate(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function OfficialNoticeInbox({ hoaId }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    if (!hoaId || !user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: ownerRow } = await supabase.from('owners').select('id').eq('user_id', user.id).eq('tenant_id', hoaId).maybeSingle();
      if (!ownerRow) { setLoading(false); return; }
      const { data } = await supabase
        .from('official_notice_recipients')
        .select('id, read, read_at, created_at, official_notices(title, content, notice_type, sender)')
        .eq('tenant_id', hoaId).eq('owner_id', ownerRow.id)
        .order('created_at', { ascending: false });
      if (!cancelled) { setRows(data || []); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [hoaId, user?.id]);

  async function openNotice(row) {
    setOpenId(openId === row.id ? null : row.id);
    if (!row.read) {
      await supabase.from('official_notice_recipients').update({ read: true, read_at: new Date().toISOString() }).eq('id', row.id);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, read: true } : r)));
    }
  }

  return (
    <div>
      <div className="content-page-header" style={{ padding: '4px 0 12px' }}>
        <div className="content-page-title">Албан мэдэгдэл</div>
      </div>

      {loading ? (
        <div className="pool-empty">Ачаалж байна...</div>
      ) : rows.length === 0 ? (
        <div className="pool-empty">Мэдэгдэл алга</div>
      ) : (
        <div className="mobile-list-item">
          {rows.map((r, i) => {
            const n = r.official_notices || {};
            const isOpen = openId === r.id;
            return (
              <div
                key={r.id}
                onClick={() => openNotice(r)}
                style={{ padding: '11px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    {!r.read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />}
                    <span style={{ fontSize: 13.5, fontWeight: r.read ? 500 : 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>{formatNoticeDate(r.created_at)}</span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>{n.notice_type} • {n.sender}</div>
                {isOpen && (
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 8, whiteSpace: 'pre-wrap' }}>{n.content}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
