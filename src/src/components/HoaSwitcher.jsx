// SUPERSYSADMIN-ийн "СӨХ context switch" — impersonation биш (2026-08-13
// хэрэглэгчтэй хийсэн ярианаас: SuperSysAdmin өөрийн session-оороо л
// өөр СӨХ-ны өгөгдлийг харна, тухайн СӨХ-ны admin-ийн session-ыг
// авдаггүй). Бодит impersonation (admin-ийн session шууд авах) хэрэгтэй
// болбол ЭНЭ dropdown-оос тусад нь, илүү хатуу баталгаажуулалттай
// (шалтгаан бичих г.м) тусгай үйлдэл болгоно.
//
// 2026-08-15: жагсаалт одоо Sidebar.jsx-ээс `useTenants()`-ээр (бодит
// "tenants" хүснэгэл) дамждаг — EXAMPLE_HOAS хуурамч жагсаалт устгав.

// Controlled component — сонгосон СӨХ-ны state Sidebar-т байрлана, учир нь
// сонголтоос хамааран SUPERSYSADMIN-ийн SaaS удирдлагын дэд цэс (Billing
// г.м) харагдах эсэхийг Sidebar тодорхойлно.
//
// 2026-08-13 хэрэглэгчийн тодорхой заавар: Sidebar-аас ГАРГАХГҮЙ, харин
// (1) дээд "СӨХ СОНГОХ" гарчиг label арилгав (dropdown өөрөө л энэ
// текстийг харуулна), (2) toolbar-ийн "Бүх байр"/"Бүх орц" dropdow-той
// босоо тэнхлэгийн дагуу яг нэг шугаманд байрлуулав (padding-top 22px =
// Topbar 50px-ийн ард content-wrap-ийн p-2.5(10px)+.ds-toolbar-ийн
// p-3(12px) = toolbar доторх select-ийн яг тэр өндөртэй тааруулсан).
// 2026-08-19 хэрэглэгчтэй тохиролцсон засвар: үмнв нь ЗӨВХӨН
// SUPERSYSADMIN үед л үзүүлдэг байсан тул, нэг tenant_admin 2+ tenant-д
// эрхтэй болсон ч switcher ОГТ гарч ирэхгүй байв (dropmires-ийн жишээгээр
// олдсон бодит алдаа). Одоо SUPERSYSADMIN үргэлж, энгийн хэрэглэгч 1-ээс
// олон tenant-д эрхтэй үед харагдана.
export default function HoaSwitcher({ isSuperSysAdmin, value, onChange, tenants = [] }) {
  if (!isSuperSysAdmin && tenants.length <= 1) return null;

  return (
    <div className="px-3 pt-[23px] pb-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="ds-select w-full"
      >
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </div>
  );
}
