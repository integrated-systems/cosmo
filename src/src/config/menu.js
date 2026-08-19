// Хэрэглэгчийн 2026-08-12 өгсөн Notepad++ схемээс (7 бүлэг, 51 модуль) —
// багана 1 = Sidebar-т харагдах Монгол нэр, багана 2 = англи route/key нэр
// (эхнээсээ хэрэглэгчийн сонгосон нэршил, дараа өөрчлөгдвөл зөвхөн энд
// нэг л газар засна). Хуудсын дизайныг хэрэглэгч өөрөө маргаашаас эхлэн
// хийнэ — одоогоор бүгд PageInProgress ашиглана (Dashboard/Owners(өмнөх
// "Сууц өмчлөгчдийн холбоо" хууль ёсны нэр томьёотой нийцүүлж Owners гэж
// нэрлэсэн) л бүрэн бүтээгдсэн).
//
// 2026-08-13 хэрэглэгчийн заавраар: "ТЕХНИКИЙН УДИРДЛАГА" бүлэг бүрэн
// устгагдав. nfcgate/nfcent/lift(Хаалт/Чип/Лифт удирдлага)-ыг БҮРТГЭЛ
// рүү шилжүүлж, үлдсэн 8 модуль(Хяналтын камер/Дохиоллын удирдлага/
// Гэрэлтүүлэг/Ус шавхах-шахах насос/Агааржуулалт/Нөөцийн генератор/
// AirCond)-ийг түүнд харгалзах бүлгийн нэрийн хамт бүрэн устгав.
export const MENU_SECTIONS = [
  {
    title: 'ҮНДСЭН',
    items: [
      { key: 'dashboard', label: 'Хянах самбар', path: '/dashboard' },
      { key: 'news', label: 'Мэдээ, мэдээлэл', path: '/news' },
      { key: 'payments', label: 'Төлбөр төлөлт', path: '/payments' },
      { key: 'anndunn', label: 'Мэдэгдэл', path: '/anndunn' },
      { key: 'cccenter', label: 'CC center', path: '/cccenter' },
      { key: 'emails', label: 'Имэйл', path: '/emails' },
      { key: 'vat', label: 'ИБаримт', path: '/vat' },
    ],
  },
  {
    title: 'БҮРТГЭЛ',
    groupKey: 'hoaregistries',
    items: [
      { key: 'owners', label: 'Сууц өмчлөгч бүртгэл', path: '/owners' },
      { key: 'clientele', label: 'Талбай өмчлөгч бүртгэл', path: '/clientele' },
      { key: 'property', label: 'Тоот, Зогсоол, Агуулах', path: '/property' },
      { key: 'parking', label: 'Түр зогсоол бүртгэл', path: '/parking' },
      { key: 'dispatcher', label: 'Дуудлага бүртгэл', path: '/dispatcher' },
      { key: 'nfcgate', label: 'Хаалт удирдлага', path: '/nfcgate' },
      { key: 'nfcent', label: 'Чип удирдлага', path: '/nfcent' },
      { key: 'lift', label: 'Лифт удирдлага', path: '/lift' },
    ],
  },
  {
    title: 'ДОТООД ҮЙЛ АЖИЛЛАГАА',
    groupKey: 'hoamanager',
    items: [
      { key: 'hrm', label: 'Хүний нөөцийн удирдлага', path: '/hrm' },
      { key: 't&a', label: 'Цаг бүртгэл', path: '/ta' },
      { key: 'repairs', label: 'Засвар үйлчилгээ', path: '/repairs' },
      { key: 'maintenances', label: 'Тохижилт үйлчилгээ', path: '/maintenances' },
      { key: 'sanitations', label: 'Цэвэрлэгээ үйлчилгээ', path: '/sanitations' },
      { key: 'performance', label: 'Гүйцэтгэл', path: '/performance' },
      { key: 'providers', label: 'Харилцагчийн бүртгэл', path: '/providers' },
    ],
  },
  {
    title: 'САНХҮҮ',
    groupKey: 'hoatreasurer',
    items: [
      { key: 'accounting', label: 'Нягтлан бодох бүртгэл', path: '/accounting' },
      { key: 'repfintax', label: 'Санхүү, татварын тайлан', path: '/repfintax' },
      { key: 'repinner', label: 'Дотоод тайлан', path: '/repinner' },
      { key: 'payrollacc', label: 'Цалин бодолт', path: '/payrollacc' },
      { key: 'invoice', label: 'Нэхэмжлэх', path: '/invoice' },
      { key: 'transactions', label: 'Харилцахын гүйлгээ', path: '/transactions' },
    ],
  },
  {
    title: 'УДИРДАХ ЗӨВЛӨЛ ПОРТАЛ',
    groupKey: 'hoaboard',
    items: [
      { key: 'fixedassets', label: 'Үндсэн хөрөнгө бүртгэл', path: '/fixedassets' },
      { key: 'voting', label: 'Сонгууль, санал асуулга', path: '/voting' },
      { key: 'planing', label: 'Төлөвлөгөө', path: '/planing' },
      { key: 'repboard', label: 'Тайлан', path: '/repboard' },
    ],
  },
  {
    title: 'СИСАДМИН',
    groupKey: 'sysadmin',
    items: [
      { key: 'rolesrules', label: 'Хандах эрхийн тохиргоо', path: '/rolesrules' },
      { key: 'accounts', label: 'Хэрэглэгчийн удирдлага', path: '/accounts' },
      { key: 'uappconfig', label: 'UserApp тохиргоо', path: '/uappconfig' },
      { key: 'cosmorules', label: 'Cosmo rules', path: '/cosmorules' },
      { key: 'hoaconfig', label: 'СӨХ тохиргоо', path: '/hoaconfig' },
      { key: 'addressing', label: 'Хаягжилт тохиргоо', path: '/addressing' },
      { key: 'accconfig', label: 'НББ тохиргоо', path: '/accconfig' },
      { key: 'paymentconfig', label: 'Тариф тохиргоо', path: '/paymentconfig' },
      { key: 'fixedassconfig', label: 'Үндсэн хөрөнгө тохиргоо', path: '/fixedassconfig' },
      { key: 'restmarket', label: 'Real Estate market', path: '/restmarket' },
      { key: 'logs', label: 'Logs', path: '/logs' },
    ],
  },
];

