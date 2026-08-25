import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import AuthLogo from '../components/AuthLogo';
import PasswordInput from '../components/PasswordInput';

// "Нууц үг сэргээх" — 2026-08-19 хэрэглэгч тодорхой заасны дагуу
// үүсгэв. Имэйл дэх сэргээх линк дарахад Supabase "PASSWORD_RECOVERY"
// эвент шидэж түр (recovery) session үүсгэдэг — AuthContext.jsx энэ
// эвентийг барьж `passwordRecovery=true` болгодог. Энэ хуудас App.jsx-д
// БүХ бусад route-оос ӨМНӨ (хамгийн эрэмбэ өндүр нөхцөл) шалгагдана —
// LoginPage.jsx-тэй яг адил бүтэн дэлгэц (fixed inset-0) хэлбэртэй,
// учир нь энэ session нь ЗӨВХӨН шинэ нууц үг тохируулах зорилготой,
// хэрэглэгч энэ үе шатанд аль ч бусад хуудсыг харах ёсгүй.
//
// АЮУЛГүй БАЙДЛЫН ШИЙДВЭР (хэрэглэгчтэй тохиролцсон): энд ИМЭЙЛ солих
// боломж ОГТ ОРУУЛААГүй — сууц өмчлөгч зайнаас имэйлээ соливол, түүнийг
// нь төлөөлөөгүй хүн нэвтрэх эрхтэй болох эрсдэлтэй. Имэйл солих
// шаардлагатай бол СӨХ-д биеэр ирж SISADMIN-аар сольсон vv.
export default function ResetPasswordPage() {
  const { clearPasswordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Нууц үг хамгийн багадаа 6 тэмдэгттэй байх ёстой');
      return;
    }
    if (password !== confirmPassword) {
      setError('Хоёр нууц үг таарахгүй байна');
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-sidebg">
        <div className="w-[360px] rounded bg-appbg border border-bordercol px-7 py-10 text-center">
          <AuthLogo />
          <div className="mb-5 mt-2 px-3.5 py-2.5 bg-green-500/10 border border-green-500/30 rounded-md text-sm text-customGreen">
            Нууц үг амжилттай солигдлоо.
          </div>
          <button
            onClick={clearPasswordRecovery}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 border-none rounded-md text-white text-sm font-semibold tracking-[.02em] cursor-pointer transition-colors"
          >
            Үргэлжлүүлэх
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-sidebg">
      <div className="w-[360px] rounded bg-appbg border border-bordercol px-7 py-10">
        <AuthLogo />
        <div className="mb-5 text-center text-sm text-mutedtext">Шинэ нууц үгээ тохируулна уу</div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3.5">
            <label htmlFor="reset-password" className="block text-[10px] font-semibold text-mutedtext mb-1.5 uppercase tracking-[.06em]">
              Шинэ нууц үг
            </label>
            <PasswordInput id="reset-password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </div>

          <div className="mb-5">
            <label htmlFor="reset-password-confirm" className="block text-[10px] font-semibold text-mutedtext mb-1.5 uppercase tracking-[.06em]">
              Шинэ нууц үг давтах
            </label>
            <PasswordInput id="reset-password-confirm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
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
            Хадгалах
          </button>
          {loading && <div className="text-center mt-3 text-xs text-darktext">Хадгалж байна...</div>}
        </form>
      </div>
    </div>
  );
}
