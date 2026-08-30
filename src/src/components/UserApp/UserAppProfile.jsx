import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { DEFAULT_TENANT_ID } from '../../config/tenant';
import { PRESET_BACKGROUNDS } from '../../config/presetBackgrounds';
import { formatUnitLabel } from '../../lib/ownersFormat';

// 2026-08-27: Хуучин "suh" (userapp-react) төслийн Профайл хуудсыг
// Cosmo стандартад (tenant_id, RLS, useUserAppPrefs) нийцүүлж бүрэн
// шилжүүлэв — хувийн мэдээлэл (owners хүснэгэлээс), Интерфейс тохиргоо
// (theme/дэвсгэр/картны тунгалагшил), Push notification (аль хэдийн
// дэвшилтэт зүйл #7-оор нэмэгдсэн), нууц үг солих.
//
// Хуучин кодоос НЭГ чухал аюулгүй байдлын сайжруулалт нэмэв: нууц үг
// солихдоо ОДООГИЙН нууц үгийг эхлээд баталгаажуулдаг (signInWithPassword)
// болгосон — өмнвх Cosmo хувилбар үүнийг шалгадаггүй байсан тул хэн нэг
// нэвтэрсэн session-ыг булаавал (жиш нь: халаасанд орхисон нээлттэй
// утас) шинэ нууц үг тавьж бүрмөсөн эзэмшлээс нь салгаж чадах эрсдэлтэй
// байв.
//
// 2026-08-28: Дэвсгэр зургийг ГАДНААС IMPORT хийх боломжийг (upload
// товч, файл сонгогч) хэрэглэгчийн хүсэлтээр бүрмөсөн хаав — зөвхөн
// программд БАГТААСАН 6 бэлэн зургаас сонгодог болов (PRESET_BACKGROUNDS).
const BG_COLORS = [
  '#000000', '#af2c58', '#992c76', '#623396', '#3c3d92',
  '#016397', '#0559af', '#2f8b67', '#ff8a2b', '#78bd57',
  '#ffffff',
];

