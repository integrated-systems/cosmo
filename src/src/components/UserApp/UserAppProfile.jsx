import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

// 2026-08-19: резидентийн энгийн Профайл хуудас — the2m26/suh-ийн
// settings-list/settings-row дизайныг ашиглав. Үвр төслийн Push
// notification/background-тохиргоо зэрэг НАРИЙВЧЛАЛТАЙ хэсгүүдийг ОДООГООР
// оруулаагүй (Cosmo-д тэдгээрийн backend байхгүй) — зүгээр l үндсэн
// self-service нууц үг солих боломж (аль хэдийн admin талд ProfileModal.jsx-д
// баталгаажсан адил зарчим: имэйл солих боломжгүй, зввгүар нууц үг).
export default function UserAppProfile({ user, theme, onToggleTheme }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setError('');
    setSuccess(false);
    if (password.length < 6) { setError('Нууц үг хамгийн багадаа 6 тэмдэгттэй байх ёстой'); return; }
    if (password !== confirmPassword) { setError('Хоёр нууц үг таарахгүй байна'); return; }
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) { setError(updateError.message); return; }
    setPassword('');
    setConfirmPassword('');
    setSuccess(true);
  }

  return (
    <div>
      <div className="content-page-header" style={{ padding: '4px 0 12px' }}>
        <div className="content-page-title">Профайл</div>
      </div>

      <div className="settings-list mobile-list-item">
        <div className="settings-row">
          <span>И-мэйл</span>
          <span className="profile-value-link">{user?.email}</span>
        </div>
        <div className="settings-row">
          <span>Тема</span>
          <button className="settings-toggle-dot" style={{ position: 'static', background: 'none', width: 'auto', height: 'auto' }} onClick={onToggleTheme}>
            {theme === 'dark' ? '🌙 Харанхүй' : '☀️ Цайвар'}
          </button>
        </div>
      </div>

      <div className="section-title" style={{ marginTop: 18 }}>Нууц үг солих</div>
      <div className="mobile-list-item">
        <label className="profile-pw-label">Шинэ нууц үг</label>
        <input type="password" className="profile-edit-input" style={{ width: '100%', marginTop: 4, marginBottom: 10 }}
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <label className="profile-pw-label">Шинэ нууц үг давтах</label>
        <input type="password" className="profile-edit-input" style={{ width: '100%', marginTop: 4, marginBottom: 10 }}
          value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        {error && <div className="login-error">{error}</div>}
        {success && <div style={{ color: 'var(--success)', fontSize: 12, marginTop: 6 }}>Нууц үг амжилттай солигдлоо.</div>}
        <button className="login-btn" style={{ marginTop: 12 }} onClick={handleSave} disabled={saving}>
          {saving ? 'Хадгалж байна...' : 'Нууц үг солих'}
        </button>
      </div>
    </div>
  );
}
