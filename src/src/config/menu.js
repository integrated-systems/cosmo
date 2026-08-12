// Хэрэглэгчийн 2026-08-12 өгсөн Notepad++ схемээс (7 бүлэг, 51 модуль) —
// баганa 1 = Sidebar-т харагдах Монгол нэр, багана 2 = англи route/key нэр
// (эхнээсээ хэрэглэгчийн сонгосон нэршил, дараа өөрчлөгдвөл зөвхөн энд
// нэг л газар засна). Хуудсын дизайныг хэрэглэгч өөрөө маргаашаас эхлэн
// хийнэ — одоогоор бүгд PageInProgress ашиглана (Dashboard/Owners(өмнөх
// Residents) л бүрэн бүтээгдсэн).
export const MENU_SECTIONS = [
  {
    title: 'ҮНДСЭН',
    items: [
      { key: 'Dashboard', label: 'Хянах самбар', path: '/dashboard' },
      { key: 'News', label: 'Мэдээ, мэдээлэл', path: '/news' },
      { key: 'Payments', label: 'Төлбөр төлөлт', path: '/payments' },
      { key: 'anndunn', label: 'Зарлал, мэдэгдэл', path: '/anndunn' },
      { key: 'CCcenter', label: 'CC center', path: '/cccenter' },
      { key: 'concierge', label: 'Консьерж үйлчилгээ', path: '/concierge' },
      { key: 'Emails', label: 'Имэйл', path: '/emails' },
      { key: 'VAT', label: 'ИБаримт', path: '/vat' },
    ],
  },
  {
    title: 'БҮРТГЭЛ',
    groupKey: 'HOAREGISTRIES',
    items: [
      { key: 'Owners', label: 'Сууц өмчлөгч бүртгэл', path: '/owners' },
      { key: 'Clientele', label: 'Аж ахуйн нэгж бүртгэл', path: '/clientele' },
      { key: 'Property', label: 'Тоот, зогсоол, агуулах', path: '/property' },
      { key: 'Parking', label: 'Түр зогсоол бүртгэл', path: '/parking' },
      { key: 'Dispatcher', label: 'Дуудлага бүртгэл', path: '/dispatcher' },
    ],
  },
  {
    title: 'ТЕХНИКИЙН УДИРДЛАГА',
    groupKey: 'HOATECHNICIAN',
    items: [
      { key: 'NFCGate', label: 'Хаалт удирдлага', path: '/nfcgate' },
      { key: 'NFCEnt', label: 'Чип удирдлага', path: '/nfcent' },
      { key: 'Lift', label: 'Лифт удирдлага', path: '/lift' },
      { key: 'SeCam', label: 'Хяналтын камер', path: '/secam' },
      { key: 'AlarmSys', label: 'Дохиоллын удирдлага', path: '/alarmsys' },
      { key: 'Lighting', label: 'Гэрэлтүүлэг', path: '/lighting' },
      { key: 'PumpDrainage', label: 'Ус шавхах насос', path: '/pumpdrainage' },
      { key: 'PumpBooster', label: 'Ус шахах насос', path: '/pumpbooster' },
      { key: 'Ventilation', label: 'Агааржуулалт', path: '/ventilation' },
      { key: 'BackupGen', label: 'Нөөцийн генератор', path: '/backupgen' },
      { key: 'AirCond', label: 'AirCond', path: '/aircond' },
    ],
  },
  {
    title: 'ДОТООД ҮЙЛ АЖИЛЛАГАА',
    groupKey: 'HOAMANAGER',
    items: [
      { key: 'HRM', label: 'Хүний нөөцийн удирдлага', path: '/hrm' },
      { key: 'T&A', label: 'Цаг бүртгэл', path: '/ta' },
      { key: 'Repairs', label: 'Засвар үйлчилгээ', path: '/repairs' },
      { key: 'Maintenances', label: 'Тохижилт үйлчилгээ', path: '/maintenances' },
      { key: 'Sanitations', label: 'Цэвэрлэгээ үйлчилгээ', path: '/sanitations' },
      { key: 'Performance', label: 'Гүйцэтгэл', path: '/performance' },
      { key: 'Providers', label: 'Харилцагчийн бүртгэл', path: '/providers' },
    ],
  },
  {
    title: 'САНХҮҮ',
    groupKey: 'HOATREASURER',
    items: [
      { key: 'Accounting', label: 'Нягтлан бодох бүртгэл', path: '/accounting' },
      { key: 'RepFintax', label: 'Санхүү, татварын тайлан', path: '/repfintax' },
      { key: 'RepInner', label: 'Дотоод тайлан', path: '/repinner' },
      { key: 'PayrollAcc', label: 'Цалин бодолт', path: '/payrollacc' },
      { key: 'Invoice', label: 'Нэхэмжлэх', path: '/invoice' },
      { key: 'Transactions', label: 'Харилцахын гүйлгээ', path: '/transactions' },
    ],
  },
  {
    title: 'УДИРДАХ ЗөВЛөЛ ПОРТАЛ',
    groupKey: 'HOABOARD',
    items: [
      { key: 'FixedAssets', label: 'Үндсэн хөрөнгө бүртгэл', path: '/fixedassets' },
      { key: 'Voting', label: 'Сонгууль, санал асуулга', path: '/voting' },
      { key: 'Planing', label: 'Төлөвлөгөө', path: '/planing' },
      { key: 'RepBoard', label: 'Тайлан', path: '/repboard' },
    ],
  },
  {
    title: 'СИСАДМИН',
    groupKey: 'SYSADMIN',
    items: [
      { key: 'RolesRules', label: 'Хандах эрхийн тохиргоо', path: '/rolesrules' },
      { key: 'Accounts', label: 'Хэрэглэгчийн удирдлага', path: '/accounts' },
      { key: 'UAppConfig', label: 'UserApp тохиргоо', path: '/uappconfig' },
      { key: 'CosmoRules', label: 'Cosmo rules', path: '/cosmorules' },
      { key: 'HoaConfig', label: 'СөХ тохиргоо', path: '/hoaconfig' },
      { key: 'Addressing', label: 'Хаягжилт тохиргоо', path: '/addressing' },
      { key: 'AccConfig', label: 'НББ тохиргоо', path: '/accconfig' },
      { key: 'PaymentConfig', label: 'Тариф тохиргоо', path: '/paymentconfig' },
      { key: 'FixedAssConfig', label: 'Үндсэн хөрөнгө тохиргоо', path: '/fixedassconfig' },
      { key: 'REstMarket', label: 'Real Estate market', path: '/restmarket' },
      { key: 'Logs', label: 'Logs', path: '/logs' },
    ],
  },
];

