import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

// 2026-08-31: Хэрэглэгчийн хүсэлт — "СӨХ-ны тухай" тайл. Тенант
// сисадминий бүрдүүлдэг СӨХ-ийн хаяг/дансны мэдээлэл/танилцуулга
// текст, owner-т ЗӨВХӨН УНШИХ горимоор үзүүлнэ.
export default function OwnerAbout({ hoaId }) {
  const [about, setAbout] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hoaId) return;
    supabase.from('tenant_about').select('*').eq('tenant_id', hoaId).maybeSingle().then(({ data }) => {
      setAbout(data ?? null);
      setLoading(false);
    });
  }, [hoaId]);

  const rows = about ? [
    ['Хаяг', about.address],
    ['Банк', about.bank_name],
    ['Дансны дугаар', about.bank_account],
    ['Утас', about.phone],
    ['И-мэйл', about.email],
  ].filter(([, v]) => v) : [];

  return (
    <div>
      <div className="content-page-header" style={{ padding: '4px 0 12px' }}>
        <div className="content-page-title">СӨХ-ны тухай</div>
      </div>

      {loading && <div className="pool-empty">Ачаалж байна...</div>}
      {!loading && !about && <div className="pool-empty">СӨХ-ны мэдээлэл одоогоор бүрдээгүй байна.</div>}

      {!loading && about && (
        <>
          {rows.length > 0 && (
            <div className="mobile-list-item" style={{ marginBottom: 12 }}>
              {rows.map(([label, value], i) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, textAlign: 'right' }}>{value}</span>
                </div>
              ))}
            </div>
          )}
          {about.intro_text && (
            <div className="mobile-list-item">
              <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{about.intro_text}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
