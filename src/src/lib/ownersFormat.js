// Owners.jsx-ийн хүснэгэл БОЛОН Инфо модаль хоёуланд ижилхэн ашиглагддаг
// формат хийх туслах функцүүд. summarizeSpots/summarizeVehicles нь ерүнхий
// (Clientele.jsx-д ч ашиглагддаг) тул spotVehicleFormat.js-ээс дахин
// экспортолно (Rule of two, 2026-08-16).

export { summarizeSpots, summarizeVehicles } from './spotVehicleFormat';

// 2026-08-19 хэрэглэгчийн тодорхой заасан дvрэм: Байр-Давхар-Тоот
// (structure_type='floor') vед ДАВХАР 2 оронтой + ТООТ 2 оронтой.
// Байр-Орц-Тоот (structure_type='entrance') vед ОРЦ 2 оронтой + ТООТ
// 3 оронтой — учир нь тоот нь 1-р орцны 1-р давхрын зvvн эхний
// хаалганаас сvvлчийн орцны дээд давхрын баруун сvvлчийн хаалга хvртэл
// БvХ БАЙРААР дараалж тоологддог тул илvv их орон зай шаардана.
export function formatStructureValue(value) {
  if (value == null) return '—';
  return String(value).padStart(2, '0');
}

export function formatDoorNo(doorNo, structureType) {
  if (doorNo == null) return '—';
  const width = structureType === 'entrance' ? 3 : 2;
  return String(doorNo).padStart(width, '0');
}

// Байр+Давхар/Орц+Тоот-ыг НЭГ кодонд нийлvvлнэ (EditOwnerModal-ийн
// Тоот dropdown, Property.jsx-ийн UnitGridCard, OwnerInfoModal-д ижил
// ашиглагдана — Rule of two). 2026-08-19 хэрэглэгчийн тодорхой заасан
// зааглалт: Байр-Давхар-Тоот = "[Байр] [Давхар2+Тоот2 залгаа]" (space-
// ээр зааглана, давхар+тоот хоорондоо залгаастай); Байр-Орц-Тоот =
// "[Байр]-[Орц2]-[Тоот3]" (зураасаар зааглана). buildingNo-г raw
// орж ирсэн ч гэсэн (жиш нь DB-д санамсаргvй trailing space орсон ч)
// эхлээд trim хийж, зөвхөн ЭНЭ функц дотор зориудаар нэмсэн space/
// зураасанд найдна — санамсаргvй өгөгдлийн зайд бvv найд.
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
