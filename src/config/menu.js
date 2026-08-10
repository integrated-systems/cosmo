// projectcosmo.html-ийн sidebar-menu (мөр ~54-92) — 3 бүлэг цэс.
// Шинэ хуудас нэмэхэд ЗөВХӨН эндээс нэмнэ, Sidebar.jsx-д шууд бичихгүй
// (өмнөх төсөлд "Renames/шинэ модуль нэмэхэд олон газар зэрэг шинэчлэх
// ёстой" гэсэн зөрчилтэй тулгарч байсан тул нэг эх сурвалж болгов).
export const MENU_SECTIONS = [
  {
    title: 'ҮНДСЭН',
    items: [
      { key: 'dashboard', label: 'Хянах самбар', path: '/dashboard' },
      { key: 'residents', label: 'Сууц өмчлөгчийн бүртгэл', path: '/residents' },
      { key: 'business', label: 'Аж ахуйн нэгж бүртгэл', path: '/business' },
      { key: 'clients', label: 'Харилцагчийн бүртгэл', path: '/clients' },
      { key: 'assets', label: 'Үндсэн хөрөнгө бүртгэл', path: '/assets' },
      { key: 'employees', label: 'Ажилтны бүртгэл', path: '/employees' },
      { key: 'polls', label: 'Сонгууль, санал асуулга', path: '/polls' },
      { key: 'payments', label: 'Төлбөр төлөлт', path: '/payments', badge: 64 },
      { key: 'realestate', label: 'Тоот, зогсоол, агуулах', path: '/realestate' },
      { key: 'notifications', label: 'Зар, мэдэгдэл', path: '/notifications' },
      { key: 'cccenter', label: 'CC center', path: '/cccenter' },
      { key: 'boomgate', label: 'Хаалтны удирдлага', path: '/boomgate' },
      { key: 'news', label: 'Мэдээ, мэдээлэл', path: '/news' },
      { key: 'aggregate', label: 'Мэдээний агрегат', path: '/aggregate' },
    ],
  },
  {
    title: 'ТАЙЛАН, САНХҮҮ',
    items: [
      { key: 'accounting', label: 'Нягтлан бодох бүртгэл', path: '/accounting' },
      { key: 'internal', label: 'СӨХ дотоод тайлан', path: '/internal' },
      { key: 'fintax', label: 'Санхүү, татварын тайлан', path: '/fintax' },
      { key: 'transactions', label: 'Гүйлгээний бүртгэл', path: '/transactions' },
    ],
  },
  {
    title: 'АДМИН',
    items: [
      { key: 'setting-hoa', label: 'СӨХ тохиргоо', path: '/setting-hoa' },
      { key: 'setting-modeling', label: 'Хаягжилт тохиргоо', path: '/setting-modeling' },
      { key: 'setting-payments', label: 'Тариф тохиргоо', path: '/setting-payments' },
      { key: 'setting-accounting', label: 'НӨБ тохиргоо', path: '/setting-accounting' },
      { key: 'setting-assets', label: 'Үндсэн хөрөнгө тохиргоо', path: '/setting-assets' },
      { key: 'setting-trends', label: 'Зээл зээлийн үлдэгдэл', path: '/setting-trends' },
      { key: 'setting-permissions', label: 'Хандах эрхийн тохиргоо', path: '/setting-permissions' },
      { key: 'setting-users', label: 'Хэрэглэгч удирдлага', path: '/setting-users' },
      { key: 'setting-userapp', label: 'UserApp тохиргоо', path: '/setting-userapp' },
      { key: 'setting-dev', label: 'AI Integration Plan', path: '/setting-dev' },
      { key: 'setting-cosmo', label: 'Cosmo тохиргоо', path: '/setting-cosmo' },
      { key: 'setting-log', label: 'Лог файл', path: '/setting-log' },
    ],
  },
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
