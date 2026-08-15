import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Modal from '../components/Modal';

// LoginPage.jsx-ийн дизайныг хуулбарлаж бүтээсэн Sign-Up хуудас (2026-08-15
// хэрэглэгчийн заасан screenshot загварын дагуу). "Гэрээний нөхцөлтэй
// танилцах" линк дарахад Modal.jsx-ийн шинэ "xl" хэмжээгээр (max
// 900×1200px, жижиг дэлгэцэд уян хатан) гэрээний текст скроллдог картаар
// харагдана. Чекбокс тэмдэглэгдээгүй бол "Бүртгүүлэх" товч идэвхгүй.
export default function SignUpPage({ onBackToLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Имэйл болон нууц үгээ бөглөнө үү');
      return;
    }
    if (!agreed) return;
    setLoading(true);
    const { error: authError } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setSuccess(true);
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-sidebg">
      <div className="w-[360px] rounded bg-appbg border border-bordercol px-7 py-10">
        {/* Лого */}
        <div className="text-center mb-8">
          <img src={`${import.meta.env.BASE_URL}logicon.png`} alt="COSMO" className="w-[70px] h-[70px] mx-auto mb-2.5 rounded-xl" />
          <div className="text-[16px] font-normal text-text tracking-[.02em]">COSMO</div>
          <div className="text-[14px] text-darktext mt-1">Integrated Systems</div>
        </div>

        {success ? (
          <div className="text-center">
            <div className="text-sm text-text mb-2">Бүртгэл амжилттай үүсгэгдлээ.</div>
            <div className="text-xs text-mutedtext mb-6">Имэйл хаягаа шалгаж баталгаажуулна уу.</div>
            <button
              type="button" onClick={onBackToLogin}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 border-none rounded-md text-white text-sm font-semibold tracking-[.02em] cursor-pointer transition-colors"
            >
              Нэвтрэх хуудас руу буцах
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} autoComplete="on">
            <div className="mb-4">
              <label htmlFor="signup-email" className="block text-[10px] font-semibold text-mutedtext mb-1.5 uppercase tracking-[.06em]">
                И-мэйл
              </label>
              <input
                id="signup-email" name="email" type="email" placeholder="email@example.com"
                autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-inputbg border border-blue-500/20 rounded-md text-text text-sm outline-none focus:border-blue-500/50"
              />
            </div>

            <div className="mb-3.5">
              <label htmlFor="signup-password" className="block text-[10px] font-semibold text-mutedtext mb-1.5 uppercase tracking-[.06em]">
                Нууц үг
              </label>
              <div className="relative">
                <input
                  id="signup-password" name="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                  autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)}
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

            <div className="mb-2">
              <button
                type="button" onClick={() => setShowContract(true)}
                className="bg-transparent border-none p-0 text-xs text-blue-500 hover:text-blue-400 cursor-pointer underline"
              >
                Гэрээний нөхцөлтэй танилцах
              </button>
            </div>

            <div className="mb-5 flex items-center gap-2">
              <input
                id="signup-agree" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
              />
              <label htmlFor="signup-agree" className="text-xs text-mutedtext cursor-pointer select-none">Гэрээний нөхцлийг хүлээн зөвшөөрч байна</label>
            </div>

            {error && (
              <div className="mb-4 px-3.5 py-2.5 bg-red-500/10 border border-red-500/30 rounded-md text-xs text-customRed">
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading || !agreed}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed border-none rounded-md text-white text-sm font-semibold tracking-[.02em] cursor-pointer transition-colors"
            >
              Бүртгүүлэх
            </button>
            {loading && <div className="text-center mt-3 text-xs text-darktext">Бүртгэж байна...</div>}

            <div className="text-center mt-5">
              <button
                type="button" onClick={onBackToLogin}
                className="bg-transparent border-none p-0 text-xs text-mutedtext hover:text-text cursor-pointer underline"
              >
                Нэвтрэх хуудас руу буцах
              </button>
            </div>
          </form>
        )}
      </div>

      <Modal open={showContract} onClose={() => setShowContract(false)} title="Гэрээний нөхцөл" size="xl">
        <div className="whitespace-pre-line leading-relaxed max-h-[70vh] overflow-y-auto pr-1">
          {CONTRACT_TEXT}
        </div>
      </Modal>
    </div>
  );
}