// SUPERSYSADMIN (INTEGRATED SYSTEMS) — платформын дээд түвшний админ,
// tenant-level СИСАДМИН-аас тусад нь, sidebar-ийн доод хэсэгт тусдаа
// харагдана (7 бүлгийн жагсаалтад БИШ).
export const SUPERSYSADMIN = { key: 'supersysadmin', label: 'SUPERSYSADMIN', path: '/supersysadmin' };

// SUPERSYSADMIN-ийн СӨХ-специфик SaaS удирдлагын дэд цэс — HoaSwitcher-ээс
// тодорхой СӨХ сонгосон үед л харагдана (2026-08-13 хэрэглэгчтэй хийсэн
// ярианаас: Integrated Systems→hoa1 чиглэлийн төлбөр/эрх/багц, hoa1-ийн
// өөрийн оршин суугчид руу чиглэсэн PaymentConfig-тай АНДУУРАХГҮЙ).
// Нэрс зориудаар англиар — Монгол орчуулгаар ойлголтын зөрүү гарахгүйн тулд.
export const SUPERSYSADMIN_TENANT_ITEMS = [
  { key: 'billing', label: 'Billing', path: '/billing' },
  { key: 'renewal', label: 'Renewal', path: '/renewal' },
  { key: 'plan', label: 'Plan', path: '/plan' },
  { key: 'usage', label: 'Usage', path: '/usage' },
  { key: 'tenantstatus', label: 'Tenant Status', path: '/tenant-status' },
  { key: 'contract', label: 'Contract', path: '/contract' },
  { key: 'support', label: 'Support', path: '/support' },
];
