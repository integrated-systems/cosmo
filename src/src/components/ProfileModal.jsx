import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import Modal from './Modal';
import PasswordInput from './PasswordInput';

// "Профайл" — Topbar-ийн Settings dropdown-оос нээгддэг өврийн (self-
// service) нууц үг солих модаль — 2026-08-19 хэрэглэгчтэй тохиролцсон
// цоорхойг олж hэрэгжүүлэв. Үмнв зүгээр SUPERSYSADMIN л бусдын нууц үг
// сэргээж чаддаг байсан, харин хэрэглэгч өврвв өврийн нууц үгээ солих
// боломж огт байгаагүй байв. АЮУЛГүй БАЙДЛЫН ШИЙДВЭР: имэйл солих
// боломж ЭНД ч мвн ОГТ ОРУУЛААГүй (ResetPasswordPage.jsx-тэй ижил
// шалтгаанаар) — зүгээр l имэйлээ (унших зорилгоор) харуулна.
export default function ProfileModal({ open, onClose }) {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleClose() {
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess(false);
    onClose();
  }

  async function handleSave() {
    setError('');
    setSuccess(false);
    if (password.length < 6) {
      setError('Нууц үг хамгийн багадаа 6 тэмдэгттэй байх ёстой');
      return;
    }
    if (password !== confirmPassword) {
      setError('Хоёр нууц үг таарахгүй байна');
      return;
    }
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setPassword('');
    setConfirmPassword('');
    setSuccess(true);
  }

  return (
    <Modal open={open} onClose={handleClose} title="Профайл" size="sm" footer={
      <>
        <button className="ds-btn-secondary" onClick={handleClose}>Хаах</button>
        <button className="ds-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Хадгалж байна...' : 'Нууц үг солих'}</button>
      </>
    }>
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">И-мэйл</label>
          <input className="ds-input w-full" value={user?.email || ''} disabled />
          <div className="text-[10px] text-mutedtext mt-1">
            Имэйл үүгээр солигдохгүй — шаардлагатай бол СүХ-д биеэр ирж SISADMIN-аар сольж үзнэ vv.
          </div>
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Шинэ нууц үг</label>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-mutedtext mb-1">Шинэ нууц үг давтах</label>
          <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
        </div>
        {error && (
          <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-md text-xs text-customRed">{error}</div>
        )}
        {success && (
          <div className="px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-md text-xs text-customGreen">Нууц үг амжилттай солигдлоо.</div>
        )}
      </div>
    </Modal>
  );
}
