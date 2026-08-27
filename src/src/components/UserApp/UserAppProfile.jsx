import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { DEFAULT_TENANT_ID } from '../../config/tenant';

// 2026-08-27: Хуучин "suh" (userapp-react) төслийн Профайл хуудсыг
// Cosmo стандартад (tenant_id, RLS, useUserAppPrefs) нийцүүлж бүрэн
// шилжүүлэв — хувийн мэдээлэл (owners хүснэгэлээс), Интерфейс тохиргоо
// (theme/дэвсгэр/картны тунгалагшил), Push notification (аль хэдийн
// дэвшилтэт зүйл #7-оор нэмэгдсэн), нууц үг солих.
//
// Хуучин кодоос НЭГ чухал аюулгүй байдлын сайжруулалт нэмэв: нууц үг
// солихдоо ОДООГИЙН нууц үгийг эхлээд баталгаажуулдаг (signInWithPassword)
// болгосон — өмнөх Cosmo хувилбар үүнийг шалгадаггүй байсан тул хэн нэг
// нэвтэрсэн session-ыг булаавал (жиш нь: халаасанд орхисон нээлттэй
// утас) шинэ нууц үг тавьж бүрмвсүн эзэмшлээс нь салгаж чадах эрсдэлтэй
// байв.
const BG_COLORS = [
  '#4a4a4a', '#af2c58', '#992c76', '#623396', '#3c3d92',
  '#016397', '#0559af', '#2f8b67', '#ff8a2b', '#78bd57',
];

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export default function UserAppProfile({ user, theme, onToggleTheme, prefs, uploadBgImage, savePrefs }) {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const { supported: pushSupported, subscribed, subscribe, unsubscribe } = usePushNotifications(hoaId);
  const fileInputRef = useRef(null);

  const [owner, setOwner] = useState(null);
  const [loadingOwner, setLoadingOwner] = useState(true);
  const [bgOpen, setBgOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  useEffect(() => {
    if (!user?.id || !hoaId) return;
    supabase.from('owners').select('*').eq('user_id', user.id).eq('tenant_id', hoaId).maybeSingle().then(({ data }) => {
      setOwner(data ?? null);
      setLoadingOwner(false);
    });
  }, [user?.id, hoaId]);

  async function toggleTheme() {
    onToggleTheme();
    await savePrefs({ theme: theme === 'dark' ? 'light' : 'dark' });
  }

  async function onPickImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const { error } = await uploadBgImage(file);
    if (error) alert('Зураг байршуулахад алдаа гарлаа: ' + error.message);
    e.target.value = '';
  }

  const phones = Array.isArray(owner?.phones) ? owner.phones.filter(Boolean) : [];
  const emails = Array.isArray(owner?.emails) ? owner.emails.filter(Boolean) : [];
  const parkings = Array.isArray(owner?.parkings) ? owner.parkings : [];
  const storages = Array.isArray(owner?.storages) ? owner.storages : [];
  const fullName = `${owner?.firstname || ''} ${owner?.lastname || ''}`.trim() || user?.email || '—';
  const infoRows = [
    ['Тоот', [owner?.building_no, owner?.floor, owner?.door_no].filter((v) => v != null && v !== '').join(' / ') || '—'],
    ['Талбай', owner?.sqm ? `${owner.sqm} м²` : '—'],
    ['Зогсоол', parkings.length ? String(parkings.length) : '—'],
    ['Агуулах', storages.length ? String(storages.length) : '—'],
  ];

  return (
    <div>
      <div className="content-page-header" style={{ padding: '4px 0 12px' }}>
        <div className="content-page-title">Профайл</div>
      </div>

      {!loadingOwner && owner && (
        <>
          <div className="mobile-list-item" style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{fullName}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {owner.door_no != null ? `${owner.door_no} тоот` : ''}{owner.sqm ? ` · ${owner.sqm} м²` : ''}
            </div>
          </div>

          <div className="section-title">Хэрэглэгчийн мэдээлэл</div>
          <div className="mobile-list-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Регистр</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{owner.regno || '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Утас</span>
              {phones.length
                ? <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    {phones.map((p, i) => <a key={i} href={`tel:${p}`} className="profile-value-link">{p}</a>)}
                  </span>
                : <span style={{ fontSize: 13, fontWeight: 700 }}>—</span>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>И-мэйл</span>
              {emails.length
                ? <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    {emails.map((em, i) => <a key={i} href={`mailto:${em}`} className="profile-value-link">{em}</a>)}
                  </span>
                : <span style={{ fontSize: 13, fontWeight: 700 }}>{user?.email || '—'}</span>}
            </div>
            {infoRows.map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{value}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {!loadingOwner && !owner && (
        <div className="mobile-list-item" style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user?.email}</div>
        </div>
      )}

      <div className="section-title">Тохиргоо</div>
      <div className="mobile-list-item settings-list">
        <div className="settings-row">
          <span>Dark / Light mode</span>
          <button className={`settings-toggle ${theme === 'light' ? 'on' : ''}`} onClick={toggleTheme} aria-label="Dark/Light mode">
            <span className="settings-toggle-dot" />
          </button>
        </div>
        {pushSupported && (
          <div className="settings-row">
            <span>Push notification</span>
            <button className={`settings-toggle ${subscribed ? 'on' : ''}`} onClick={subscribed ? unsubscribe : subscribe} aria-label="Push notification">
              <span className="settings-toggle-dot" />
            </button>
          </div>
        )}

        <div className="settings-row settings-row-link" onClick={() => setBgOpen((o) => !o)}>
          <span>Интерфейс</span>
          <span className="settings-row-arrow">{bgOpen ? '▲' : '▼'}</span>
        </div>
        {bgOpen && (
          <div className="profile-bg-panel">
            <div className="profile-bg-swatch-row">
              {BG_COLORS.map((hex) => (
                <button key={hex} className={`profile-bg-swatch ${prefs.bg_color === hex ? 'active' : ''}`}
                  style={{ background: hex }} onClick={() => savePrefs({ bg_color: hex, bg_image_path: null })} aria-label={hex} />
              ))}
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPickImage} />
              <button className="profile-bg-photo-btn" onClick={() => fileInputRef.current?.click()} aria-label="Альбомоос зураг сонгох">
                <CameraIcon />
              </button>
            </div>
            {prefs.bg_image_path && (
              <div className="profile-card-tint-row">
                <span className="tint-dot tint-dot-sharp" />
                <input type="range" min="0" max="20" value={prefs.bg_blur ?? 8} onChange={(e) => savePrefs({ bg_blur: +e.target.value })} />
                <span className="tint-dot tint-dot-blurred" />
              </div>
            )}
            {(prefs.bg_image_path || prefs.bg_color) && (
              <button className="profile-bg-remove-btn" onClick={() => savePrefs({ bg_image_path: null, bg_color: null })}>Дэвсгэрийг арилгах</button>
            )}
            {(prefs.bg_image_path || prefs.bg_color) && (
              <div className="profile-card-tint-row">
                <span className="tint-dot tint-dot-black" />
                <input type="range" className="range-bw" min="-50" max="50" value={prefs.bg_tint ?? 0} onChange={(e) => savePrefs({ bg_tint: +e.target.value })} />
                <span className="tint-dot tint-dot-white" />
              </div>
            )}
            <div className="profile-card-tint-row">
              <span className="tint-dot tint-dot-black" />
              <input type="range" className="range-bw" min="-50" max="50" value={prefs.card_tint ?? 0} onChange={(e) => savePrefs({ card_tint: +e.target.value })} />
              <span className="tint-dot tint-dot-white" />
            </div>
            <div className="profile-card-tint-row">
              <span className="tint-dot tint-dot-solid" />
              <input type="range" className="range-bt" min="0" max="90" value={prefs.card_transparency ?? 0} onChange={(e) => savePrefs({ card_transparency: +e.target.value })} />
              <span className="tint-dot tint-dot-hollow" />
            </div>
            <div className="profile-card-tint-row">
              <span className="tint-dot" style={{ background: '#000000' }} />
              <input type="range" className="range-bw" min="0" max="255" value={prefs.card_border_gray ?? 30} onChange={(e) => savePrefs({ card_border_gray: +e.target.value })} />
              <span className="tint-dot" style={{ background: '#ffffff', border: '1px solid var(--border-card)' }} />
            </div>
          </div>
        )}

        <div className="settings-row settings-row-link" onClick={() => setPwOpen((o) => !o)}>
          <span>Нууц үг солих</span>
          <span className="settings-row-arrow">{pwOpen ? '▲' : '▼'}</span>
        </div>
        {pwOpen && <ChangePassword user={user} onClose={() => setPwOpen(false)} />}
      </div>
    </div>
  );
}

function ChangePassword({ user, onClose }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  async function submit() {
    setErr('');
    if (next.length < 6) { setErr('Шинэ нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой'); return; }
    if (next !== confirm) { setErr('Шинэ нууц үг таарахгүй байна'); return; }
    setBusy(true);
    // 2026-08-27: одоогийн нууц үгийг эхлээд баталгаажуулна (доорх файлын
    // тайлбар харна уу) — булаагдсан session-оор нууц үг сольж эзэмшлээс
    // салгахаас хамгаална.
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
    if (signInErr) { setErr('Одоогийн нууц үг буруу байна'); setBusy(false); return; }
    const { error: updErr } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (updErr) { setErr('Алдаа гарлаа: ' + updErr.message); return; }
    setDone(true);
    setCurrent(''); setNext(''); setConfirm('');
    setTimeout(() => { setDone(false); onClose(); }, 2000);
  }

  return (
    <div className="profile-pw-panel">
      <label className="profile-pw-label">Одоогийн нууц үг</label>
      <input className="profile-edit-input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      <label className="profile-pw-label">Шинэ нууц үг</label>
      <input className="profile-edit-input" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
      <label className="profile-pw-label">Шинэ нууц үг (давтах)</label>
      <input className="profile-edit-input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      {err && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>{err}</div>}
      {done && <div style={{ color: 'var(--success)', fontSize: 12, marginTop: 6 }}>Амжилттай солигдлоо ✓</div>}
      <button className="login-btn" style={{ marginTop: 12 }} onClick={submit} disabled={busy}>
        {busy ? 'Хадгалж байна...' : 'Хадгалах'}
      </button>
    </div>
  );
}