// TODO: доорх текст ЖИШЭЭ (placeholder) гэрээ — хуулийн зөвлөхөөр
// баталгаажуулсан эцсийн эх бичвэрээр солих шаардлагатай.
const CONTRACT_TEXT = `ҮЙЛЧИЛГЭЭ ҮЗҮҮЛЭХ ГЭРЭЭ

1. ЕРӨНХИЙ ЗААЛТ
1.1. Энэхүү гэрээ нь "Integrated Systems" ХХК (цаашид "Үйлчилгээ үзүүлэгч" гэх) болон Cosmo системд бүртгүүлж буй Сууц Өмчлөгчдийн Холбоо (цаашид "Хэрэглэгч" гэх) хоорондын харилцааг зохицуулна.
1.2. Хэрэглэгч бүртгэл үүсгэснээр энэхүү гэрээний нөхцлийг бүрэн хүлээн зөвшөөрсөнд тооцно.

2. ҮЙЛЧИЛГЭЭНИЙ ТОДОРХОЙЛОЛТ
2.1. Cosmo нь олон Сууц Өмчлөгчдийн Холбооны бүртгэл, санхүү, харилцаа холбоог нэгдсэн системд удирдах зориулалттай программ хангамж (SaaS) юм.
2.2. Үйлчилгээ үзүүлэгч нь системийн тасралтгүй ажиллагаа, өгөгдлийн аюулгүй байдлыг ханган ажиллана.

3. ХЭРЭГЛЭГЧИЙН БҮРТГЭЛ БА НУУЦ ҮГ
3.1. Хэрэглэгч өөрийн бүртгэлийн мэдээллийг үнэн зөв бөглөх үүрэгтэй.
3.2. Нэвтрэх нэр, нууц үгийн нууцлалыг хадгалах хариуцлага Хэрэглэгчид хамаарна.
3.3. Хэрэглэгчийн бүртгэлээр дамжуулан хийгдсэн үйлдлийг Хэрэглэгч өөрөө хариуцна.

4. ТӨЛБӨР, БАГЦ, СУНГАЛТ
4.1. Үйлчилгээний хураамжийн хэмжээ, төлбөрийн нөхцөл нь сонгосон багц (Plan)-аас хамаарна.
4.2. Багцын хугацаа дуусахаас өмнө сунгах эсэхийг Хэрэглэгч шийднэ.
4.3. Төлбөр хугацаандаа төлөгдөөгүй тохиолдолд Үйлчилгээ үзүүлэгч Хэрэглэгчийн эрхийг түр хугацаагаар зогсоох эрхтэй.

5. МЭДЭЭЛЛИЙН АЮУЛГҮЙ БАЙДАЛ, НУУЦЛАЛ
5.1. Хэрэглэгчийн болон түүний оршин суугчдын хувийн мэдээллийг Үйлчилгээ үзүүлэгч зөвхөн гэрээнд заасан зорилгоор ашиглана.
5.2. Гуравдагч этгээдэд мэдээлэл дамжуулахдаа холбогдох хууль тогтоомжийг дагаж мөрдөнө.
5.3. Мэдээллийн аюулгүй байдлыг хангах техникийн болон зохион байгуулалтын арга хэмжээг Үйлчилгээ үзүүлэгч авч хэрэгжүүлнэ.

6. ОРОЛЦОГЧ ТАЛУУДЫН ҮҮРЭГ
6.1. Хэрэглэгч системд оруулсан мэдээллийн үнэн зөв, бодит байдлыг хариуцна.
6.2. Үйлчилгээ үзүүлэгч системийн тогтвортой ажиллагааг хангахын тулд шаардлагатай засвар, шинэчлэлтийг хийх эрхтэй.

7. ХАРИУЦЛАГЫН ХЯЗГААРЛАЛТ
7.1. Үйлчилгээ үзүүлэгч нь Хэрэглэгчийн буруутай үйлдлээс үүдэн гарсан хохирлыг хариуцахгүй.
7.2. Давагдашгүй хүчин зүйлийн улмаас үйлчилгээ түр зогссон тохиолдолд талууд харилцан ойлголцоно.

8. ГЭРЭЭГ ЦУЦЛАХ, ДУУСГАВАР БОЛГОХ
8.1. Хэрэглэгч хүссэн үедээ бүртгэлээ цуцлах хүсэлт гаргах эрхтэй.
8.2. Гэрээ цуцлагдсанаас хойш Хэрэглэгчийн мэдээллийг хууль тогтоомжид заасан хугацаагаар хадгална.

9. БУСАД ЗААЛТ
9.1. Энэхүү гэрээнд өөрчлөлт оруулах тохиолдолд Үйлчилгээ үзүүлэгч Хэрэглэгчид урьдчилан мэдэгдэнэ.
9.2. Гэрээтэй холбоотой маргааныг талууд эв зүйгээр, эс бөгөөс Монгол Улсын хууль тогтоомжийн дагуу шийдвэрлэнэ.`;
