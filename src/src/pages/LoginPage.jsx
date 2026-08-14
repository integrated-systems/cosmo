import { useState } from 'react';

// suh.html-ийн login overlay-г (хэрэглэгчийн 2026-08-12 өгсөн 1loginpage.txt,
// гараар засварласан дизайн) React/Tailwind компонент болгож хөрвүүлсэн.
// TODO: Supabase auth холбогдоход handleSubmit-ийг бодит sb.auth.signInWithPassword
// дуудлагаар сольно — одоогоор зөвхөн UI+local state л.
export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    // TODO: бодит auth дуудлага
    setTimeout(() => {
      setLoading(false);
      onLogin?.({ email, remember });
    }, 600);
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-sidebg">
      <div className="w-[360px] rounded bg-appbg border border-bordercol px-7 py-10">
        {/* Лого */}
        <div className="text-center mb-8">
          <img src={`${import.meta.env.BASE_URL}logicon.png`} alt="COSMO" className="w-[70px] h-[70px] mx-auto mb-2.5 rounded-xl" />
          <div className="text-[16px] font-normal text-text tracking-[.02em]">COSMO™</div>
          <div className="text-[14px] text-darktext mt-1">Integrated Systems®</div>
        </div>

        {/* Форм */}
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
            <div className="relative">
              <input
                id="login-password" name="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 pr-10 bg-inputbg border border-blue-500/20 rounded-md text-text text-sm outline-none focus:border-blue-500/50"
              />
              <button
                type="button" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-mutedtext p-1 flex items-center"
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a19.6 19.6 0 015.06-6.06M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a19.5 19.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="mb-5 flex items-center gap-2">
            <input
              id="login-remember" type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
              className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
            />
            <label htmlFor="login-remember" className="text-xs text-mutedtext cursor-pointer select-none">Намайг сана</label>
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
