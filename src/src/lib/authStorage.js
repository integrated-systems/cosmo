// 2026-08-15: "Намайг сана" чекбокс өмнө бүрэн чимэглэл байсан (Supabase
// анхдагчаар үргэлж localStorage-д session хадгалдаг тул чекбоксын
// төлөв үүнд нөлөөлдөггүй байв). Стандарт "remember me" загвар:
// чекбокс ТЭМДЭГЛЭСЭН үед session-ыг localStorage-д (browser хаагдсаны
// дараа ч хадгалагдана), ТЭМДЭГЛЭЭГҮЙ үед sessionStorage-д (tab хаахад
// арилна) хадгална. Supabase client үүсгэхдээ `auth.storage`-т ЭНЭ
// wrapper-ыг өгч, аль storage-г ашиглахыг тогтмол localStorage-д
// хадгалсан НЭГ flag-аар шийднэ.
const REMEMBER_FLAG_KEY = 'cosmo-remember-me';

function getBackend() {
  return localStorage.getItem(REMEMBER_FLAG_KEY) === 'true' ? localStorage : sessionStorage;
}

export const authStorage = {
  getItem: (key) => getBackend().getItem(key),
  setItem: (key, value) => getBackend().setItem(key, value),
  removeItem: (key) => getBackend().removeItem(key),
};

// LoginPage-ийн handleSubmit-д signInWithPassword дуудахын өмнө дуудна.
export function setRememberMe(remember) {
  if (remember) {
    localStorage.setItem(REMEMBER_FLAG_KEY, 'true');
  } else {
    localStorage.removeItem(REMEMBER_FLAG_KEY);
  }
}
