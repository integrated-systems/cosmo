import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { PhoneCallIcon } from '../icons/Icons';

// 2026-08-31: Хэрэглэгчийн хүсэлт — "Утасны жагсаалт" (Гал түймэр,
// эмнэлэг, цагдаа зэрэг онцгой дугаараас эхлээд лифтчин/сантехник/
// цахилгаанчин зэрэг үйлчилгээний дугаар хүртэл) тенант СӨХ-ийн
// сисадминий бүрдүүлдэг жагсаалт. Дугаар дээр дарахад үүрэн утасны
// оператор руу шиддэг (native "tel:" линк) л хангалттай гэж
// хэрэглэгч тодруулав — call эхлүүлэх нэмэлт логик хэрэггүй.
export default function OwnerPhonebook({ hoaId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hoaId) return;
    supabase.from('tenant_phonebook').select('*').eq('tenant_id', hoaId).order('order_index').then(({ data }) => {
      setRows(data ?? []);
      setLoading(false);
    });
  }, [hoaId]);

  return (
    <div>
      <div className="content-page-header" style={{ padding: '4px 0 12px' }}>
        <div className="content-page-title">Утасны жагсаалт</div>
      </div>

      {loading && <div className="pool-empty">Ачаалж байна...</div>}
      {!loading && rows.length === 0 && <div className="pool-empty">Утасны жагсаалт одоогоор бүрдээгүй байна.</div>}

      <div className="mobile-list-item">
        {rows.map((r, i) => (
          <a
            key={r.id} href={`tel:${r.phone}`}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0',
              borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)', color: 'inherit', textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600 }}>{r.label}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
              {r.phone}
              <PhoneCallIcon width={14} height={14} />
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
