-- Integrated Systems (Cosmo) — "Мэдээ, мэдээлэл" (/news) хуудасны
-- мэдээ бичих засварлагчийг markdown-твстэй raw тэмдэглэгээ (**bold**,
-- {{color:x}}...{{/color}}) systemees vндсээр нь ЖИНХЭНЭ WYSIWYG
-- (contentEditable) руу шилжvvлэв — 2026-08-19 хэрэглэгч тодорхой
-- заасан: "зvгээр юу харагдана тvvнийг нийтэлнэ" гэсэн дvрэм, энгийн
-- захын менежерт ойлгомжтой байх ёстой. Markdown систем эмзэг, raw
-- тэмдэглэгээ бvтэн харагдах, Tab автоматаар алдагдах зэрэг олон
-- будлиан vvсгэж байсныг олж, vндсээр нь vвчилсэн шийдэл.
alter table news add column if not exists body_html text;

-- body_text хэвээрээ vлдэнэ (хайлт/plain-text хураангуйд ашиглагдана) —
-- шинэ мэдээ бичихэд body_html-ээс plain-text гарган автоматаар
-- нийлvvлж хадгална. Хуучин мэдээнvvд body_html=NULL хэвээрээ vлдэж,
-- харуулах тал (News.jsx) хуучин markdown-parse логикоор нь vзvvлнэ
-- (backward compatible).
