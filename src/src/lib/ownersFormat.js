// Owners.jsx-ийн хүснэгэл БОЛОН Инфо модаль хоёуланд ижилхэн ашиглагддаг
// формат хийх туслах функцүүд. summarizeSpots/summarizeVehicles нь ерүнхий
// (Clientele.jsx-д ч ашиглагддаг) тул spotVehicleFormat.js-ээс дахин
// экспортолно (Rule of two, 2026-08-16).

export { summarizeSpots, summarizeVehicles } from './spotVehicleFormat';

// 2026-08-19 хэрэглэгчийн тодорхой заасан дүрэм: Байр-Давхар-Тоот
// (structure_type='floor') үед ДАВХАР 2 оронтой + ТООТ 2 оронтой.
// Байр-Орц-Тоот (structure_type='entrance') үед ОРЦ 2 оронтой + ТООТ
// 3 оронтой — учир нь тоот нь 1-р орцны 1-р давхрын зүүн эхний
// хаалганаас сүүлчийн орцны дээд давхрын баруун сүүлчийн хаалга хүртэл
// БүХ БАЙРААР дараалж тоологддог тул илүү их орон зай шаардана.
export function formatStructureValue(value) {
  if (value == null) return '—';
  return String(value).padStart(2, '0');
}

export function formatDoorNo(doorNo, structureType) {
  if (doorNo == null) return '—';
  const width = structureType === 'entrance' ? 3 : 2;
  return String(doorNo).padStart(width, '0');
}

// Байр+Давхар/Орц+Тоот-ыг НЭГ кодонд нийлүүлнэ (EditOwnerModal-ийн
// Тоот dropdown, Property.jsx-ийн UnitGridCard, OwnerInfoModal-д ижил
// ашиглагдана — Rule of two). 2026-08-19 хэрэглэгчийн тодорхой заасан
// зааглалт: Байр-Давхар-Тоот = "[Байр] [Давхар2+Тоот2 залгаа]" (space-
// ээр зааглана, давхар+тоот хоорондоо залгаастай); Байр-Орц-Тоот =
// "[Байр]-[Орц2]-[Тоот3]" (зураасаар зааглана). buildingNo-г raw
// орж ирсэн ч гэсэн (жиш нь DB-д санамсаргүй trailing space орсон ч)
// эхлээд trim хийж, зөвхөн ЭНЭ функц дотор зориудаар нэмсэн space/
// зураасанд найдна — санамсаргүй өгөгдлийн зайд бүү найд.
export function formatUnitCode(buildingNo, structureType, floor, entranceNo, doorNo) {
  const b = String(buildingNo ?? '').trim();
  if (structureType === 'entrance') {
    const e = String(entranceNo ?? 0).padStart(2, '0');
    const d = String(doorNo ?? 0).padStart(3, '0');
    return `${b}-${e}-${d}`;
  }
  const f = String(floor ?? 0).padStart(2, '0');
  const d = String(doorNo ?? 0).padStart(2, '0');
  return `${b} ${f}${d}`;
}

// 2026-08-28: OwnerApp-ийн header greeting мврт зориулсан ӨРГӨН (үг
// оруулсан) хэлбэр — Хаягжилт тохиргооны хоёр горимд яг таарсан
// хэрэглэгчийн заасан жишээгээр: Байр+Давхар+Тоот үед "58/4 байрны
// 0703 тоот", Байр+Орц+Тоот үед "19-р байр 3 орц 24 тоот".
export function formatUnitLabel(buildingNo, structureType, floor, entranceNo, doorNo) {
  const b = String(buildingNo ?? '').trim();
  if (structureType === 'entrance') {
    return `${b}-р байр ${entranceNo ?? '—'} орц ${doorNo ?? '—'} тоот`;
  }
  const f = formatStructureValue(floor);
  const d = formatDoorNo(doorNo, structureType);
  return `${b} байрны ${f}${d} тоот`;
}
