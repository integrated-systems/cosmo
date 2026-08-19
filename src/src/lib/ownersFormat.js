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
// ашиглагдана — Rule of two).
export function formatUnitCode(buildingNo, structureType, floor, entranceNo, doorNo) {
  const doorWidth = structureType === 'entrance' ? 3 : 2;
  const structVal = structureType === 'entrance' ? entranceNo : floor;
  const s = String(structVal ?? 0).padStart(2, '0');
  const d = String(doorNo ?? 0).padStart(doorWidth, '0');
  return `${buildingNo}${s}${d}`;
}
