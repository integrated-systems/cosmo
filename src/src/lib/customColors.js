// 2026-09-24: tailwind.config.js-ийн `customXxx` eнгe бүртэй ЯГ ИЖИЛ
// hex код агуулсан НЭГДСЭН жагсаалт. Хэрэглэгчийн tailwind.config.js
// дотор нэмсэн 10 custom eнгийг БҮГДИЙГ нь эндээс (FinConfig.jsx-ийн
// "Төлбөрийн хоцрогдол" сонгогч, Property.jsx-ийн слотын хүрээний
// hex утга) уншина — НЭГ л газар (энд БОЛОН tailwind.config.js) хэрэв
// шинэ custom eнгe нэмвэл хоёуланд нь нэмэх шаардлагатай.
export const CUSTOM_COLORS = [
  { key: 'customYellow', hex: '#f8f23d', label: 'Шар' },
  { key: 'customOrange', hex: '#f59e0b', label: 'Улбар шар' },
  { key: 'customRed', hex: '#ef5555', label: 'Улаан' },
  { key: 'customPink', hex: '#ec4899', label: 'Ягаан' },
  { key: 'customPurple', hex: '#8b5cf6', label: 'Нил ягаан' },
  { key: 'customIndigo', hex: '#0a428f', label: 'Индиго' },
  { key: 'customBlue', hex: '#3b82f6', label: 'Хөх' },
  { key: 'customSkyBlue', hex: '#cbeeff', label: 'Тэнгэрийн хөх' },
  { key: 'customGreen', hex: '#10b981', label: 'Ногоон' },
  { key: 'customBlack', hex: '#1c1e1f', label: 'Хар' },
];

export function customColorHex(key) {
  const c = CUSTOM_COLORS.find((x) => x.key === key);
  return c ? c.hex : null;
}

export function customColorLabel(key) {
  const c = CUSTOM_COLORS.find((x) => x.key === key);
  return c ? c.label : key;
}
