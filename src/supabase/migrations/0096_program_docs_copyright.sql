-- 2026-09-08 (2): "Программын тухай" хуудсанд "Зохиогчийн эрх" таб
-- нэмэв (Хөгжүүлсэн логийн баруун тал) — ганц карттай, устгах/нуух
-- шаардлагагүй, зөвхөн Засах үйлдэлтэй. Стандарт эх бэлтгэж seed хийв.
alter table program_docs drop constraint if exists program_docs_doc_type_check;
alter table program_docs add constraint program_docs_doc_type_check
  check (doc_type in ('guide', 'changelog', 'copyright'));

insert into program_docs (doc_type, title, content, is_published, sort_order)
select 'copyright', 'Зохиогчийн эрх', $content$# Зохиогчийн эрх

© 2026 Integrated Systems. Бүх эрх хуулиар хамгаалагдсан.

Энэхүү "Cosmo" систем (програм хангамж, дизайн, эх код, лого, брэнд нэр орно) нь Integrated Systems компанийн зохиогчийн эрхээр хамгаалагдсан бүтээгдэхүүн бөгөөд Монгол Улсын Зохиогчийн эрх болон Холбогдох эрхийн тухай хууль, мөн олон улсын холбогдох гэрээ конвенцоор хамгаалагддаг.

## Ашиглах эрх

Энэхүү системийг зөвхөн хууль ёсны эрх бүхий хэрэглэгч (СӨХ, тэдгээрийн ажилтан) ашиглах эрхтэй бөгөөд Integrated Systems компанийн бичгэн зөвшөөрлгүйгээр дараах үйлдлийг хориглоно:

- Эх кодыг хуулбарлах, задлан шинжлэх (reverse engineering)
- Загвар, интерфэйсийг дуурайлган бүтээх
- Гуравдагч этгээдэд шилжүүлэх, дахин зарах

## Мэдээллийн нууцлал

Системд оруулсан tenant (СӨХ) бүрийн мэдээлэл нь тухайн СӨХ-ны ӨМЧ бөгөөд Integrated Systems зөвхөн үйлчилгээ үзүүлэх зорилгоор хадгалж, боловсруулна.

## Холбоо барих

Асуулт, санал хүсэлтээ дараах хаягаар илгээнэ үү: info@integratedsystems.mn
$content$, true, 0
where not exists (select 1 from program_docs where doc_type = 'copyright');