export default function UserAppProfile({ user, theme, onToggleTheme, prefs, savePrefs }) {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const { supported: pushSupported, subscribed, subscribe, unsubscribe } = usePushNotifications(hoaId);

  const [owner, setOwner] = useState(null);
  const [unitLabel, setUnitLabel] = useState(null);
  const [loadingOwner, setLoadingOwner] = useState(true);
  const [bgOpen, setBgOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  useEffect(() => {
    if (!user?.id || !hoaId) return;
    Promise.all([
      supabase.from('owners').select('*').eq('user_id', user.id).eq('tenant_id', hoaId).maybeSingle(),
      // 2026-08-28: "Хаягжилт тохиргоо"-д тохируулсан форматыг (Байр-
      // Давхар-Тоот эсвэл Байр-Орц-Тоот) яг ижил ашиглана.
      supabase.from('unit_layouts').select('building_no,floor,door_no,structure_type,entrance_no').eq('tenant_id', hoaId),
    ]).then(([{ data }, { data: layouts }]) => {
      setOwner(data ?? null);
      if (data) {
        const layoutRow = (layouts ?? []).find((u) => u.building_no === data.building_no && u.floor === data.floor && u.door_no === data.door_no);
        setUnitLabel(formatUnitLabel(data.building_no, layoutRow?.structure_type, data.floor, layoutRow?.entrance_no, data.door_no));
      }
      setLoadingOwner(false);
    });
  }, [user?.id, hoaId]);

  async function toggleTheme() {
    onToggleTheme();
    await savePrefs({ theme: theme === 'dark' ? 'light' : 'dark' });
  }

  const phones = Array.isArray(owner?.phones) ? owner.phones.filter(Boolean) : [];
  const emails = Array.isArray(owner?.emails) ? owner.emails.filter(Boolean) : [];
  const parkings = Array.isArray(owner?.parkings) ? owner.parkings : [];
  const storages = Array.isArray(owner?.storages) ? owner.storages : [];
  const fullName = `${owner?.firstname || ''} ${owner?.lastname || ''}`.trim() || user?.email || '—';
  const infoRows = [
    ['Тоот', unitLabel || '—'],
    ['Талбай', owner?.sqm ? `${owner.sqm} м²` : '—'],
    ['Зогсоол', parkings.length ? String(parkings.length) : '—'],
    ['Агуулах', storages.length ? String(storages.length) : '—'],
  ];

  return (
    <div>
      {/* 2026-08-30 ЗАЛРУУЛГА: хэрэглэгч тодруулав — зөвхөн "Профайл"
          ХУУДАСНЫ ГАРЧГИЙГ л арилгах ёстой байсан (доод tab-д "Profile"
          гэж бичигдсэн байгаа тул илүүц), "ХЭРЭГЛЭГЧИЙН МЭДЭЭЛЭЛ" карт
          (Регистр/Утас/И-мэйл хамт) хэвээрээ үлдэх ёстой. ҮҮнийг
          буцаав — зөвхөн "Тоот" мврийн форматыг л шинэчилсэн хэвээр. */}
      {!loadingOwner && owner && (
        <>
          <div className="mobile-list-item" style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{fullName}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{unitLabel}</div>
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
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Леир 1 — Дэвсгэр зураг</div>
            <div className="profile-bg-swatch-row">
              {PRESET_BACKGROUNDS.map((bg) => (
                <button
                  key={bg.id}
                  className={`profile-bg-swatch ${prefs.bg_preset === bg.id ? 'active' : ''}`}
                  style={{ backgroundImage: `url(/cosmo/backgrounds/${bg.file})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                  onClick={() => savePrefs({ bg_preset: bg.id, bg_color: null })}
                  aria-label={bg.label}
                />
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '14px 0 4px' }}>Леир 1 — Дэвсгэр өнгө</div>
            <div className="profile-bg-swatch-row">
              {BG_COLORS.map((hex) => (
                <button key={hex} className={`profile-bg-swatch ${prefs.bg_color === hex ? 'active' : ''}`}
                  style={{ background: hex }} onClick={() => savePrefs({ bg_color: hex, bg_preset: null })} aria-label={hex} />
              ))}
            </div>
            {(prefs.bg_preset || prefs.bg_color) && (
              <button className="profile-bg-remove-btn" onClick={() => savePrefs({ bg_preset: null, bg_color: null })}>Дэвсгэрийг арилгах</button>
            )}

            <div style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '14px 0 4px' }}>Слайдер 1 — Дэвсгэр дээрх хар давхарга</div>
            <div className="profile-card-tint-row">
              <span className="tint-dot tint-dot-sharp" />
              <input type="range" className="range-bt" min="0" max="100" value={prefs.bg_tint ?? 0} onChange={(e) => savePrefs({ bg_tint: +e.target.value })} />
              <span className="tint-dot" style={{ background: '#000000' }} />
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '14px 0 4px' }}>Слайдер 2 — Дэвсгэрийн blur</div>
            <div className="profile-card-tint-row">
              <span className="tint-dot tint-dot-sharp" />
              <input type="range" className="range-bt" min="0" max="100" value={prefs.bg_blur ?? 0} onChange={(e) => savePrefs({ bg_blur: +e.target.value })} />
              <span className="tint-dot tint-dot-blurred" />
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '18px 0 4px' }}>Леир 4 — Тайл/картны өнгө</div>
            <div className="profile-bg-swatch-row">
              {BG_COLORS.map((hex) => (
                <button key={hex} className={`profile-bg-swatch ${prefs.card_color === hex ? 'active' : ''}`}
                  style={{ background: hex }} onClick={() => savePrefs({ card_color: hex })} aria-label={hex} />
              ))}
            </div>
            {prefs.card_color && (
              <button className="profile-bg-remove-btn" onClick={() => savePrefs({ card_color: null })}>Тайлын өнгийг арилгах</button>
            )}

            <div style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '14px 0 4px' }}>Слайдер 3 — Тайл/картны өнгөний тунгалагшил</div>
            <div className="profile-card-tint-row">
              <span className="tint-dot tint-dot-hollow" />
              <input type="range" className="range-bt" min="0" max="100" value={prefs.card_fill_opacity ?? 100} onChange={(e) => savePrefs({ card_fill_opacity: +e.target.value })} />
              <span className="tint-dot tint-dot-solid" />
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '14px 0 4px' }}>Слайдер 4 — Тайл/картны хар давхарга</div>
            <div className="profile-card-tint-row">
              <span className="tint-dot tint-dot-hollow" />
              <input type="range" className="range-bt" min="0" max="100" value={prefs.card_wash_opacity ?? 0} onChange={(e) => savePrefs({ card_wash_opacity: +e.target.value })} />
              <span className="tint-dot" style={{ background: '#000000' }} />
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '14px 0 4px' }}>Слайдер 5 — Тайл/картны хүрээний өнгө</div>
            <div className="profile-card-tint-row">
              <span className="tint-dot" style={{ background: '#000000' }} />
              <input type="range" className="range-bw" min="0" max="255" value={prefs.card_border_gray ?? 30} onChange={(e) => savePrefs({ card_border_gray: +e.target.value })} />
              <span className="tint-dot" style={{ background: '#ffffff', border: '1px solid var(--border-card)' }} />
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '14px 0 4px' }}>Слайдер 6 — Тайл/карт/Hero-ийн булангийн радиус</div>
            <div className="profile-card-tint-row">
              <span className="tint-dot" style={{ borderRadius: 3, background: 'var(--border-card)' }} />
              <input type="range" min="4" max="30" value={prefs.card_radius ?? 20} onChange={(e) => savePrefs({ card_radius: +e.target.value })} />
              <span className="tint-dot" style={{ borderRadius: '50%', background: 'var(--border-card)' }} />
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