// SUPERSYSADMIN (INTEGRATED SYSTEMS) — платформын дээд түвшний админ,
// tenant-level СИСАДМИН-аас тусад нь, sidebar-ийн доод хэсэгт тусдаа
// харагдана (7 бүлгийн жагсаалтад БИШ).
export const SUPERSYSADMIN = { key: 'SuperSysAdmin', label: 'SUPERSYSADMIN', path: '/supersysadmin' };

// SUPERSYSADMIN-ийн СөХ-специфик SaaS удирдлагын дэд цэс — HoaSwitcher-ээс
// тодорхой СөХ сонгосон үед л харагдана (2026-08-13 хэрэглэгчтэй хийсэн
// ярианаас: Integrated Systems→hoa1 чиглэлийн төлбөр/эрх/багц, hoa1-ийн
// өөрийн оршин суугчид руу чиглэсэн PaymentConfig-тай АНДУУРАХГҮЙ).
// Нэрс зориудаар англиар — Монгол орчуулгаар ойлголтын зөрүү гарахгүйн тулд.
export const SUPERSYSADMIN_TENANT_ITEMS = [
  { key: 'Billing', label: 'Billing', path: '/billing' },
  { key: 'Renewal', label: 'Renewal', path: '/renewal' },
  { key: 'Plan', label: 'Plan', path: '/plan' },
  { key: 'Usage', label: 'Usage', path: '/usage' },
  { key: 'TenantStatus', label: 'Tenant Status', path: '/tenant-status' },
  { key: 'Contract', label: 'Contract', path: '/contract' },
  { key: 'Support', label: 'Support', path: '/support' },
];

export const SIDEBAR_STATS = [
  { label: 'suh', value: null },
  { label: '16 байр · 18 орц', value: null },
  { label: 'Оршин суугч', value: 65 },
  { label: 'Хүүхэд 0-5 нас', value: 13 },
  { label: 'Хүүхэд 6-18 нас', value: 16 },
  { label: 'Агуулах', value: 7 },
  { label: 'Зогсоол', value: 9 },
  { label: 'Бүртгэлтэй машин', value: 4 },
  { label: 'Аж ахуйн нэгж', value: 38 },
  { label: 'Харилцагч байгууллага', value: 24 },
];
