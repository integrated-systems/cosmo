import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { setRememberMe } from '../lib/authStorage';
import AuthLogo from '../components/AuthLogo';
import PasswordInput from '../components/PasswordInput';

// suh.html-ийн login overlay-г React/Tailwind компонент болгож
// хөрвүүлсэн. 2026-08-15: handleSubmit бодит supabase.auth.signInWithPassword
// дуудлага хийдэг, "Намайг сана" чекбокс жинхэнэ storage-солих логиктой
// боллоо (authStorage.js). Лого+нууц үг талбарыг дахин ашиглагдах
// компонент (AuthLogo/PasswordInput) болгож задлав.
export default function LoginPage({ onSignUpClick }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Имэйл болон нууц үгээ бөглөнө γγ');
      return;
    }
    setLoading(true);
    // "Намайг сана" чекбоксын жинхэнэ логик — session хаана хадгалагдахыг
    // (localStorage=үргэлж/sessionStorage=tab хаатал) signInWithPassword
    // дуудахын өмнө шийднэ.
    setRememberMe(remember);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError(authError.message === 'Invalid login credentials'
        ? 'Имэйл эсвэл нууц үг буруу байна'
        : authError.message);
    }
    // Амжилттай бол AuthContext-ийн onAuthStateChange автоматаар session-ыг
    // шинэчилж App.jsx рүү дамжина — тусад нь onLogin callback хэрэггүй.
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-sidebg">
      <div className="w-[360px] rounded bg-appbg border border-bordercol px-7 py-10">
        <AuthLogo />

        <form onSubmit={handleSubmit} autoComplete="on">
          <div className="mb-4">
            <label htmlFor="login-email" className="block text-[10px] font-semibold text-mutedtext mb-1.5 uppercase tracking-[.06em]">
              Имэйл
            </label>
            <input
              id="login-email" name="email" type="email" placeholder="email@example.com"
              autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-inputbg border border-blue-500/20 rounded-md text-text text-sm outline-none focus:border-blue-500/50"
            />
          </div>

          <div className="mb-3.5">
            <label htmlFor="login-password" className="block text-[10px] font-semibold text-mutedtext mb-1.5 uppercase tracking-[.06em]">
              Нууц үг
            </label>
            <PasswordInput id="login-password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>

          <div className="mb-5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <input
                id="login-remember" type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
              />
              <label htmlFor="login-remember" className="text-xs text-mutedtext cursor-pointer select-none">Намайг сана</label>
            </div>
            <button
              type="button" onClick={onSignUpClick}
              className="bg-transparent border-none p-0 text-xs text-blue-500 hover:text-blue-400 cursor-pointer underline"
            >
              SIGN-UP
            </button>
          </div>

          {error && (
            <div className="mb-4 px-3.5 py-2.5 bg-red-500/10 border border-red-500/30 rounded-md text-xs text-customRed">
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 border-none rounded-md text-white text-sm font-semibold tracking-[.02em] cursor-pointer transition-colors"
          >
            Нэвтрэх
          </button>
          {loading && <div className="text-center mt-3 text-xs text-darktext">Нэвтэрч байна...</div>}
        </form>
      </div>
    </div>
  );
}
