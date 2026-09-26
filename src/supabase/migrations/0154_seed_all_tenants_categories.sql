-- 2026-09-25 (88): Хэрэглэгчийн хүсэлтээр — "Орлогын ангилал"/
-- "Зарлагын ангилал" урьдчилан холбогдсон жагсаалт БүХ ОДОО БАЙГАА
-- tenant-д (зөвхөн Гэрлүг Виста БИШ) харагддаг болгоно. Тус бүр нь
-- дараа нь eөрсдийн онцлог ангиллаа чөлөөтэй нэмэх/устгах боломжтой
-- хэвээр үлдэнэ. income_subcategories/expense_subcategories-д
-- ХАРААХАН НЭГ Ч мөр байхгүй tenant бүрт л шинээр нэмнэ (аль хэдийн
-- eөрсдийн ангилалтай tenant-д давхардуулахгүй).
insert into income_subcategories (tenant_id, name, account_code, sort_order)
select t.id, x.name, x.account_code, x.sort_order
from tenants t
cross join (values
  ('Гишүүдийн татвар', '5110', -3),
  ('Түрээсийн орлого', '5410', -2),
  ('Бусад орлого', '5610', -1),
  ('Айл, эрх, зогсоол, агуулах', '5610', 0),
  ('Аж ахуйн нэгж', '5610', 1),
  ('Антены, лифтний самбарын түрээс', '5610', 2),
  ('Банкны хүүгийн орлого', '5610', 3),
  ('Зогсоолын хураамж', '5610', 4),
  ('Чипний орлого', '5610', 5),
  ('Ажилчдаас авах авлага', '5610', 6),
  ('Хохирлын нөхөн төлбөр', '5610', 7),
  ('Бусад', '5610', 8),
  ('Хаалтны хэтэрсэн хугацаа, түр зогсолтын төлбөр', '5610', 9)
) as x(name, account_code, sort_order)
where not exists (select 1 from income_subcategories isc where isc.tenant_id = t.id);

insert into expense_subcategories (tenant_id, name, account_code, sort_order)
select t.id, x.name, x.account_code, x.sort_order
from tenants t
cross join (values
  ('Цалин хүлсний зардал', '7010', 0),
  ('Нийгмийн даатгалын зардал', '7020', 1),
  ('Засвар үйлчилгээний зардал', '7030', 2),
  ('Тохижилтын зардал', '7040', 3),
  ('Цэвэрлэгээний зардал', '7050', 4),
  ('Бусад тогтмол зардал', '7060', 5),
  ('Элэгдлийн зардал', '7070', 6),
  ('Найдваргүй авлагын зардал', '7080', 7)
) as x(name, account_code, sort_order)
where not exists (select 1 from expense_subcategories esc where esc.tenant_id = t.id);
