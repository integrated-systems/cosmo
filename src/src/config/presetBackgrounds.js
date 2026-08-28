// 2026-08-28: Хэрэглэгчийн өгсөн 6 зураг (iOS-27 маягийн торго долгион)
// — OwnerApp-д БАГТААСАН, зөвхөн эдгээрээс сонгодог дэвсгэр зурагнууд.
// Гаднаас зураг импортлох боломжийг ЗОРИУДААР хаасан (хэрэглэгчийн
// 2026-08-28 хүсэлт: "байршуулах, хадгалах асуудал үүсдэг... апп маань
// учир утгагүй олон зурагт дизайнаар үнэтэй ялгарлаа алдана").
export const PRESET_BACKGROUNDS = [
  { id: 'wave-red', label: 'Улаан', file: 'wave-red.jpg' },
  { id: 'wave-blue', label: 'Цэнхэр', file: 'wave-blue.jpg' },
  { id: 'wave-navy', label: 'Хүрэн хар', file: 'wave-navy.jpg' },
  { id: 'wave-beige', label: 'Бор', file: 'wave-beige.jpg' },
  { id: 'wave-mauve', label: 'Ягаан', file: 'wave-mauve.jpg' },
  { id: 'wave-green', label: 'Ногоон', file: 'wave-green.jpg' },
];

export function presetBackgroundUrl(id) {
  const p = PRESET_BACKGROUNDS.find((b) => b.id === id);
  return p ? `/cosmo/backgrounds/${p.file}` : null;
}
