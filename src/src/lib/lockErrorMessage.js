// 2026-09-04 (13): Section-lock (RLS) зврчлийн алдааг тусад нь таньж,
// хэрэглэгчид ойлгомжтой мессеж үзүүлнэ. Бусад (техникийн) алдааны
// үед хуучин ерөнхий загвар хэвээрээ хэвлэгдэнэ.
export function friendlyErrorMessage(error, fallbackPrefix = 'Хадгалахад алдаа гарлаа') {
  if (!error) return '';
  const msg = error.message || '';
  if (msg.includes('row-level security policy') || error.code === '42501') {
    return 'Энэ хуудсыг санамсаргүй тохиолдлоор эвдэх, өөрчлөхвэс сэргийлж цоожилсон тул программ хвгжүүлэгчид хандана уу.';
  }
  return `${fallbackPrefix}: ${msg}\n\n⚠️ Хуучин мэдээлэл аль хэдийн уссан байж болзошгүй — хуудасыг дахин ачаалж шалгана уу.`;
}
